"""Opt-in TinyFish and NVIDIA provider adapters.

The adapters are deliberately isolated from FastAPI routes and persistence.
They are not selected unless SEARCH_PROVIDER=real is configured.
"""

import json
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any

import httpx
from pydantic import BaseModel, Field, HttpUrl, ValidationError

from app.config import settings
from app.schemas import CandidateEvidence, CandidateOffer, CandidateResponse, SearchCreateRequest
from app.db.models import SearchStage
from app.services.provider_contracts import (
    DiscoveredSource,
    FetchedDocument,
    PageFetcher,
    ProviderError,
    SearchProvider,
    StructuredExtractor,
    StageCallback,
)
from app.services.normalization import normalize_specifications, normalize_value


class ExtractedEvidence(BaseModel):
    """Evidence shape returned by the model before backend traceability is added."""

    field: str
    quote: str
    source_url: HttpUrl
    confidence: float = Field(ge=0.0, le=1.0)


class ExtractedCandidate(BaseModel):
    part_number: str = Field(min_length=1)
    manufacturer: str = Field(min_length=1)
    specifications: dict[str, Any] = Field(default_factory=dict)
    evidence: list[ExtractedEvidence] = Field(default_factory=list)
    offers: list[dict[str, Any]] = Field(default_factory=list)


def _request_timeout() -> httpx.Timeout:
    return httpx.Timeout(connect=10.0, read=90.0, write=30.0, pool=10.0)


class TinyFishDiscoveryProvider:
    def __init__(self) -> None:
        if not settings.tinyfish_api_key:
            raise ProviderError("TINYFISH_API_KEY is required for real search provider")

    def discover(self, request: SearchCreateRequest, search_id: str) -> list[DiscoveredSource]:
        requirements = " ".join(
            str(value)
            for value in request.requirements.model_dump().values()
            if value is not None
        )
        query = (
            f'"{request.original_part_number}" replacement {request.part_name} '
            f'{request.manufacturer or ""} {requirements}'
        ).strip()

        try:
            with httpx.Client(timeout=_request_timeout()) as client:
                response = client.get(
                    settings.tinyfish_search_url,
                    params={"query": query, "location": "US", "language": "en"},
                    headers={"X-API-Key": settings.tinyfish_api_key},
                )
                response.raise_for_status()
                payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise ProviderError(f"TinyFish discovery failed: {exc}") from exc

        if not isinstance(payload, dict):
            raise ProviderError("TinyFish discovery returned a non-object response")
        results = payload.get("results", [])
        if not isinstance(results, list):
            raise ProviderError("TinyFish discovery returned an invalid results field")

        sources: list[DiscoveredSource] = []
        seen: set[str] = set()
        for item in results:
            if not isinstance(item, dict):
                continue
            url = item.get("url")
            if not isinstance(url, str) or not url.startswith(("http://", "https://")) or url in seen:
                continue
            seen.add(url)
            sources.append(
                DiscoveredSource(
                    url=url,
                    source_type="web_search_result",
                    manufacturer=request.manufacturer,
                    part_number=request.original_part_number,
                    discovery_reason=item.get("snippet", "")[:500],
                )
            )

        if not sources:
            raise ProviderError("TinyFish discovery returned no usable sources")
        return sources[:10]


class TinyFishPageFetcher(PageFetcher):
    def __init__(self) -> None:
        if not settings.tinyfish_api_key:
            raise ProviderError("TINYFISH_API_KEY is required for real search provider")

    def fetch(self, source: DiscoveredSource, search_id: str) -> FetchedDocument:
        try:
            with httpx.Client(timeout=_request_timeout()) as client:
                response = client.post(
                    settings.tinyfish_fetch_url,
                    headers={
                        "X-API-Key": settings.tinyfish_api_key,
                        "Content-Type": "application/json",
                    },
                    json={"urls": [source.url], "format": "markdown"},
                )
                response.raise_for_status()
                payload = response.json()
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            raise ProviderError(f"TinyFish page fetch failed for {source.url}: {exc}") from exc

        if not isinstance(payload, dict):
            raise ProviderError(f"TinyFish returned a non-object response for {source.url}")
        results = payload.get("results", [])
        if not isinstance(results, list):
            raise ProviderError(f"TinyFish returned an invalid results field for {source.url}")
        result = next(
            (
                item
                for item in results
                if isinstance(item, dict) and isinstance(item.get("text"), str) and item.get("text")
            ),
            None,
        )
        if not result:
            errors = payload.get("errors", [])
            error = (
                next(
                    (item.get("error") for item in errors if isinstance(item, dict) and item.get("error")),
                    "empty page",
                )
                if isinstance(errors, list)
                else "empty page"
            )
            raise ProviderError(f"TinyFish returned no content for {source.url}: {error}")

        content = result["text"]
        normalized_content = " ".join(content.lower().split())
        blocked_markers = (
            "couldn't load",
            "couldn’t load",
            "access denied",
            "verify you are human",
            "captcha",
            "bot_blocked",
            "target_unreachable",
        )
        if len(content.strip()) < 200 or any(marker in normalized_content for marker in blocked_markers):
            raise ProviderError(f"TinyFish returned unusable or blocked content for {source.url}")

        return FetchedDocument(
            source=source,
            title=result.get("title", source.url),
            content=content,
            retrieved_at=datetime.now(timezone.utc),
        )


class NvidiaStructuredExtractor(StructuredExtractor):
    def __init__(self) -> None:
        if not settings.nvidia_api_key:
            raise ProviderError("NVIDIA_API_KEY is required for real search provider")
        if not settings.nvidia_model:
            raise ProviderError("NVIDIA_MODEL is required for real search provider")

    def extract(
        self,
        request: SearchCreateRequest,
        document: FetchedDocument,
        search_id: str,
    ) -> CandidateResponse:
        schema_instruction = {
            "part_number": "string",
            "manufacturer": "string",
            "specifications": "object with technical field/value pairs",
            "evidence": [
                {
                    "field": "string",
                    "quote": "exact quote from the supplied document",
                    "source_url": document.source.url,
                    "confidence": "number from 0 to 1",
                }
            ],
            "offers": [
                {
                    "supplier_name": "string",
                    "supplier_domain": "string",
                    "supplier_type": "string",
                    "location": "string",
                    "reported_price": "number or null",
                    "currency": "string or null",
                    "stock_status": "string or null",
                    "quantity_available": "integer or null",
                    "lead_time_days": "integer or null",
                    "min_order_quantity": "integer or null",
                    "source_url": "absolute URL",
                    "product_url": "absolute product URL or null",
                    "datasheet_url": "absolute datasheet URL or null",
                    "contact_phone": "string or null",
                    "contact_email": "string or null",
                    "evidence_quote": "exact quote supporting the offer fields",
                    "confidence": "number from 0 to 1",
                    "notes": "string or null",
                }
            ],
        }
        prompt = (
            "Extract one industrial replacement part from the supplied document. "
            "Return JSON only. Do not invent missing values or compatibility scores. "
            "Use the exact requirement field names in the specifications object when "
            "the document provides those values, and use those same exact names in "
            "the evidence field. Omit fields that are not supported by the document. "
            f"Requested part: {request.part_name}; original number: {request.original_part_number}; "
            f"requirements: {request.requirements.model_dump()}; schema: {json.dumps(schema_instruction)}\n\n"
            f"SOURCE URL: {document.source.url}\nDOCUMENT:\n{document.content[:60000]}"
        )

        try:
            with httpx.Client(timeout=_request_timeout()) as client:
                response = client.post(
                    f"{settings.nvidia_base_url.rstrip('/')}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.nvidia_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.nvidia_model,
                        "temperature": 0,
                        "messages": [
                            {"role": "system", "content": "You extract verified technical data."},
                            {"role": "user", "content": prompt},
                        ],
                        "response_format": {"type": "json_object"},
                    },
                )
                response.raise_for_status()
                payload = response.json()
                content = payload["choices"][0]["message"]["content"]
                extracted = ExtractedCandidate.model_validate(json.loads(content))
        except (httpx.HTTPError, KeyError, TypeError, ValueError, ValidationError) as exc:
            raise ProviderError(f"NVIDIA structured extraction failed: {exc}") from exc

        evidence_candidates = [
            CandidateEvidence(
                field=item.field,
                quote=item.quote,
                source_url=item.source_url,
                confidence=item.confidence,
                retrieved_at=document.retrieved_at,
            )
            for item in extracted.evidence
        ]
        evidence = EvidenceValidator().validate(evidence_candidates, document.content, document.source.url)
        return CandidateResponse(
            id=f"{search_id}-candidate-raw",
            part_number=extracted.part_number,
            manufacturer=extracted.manufacturer,
            compatibility="unknown",
            score=0,
            # Keep display/raw values intact; matching uses the shared normalized view.
            specifications=extracted.specifications,
            evidence=evidence,
            offers=self._validated_offers(extracted.offers, document),
        )

    def _validated_offers(self, raw_offers: list[dict[str, Any]], document: FetchedDocument) -> list[CandidateOffer]:
        """Keep only identifiable offers tied to the fetched source page.

        Incomplete listings are intentionally omitted from the procurement
        table; they remain visible through the source evidence instead of
        being rendered as fabricated prices or inventory.
        """
        valid: list[CandidateOffer] = []
        for raw in raw_offers:
            try:
                if not isinstance(raw, dict):
                    continue
                if not raw.get("supplier_name") or not raw.get("source_url"):
                    continue
                if raw.get("reported_price") is None and raw.get("stock_status") is None:
                    continue
                if not raw.get("evidence_quote") or raw.get("confidence") is None:
                    continue
                supplier_key = f"{raw['supplier_name']}|{raw.get('supplier_domain', '')}".lower().encode()
                normalized_offer = dict(raw)
                normalized_offer["supplier_id"] = f"supp-{hashlib.sha1(supplier_key).hexdigest()[:16]}"
                normalized_offer["source_url"] = raw["source_url"]
                normalized_offer["last_checked"] = document.retrieved_at
                offer = CandidateOffer(
                    **normalized_offer,
                )
                if str(offer.source_url).rstrip("/") != document.source.url.rstrip("/"):
                    continue
                valid.append(offer)
            except (TypeError, ValueError, ValidationError):
                continue
        return valid


class DeterministicNormalizer:
    def normalize(self, specifications: dict[str, Any]) -> dict[str, Any]:
        return normalize_specifications(specifications)


class EvidenceValidator:
    def validate(
        self,
        evidence: list[CandidateEvidence],
        content: str,
        source_url: str,
    ) -> list[CandidateEvidence]:
        normalized_content = " ".join(content.lower().split())
        valid: list[CandidateEvidence] = []
        for item in evidence:
            if str(item.source_url).rstrip("/") != source_url.rstrip("/"):
                continue
            if not item.retrieved_at:
                continue
            if item.confidence < 0 or item.confidence > 1:
                continue
            if item.quote.strip().lower() not in normalized_content:
                continue
            valid.append(item)
        return valid


class DeterministicMatcher:
    def match(
        self,
        request: SearchCreateRequest,
        candidate: CandidateResponse,
        search_id: str,
        index: int,
    ) -> CandidateResponse:
        requested = request.requirements.model_dump(exclude_none=True)
        if not requested:
            return candidate.model_copy(update={"id": f"{search_id}-candidate-{index}"})

        matches = 0
        conflicts = 0
        evidence_fields = {item.field for item in candidate.evidence}
        for key, expected in requested.items():
            actual = candidate.specifications.get(key)
            if actual is None:
                continue
            # A value without field-level evidence is not a verified match.
            # It remains available for display, but cannot make a candidate
            # compatible with a requested requirement.
            if key not in evidence_fields:
                continue
            if self._same_value(expected, actual):
                matches += 1
            else:
                conflicts += 1

        total = len(requested)
        score = round(matches / total * 100)
        compatibility = "unknown"
        if conflicts:
            compatibility = "incompatible"
        elif matches == total:
            compatibility = "compatible"
        elif matches:
            compatibility = "partial"

        return candidate.model_copy(
            update={
                "id": f"{search_id}-candidate-{index}",
                "compatibility": compatibility,
                "score": score,
            }
        )

    def _same_value(self, expected: Any, actual: Any) -> bool:
        if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
            return float(expected) == float(actual)
        left = normalize_value(expected)
        right = normalize_value(actual)
        return left == right


class RealSearchProvider(SearchProvider):
    # A search result can be blocked or irrelevant. Use a small bounded set and
    # process it concurrently so one bad source does not fail the search or
    # consume the entire service deadline.
    MAX_SOURCES_PER_SEARCH = 5

    def __init__(self) -> None:
        self.discovery = TinyFishDiscoveryProvider()
        self.fetcher = TinyFishPageFetcher()
        self.extractor = NvidiaStructuredExtractor()
        self.matcher = DeterministicMatcher()

    def discover_candidates(self, request: SearchCreateRequest, search_id: str, stage_callback: StageCallback | None = None) -> list[CandidateResponse]:
        if stage_callback:
            stage_callback(SearchStage.SOURCE_DISCOVERY)
        sources = self.discovery.discover(request, search_id)[: self.MAX_SOURCES_PER_SEARCH]
        if stage_callback:
            stage_callback(SearchStage.PAGE_RETRIEVAL)
        candidates: list[CandidateResponse] = []
        source_failures: list[str] = []
        def process(index: int, source: DiscoveredSource) -> CandidateResponse:
            document = self.fetcher.fetch(source, search_id)
            if stage_callback:
                stage_callback(SearchStage.ATTRIBUTE_EXTRACTION)
            extracted = self.extractor.extract(request, document, search_id)
            if stage_callback:
                stage_callback(SearchStage.NORMALIZATION)
            requested_fields = set(request.requirements.model_dump(exclude_none=True))
            if requested_fields:
                supported_fields = {
                    item.field for item in extracted.evidence
                }.intersection(extracted.specifications).intersection(requested_fields)
                if not supported_fields:
                    raise ProviderError(
                        f"source did not provide an evidenced requested specification: {source.url}"
                    )
            matched = self.matcher.match(request, extracted, search_id, index)
            if stage_callback:
                stage_callback(SearchStage.VALIDATION)
            return matched

        with ThreadPoolExecutor(max_workers=min(len(sources), self.MAX_SOURCES_PER_SEARCH) or 1) as executor:
            futures = {executor.submit(process, index, source): source for index, source in enumerate(sources, start=1)}
            for future in as_completed(futures):
                source = futures[future]
                try:
                    candidates.append(future.result())
                except (ProviderError, httpx.HTTPError, ValueError, TypeError, ValidationError) as exc:
                    # A single manufacturer page can be bot-blocked or malformed.
                    # Continue with other discovered sources; fail only when the
                    # whole search produced no usable candidates.
                    source_failures.append(f"{source.url}: {exc}")
        if not candidates:
            detail = "; ".join(source_failures[:3])
            suffix = f"; source failures: {detail}" if detail else ""
            raise ProviderError(f"Real provider pipeline returned no candidates{suffix}")
        if stage_callback:
            stage_callback(SearchStage.EVIDENCE_COMPILATION)
        return sorted(candidates, key=lambda candidate: candidate.score, reverse=True)
