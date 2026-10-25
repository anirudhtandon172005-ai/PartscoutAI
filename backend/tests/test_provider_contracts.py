from datetime import datetime, timezone

import httpx
import pytest

from app.schemas import CandidateResponse, RequirementSpec, SearchCreateRequest
from app.services.provider_contracts import (
    DiscoveredSource,
    FetchedDocument,
    ProviderError,
    SearchProvider,
)
from app.services import real_providers
from app.services.real_providers import DeterministicMatcher, RealSearchProvider, TinyFishDiscoveryProvider, TinyFishPageFetcher
from app.services.search_service import MockSearchProvider
from app.config import settings


def make_request() -> SearchCreateRequest:
    return SearchCreateRequest(
        machine_name="Apex PackWorks Line 4",
        part_name="M18 Inductive Proximity Sensor",
        original_part_number="BES 516-325-G-E5-C-S4",
        manufacturer="Balluff",
        quantity=2,
        requirements=RequirementSpec(
            mounting="flush",
            output="PNP normally open",
            sensing_range_mm=8,
            connector="M12 4-pin",
        ),
    )


def test_fixture_provider_satisfies_high_level_contract() -> None:
    provider: SearchProvider = MockSearchProvider()

    candidates = provider.discover_candidates(make_request(), "search-contract")

    assert len(candidates) == 3
    assert [candidate.score for candidate in candidates] == [100, 100, 100]
    assert all(candidate.evidence for candidate in candidates)


def test_fixture_provider_reports_all_lifecycle_stages() -> None:
    stages: list[str] = []
    MockSearchProvider().discover_candidates(make_request(), "search-stages", stages.append)

    assert stages == [
        "source_discovery",
        "page_retrieval",
        "attribute_extraction",
        "normalization",
        "validation",
        "evidence_compilation",
    ]


def test_source_and_document_contracts_preserve_traceability() -> None:
    source = DiscoveredSource(
        url="https://www.ifm.com/product/IGT205",
        source_type="manufacturer_product_page",
        manufacturer="ifm",
        part_number="IGT205",
        discovery_reason="fixture contract test",
    )
    document = FetchedDocument(
        source=source,
        title="IGT205 Inductive Sensor",
        content="Sensing range: 8 mm",
        retrieved_at=datetime.now(timezone.utc),
    )

    assert document.source.url == source.url
    assert document.status == "success"
    assert "8 mm" in document.content


def test_real_provider_skips_blocked_source_and_keeps_usable_candidate() -> None:
    first = DiscoveredSource(url="https://blocked.example/part", source_type="test")
    second = DiscoveredSource(url="https://usable.example/part", source_type="test")

    class Discovery:
        def discover(self, request, search_id):
            return [first, second]

    class Fetcher:
        def fetch(self, source, search_id):
            if source == first:
                raise ProviderError("bot_blocked")
            return FetchedDocument(
                source=source,
                title="usable",
                content="usable content",
                retrieved_at=datetime.now(timezone.utc),
            )

    class Extractor:
        def extract(self, request, document, search_id):
            return CandidateResponse(
                id="raw",
                part_number="TEST-123",
                manufacturer="Test Manufacturer",
                compatibility="unknown",
                score=0,
                specifications={"sensing_range_mm": 8},
                evidence=[
                    {
                        "field": "sensing_range_mm",
                        "quote": "Sensing range: 8 mm",
                        "source_url": document.source.url,
                        "confidence": 0.9,
                        "retrieved_at": datetime.now(timezone.utc),
                    }
                ],
            )

    provider = RealSearchProvider.__new__(RealSearchProvider)
    provider.discovery = Discovery()
    provider.fetcher = Fetcher()
    provider.extractor = Extractor()
    provider.matcher = DeterministicMatcher()
    provider.MAX_SOURCES_PER_SEARCH = 2

    candidates = provider.discover_candidates(make_request(), "search-contract")

    assert len(candidates) == 1
    assert candidates[0].part_number == "TEST-123"


def test_real_provider_fails_when_all_sources_are_unusable() -> None:
    class Discovery:
        def discover(self, request, search_id):
            return [DiscoveredSource(url="https://blocked.example/part", source_type="test")]

    class Fetcher:
        def fetch(self, source, search_id):
            raise ProviderError("bot_blocked")

    provider = RealSearchProvider.__new__(RealSearchProvider)
    provider.discovery = Discovery()
    provider.fetcher = Fetcher()
    provider.extractor = object()
    provider.matcher = object()

    with pytest.raises(ProviderError, match="no candidates"):
        provider.discover_candidates(make_request(), "search-contract")


class FakeResponse:
    def __init__(self, payload, status_code: int = 200):
        self.payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            request = httpx.Request("GET", "https://provider.test")
            response = httpx.Response(self.status_code, request=request)
            raise httpx.HTTPStatusError("provider error", request=request, response=response)

    def json(self):
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


class FakeClient:
    def __init__(self, response: FakeResponse):
        self.response = response

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def get(self, *args, **kwargs):
        return self.response

    def post(self, *args, **kwargs):
        return self.response


def patch_provider_client(monkeypatch, response: FakeResponse) -> None:
    monkeypatch.setattr(real_providers.httpx, "Client", lambda **kwargs: FakeClient(response))
    monkeypatch.setattr(settings, "tinyfish_api_key", "test-key")


def test_tinyfish_discovery_accepts_only_usable_result_urls(monkeypatch) -> None:
    patch_provider_client(monkeypatch, FakeResponse({"results": [
        {"url": "https://supplier.test/part", "snippet": "part listing"},
        {"url": "not-a-url", "snippet": "ignore"},
    ]}))

    sources = TinyFishDiscoveryProvider().discover(make_request(), "search-contract")

    assert [source.url for source in sources] == ["https://supplier.test/part"]


@pytest.mark.parametrize("payload", [{"results": []}, {"results": "invalid"}, {"unexpected": True}, ValueError("invalid json")])
def test_tinyfish_discovery_rejects_empty_or_malformed_responses(monkeypatch, payload) -> None:
    patch_provider_client(monkeypatch, FakeResponse(payload))

    with pytest.raises(ProviderError, match="discovery"):
        TinyFishDiscoveryProvider().discover(make_request(), "search-contract")


@pytest.mark.parametrize("status_code", [401, 429])
def test_tinyfish_discovery_surfaces_auth_and_rate_limit_failures(monkeypatch, status_code) -> None:
    patch_provider_client(monkeypatch, FakeResponse({}, status_code=status_code))

    with pytest.raises(ProviderError, match="discovery failed"):
        TinyFishDiscoveryProvider().discover(make_request(), "search-contract")


def test_tinyfish_fetch_accepts_markdown_and_rejects_missing_or_blocked_content(monkeypatch) -> None:
    source = DiscoveredSource(url="https://supplier.test/part", source_type="test")
    usable = {"results": [{"title": "Part", "text": "A" * 250}]}
    patch_provider_client(monkeypatch, FakeResponse(usable))
    document = TinyFishPageFetcher().fetch(source, "search-contract")
    assert document.content == "A" * 250

    for payload in ({"results": []}, {"results": [{"title": "Part"}]}, {"results": [{"text": "captcha blocked"}]}):
        patch_provider_client(monkeypatch, FakeResponse(payload))
        with pytest.raises(ProviderError, match="no content|unusable"):
            TinyFishPageFetcher().fetch(source, "search-contract")
