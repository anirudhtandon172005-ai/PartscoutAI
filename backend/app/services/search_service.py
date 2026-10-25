import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any
import enum
import time
import inspect

from app.db import get_db_session
from app.db.repositories import SearchRepository, search_record_to_schema, search_candidate_to_schema
from app.db.models import SearchStatus, SearchStage, Compatibility
from app.schemas import (
    SearchCreateRequest,
    SearchCreateResponse,
    SearchStatusResponse,
    CandidateResponse,
    CandidateListResponse,
    CandidateEvidence,
    RequirementSpec,
)
from app.services.provider_contracts import ProviderError, SearchProvider, StageCallback
from app.services.real_providers import RealSearchProvider
from app.config import settings
from app.services.real_providers import DeterministicMatcher


logger = logging.getLogger(__name__)
SEARCH_DEADLINE_SECONDS = 120


class MockSearchProvider:
    """Deterministic mock provider that returns consistent candidates for the same request."""

    def discover_candidates(self, request: SearchCreateRequest, search_id: str, stage_callback: StageCallback | None = None) -> list[CandidateResponse]:
        if stage_callback:
            stage_callback(SearchStage.SOURCE_DISCOVERY)
        scenario = settings.fixture_scenario.lower()
        if scenario == "provider_failure":
            raise ProviderError("fixture provider failure")
        if scenario == "timeout":
            time.sleep(SEARCH_DEADLINE_SECONDS + 1)
        if scenario == "empty":
            return []
        if stage_callback:
            stage_callback(SearchStage.PAGE_RETRIEVAL)
            stage_callback(SearchStage.ATTRIBUTE_EXTRACTION)
            stage_callback(SearchStage.NORMALIZATION)
            stage_callback(SearchStage.VALIDATION)
            stage_callback(SearchStage.EVIDENCE_COMPILATION)
        return self._generate_candidates(request, search_id)

    def _generate_candidates(self, request: SearchCreateRequest, search_id: str) -> list[CandidateResponse]:
        retrieved_at = datetime(2026, 10, 25, 10, 0, tzinfo=timezone.utc)
        non_m18 = "m18" not in f"{request.part_name} {request.original_part_number}".lower()
        scenario = settings.fixture_scenario.lower()
        part_numbers = ("IGT205", "Bi8U-M18-AP6X-H1141", "NBB8-18GM50-E2-V1") if not non_m18 else ("IGT205-GENERIC", "BI8U-GENERIC", "NBB8-GENERIC")
        def evidence(field: str, quote: str, url: str, confidence: float) -> CandidateEvidence:
            return CandidateEvidence(field=field, quote=quote, source_url=url, confidence=confidence, retrieved_at=retrieved_at)

        candidates: list[CandidateResponse] = []

        # Candidate 1: ifm IGT205 (best match - 96%)
        candidates.append(
            CandidateResponse(
                id=_make_candidate_id(search_id, 1),
                part_number=part_numbers[0],
                manufacturer="ifm efector",
                compatibility="unknown",
                score=0,
                specifications={
                    "mounting": "flush",
                    "output": "PNP normally open",
                    "sensing_range_mm": 8.0,
                    "connector": "M12 4-pin",
                    "housing_material": "316L Stainless Steel",
                    "ingress_protection": "IP68 / IP69K",
                    "operating_voltage": "10-36 V DC",
                    "switching_frequency": "400 Hz",
                },
                evidence=[
                    evidence("sensing_range_mm", "Sensing range: 8 mm", "https://www.ifm.com/product/IGT205", 0.98),
                    evidence("mounting", "Flush mountable", "https://www.ifm.com/product/IGT205", 0.98),
                    evidence("output", "PNP Normally Open (NO)", "https://www.ifm.com/manuals/IGT205_EN.pdf", 0.97),
                    evidence("connector", "M12 connector, gold-plated contacts", "https://www.ifm.com/manuals/IGT205_EN.pdf", 0.97),
                ],
            )
        )

        # Candidate 2: Turck Bi8U-M18 (functional equivalent - 92%)
        candidates.append(
            CandidateResponse(
                id=_make_candidate_id(search_id, 2),
                part_number=part_numbers[1],
                manufacturer="Turck",
                compatibility="unknown",
                score=0,
                specifications={
                    "mounting": "flush",
                    "output": "PNP normally open",
                    "sensing_range_mm": 8.0,
                    "connector": "M12 4-pin",
                    "housing_material": "Chrome-Plated Brass",
                    "ingress_protection": "IP68",
                    "operating_voltage": "10-30 V DC",
                    "switching_frequency": "1500 Hz",
                },
                evidence=[
                    evidence("sensing_range_mm", "Rated switching distance: 8 mm", "https://turck.us/product/Bi8U-M18-AP6X-H1141", 0.96),
                    evidence("mounting", "Mounting: Flush", "https://turck.us/product/Bi8U-M18-AP6X-H1141", 0.96),
                    evidence("output", "DC 3-wire, NO contact, PNP output", "https://turck.us/product/Bi8U-M18-AP6X-H1141", 0.96),
                    evidence("connector", "M12 x 1 male connector", "https://turck.us/product/Bi8U-M18-AP6X-H1141", 0.96),
                ],
            )
        )

        # Candidate 3: Pepperl+Fuchs NBB8 (mounting review required - 88%)
        candidates.append(
            CandidateResponse(
                id=_make_candidate_id(search_id, 3),
                part_number=part_numbers[2],
                manufacturer="Pepperl+Fuchs",
                compatibility="unknown",
                score=0,
                specifications={
                    "mounting": "flush",
                    "output": "PNP normally open",
                    "sensing_range_mm": 8.0,
                    "connector": "M12 4-pin",
                    "housing_material": "Nickel-Plated Brass",
                    "ingress_protection": "IP67",
                    "operating_voltage": "10-30 V DC",
                    "switching_frequency": "500 Hz",
                },
                evidence=[
                    evidence("sensing_range_mm", "Rated operating distance: 8 mm", "https://pepperl-fuchs.com/en/spec/084321.htm", 0.94),
                    evidence("mounting", "Installation: flush", "https://pepperl-fuchs.com/en/spec/084321.htm", 0.94),
                    evidence("output", "Switching function: Normally open (NO). Output type: PNP", "https://pepperl-fuchs.com/en/spec/084321.htm", 0.94),
                    evidence("connector", "Connection type: Male connector M12, 4-pin", "https://pepperl-fuchs.com/en/spec/084321.htm", 0.94),
                ],
            )
        )

        # Compatibility is always derived from the request, specifications,
        # and field-level evidence. The fixture only supplies raw candidate
        # data so it cannot leak stale demo scores into live result pages.
        matcher = DeterministicMatcher()
        candidates = [matcher.match(request, item, search_id, index) for index, item in enumerate(candidates, start=1)]

        if scenario == "single_candidate":
            candidates = candidates[:1]
        elif scenario == "invalid_evidence":
            candidates[0].evidence = []
        elif scenario == "missing_required_field":
            candidates[0].specifications.pop("sensing_range_mm", None)
            candidates[0].compatibility = "partial"
        elif scenario == "conflicting_field":
            candidates[0].specifications["output"] = "NPN normally closed"
            candidates[0].compatibility = "incompatible"

        if scenario in {"missing_required_field", "conflicting_field"}:
            candidates[0] = matcher.match(request, candidates[0], search_id, 1)

        if scenario == "invalid_evidence":
            candidates[0] = matcher.match(request, candidates[0], search_id, 1)

        return candidates


class SearchRateLimitError(RuntimeError):
    """Raised when the process-local active search budget is exhausted."""


def _build_provider() -> SearchProvider:
    # Test suites must remain deterministic even when a developer's local
    # backend/.env enables the real TinyFish provider.
    if os.environ.get("TEST_MODE", "false").lower() == "true":
        return MockSearchProvider()
    if settings.search_provider.lower() == "real":
        return RealSearchProvider()
    return MockSearchProvider()


_provider: SearchProvider = _build_provider()

# Stage progression
STAGE_PROGRESSION: list[SearchStage] = [
    SearchStage.SOURCE_DISCOVERY,
    SearchStage.PAGE_RETRIEVAL,
    SearchStage.ATTRIBUTE_EXTRACTION,
    SearchStage.NORMALIZATION,
    SearchStage.VALIDATION,
    SearchStage.EVIDENCE_COMPILATION,
]

STAGE_MESSAGES: dict[SearchStage, str] = {
    SearchStage.SOURCE_DISCOVERY: "Discovering candidate sources",
    SearchStage.PAGE_RETRIEVAL: "Retrieving candidate product pages",
    SearchStage.ATTRIBUTE_EXTRACTION: "Extracting technical attributes",
    SearchStage.NORMALIZATION: "Normalizing specifications",
    SearchStage.VALIDATION: "Validating against requirements",
    SearchStage.EVIDENCE_COMPILATION: "Compiling evidence and citations",
}

STAGE_PROGRESS: dict[SearchStage, int] = {
    SearchStage.SOURCE_DISCOVERY: 10,
    SearchStage.PAGE_RETRIEVAL: 25,
    SearchStage.ATTRIBUTE_EXTRACTION: 45,
    SearchStage.NORMALIZATION: 65,
    SearchStage.VALIDATION: 85,
    SearchStage.EVIDENCE_COMPILATION: 95,
}


def _make_candidate_id(search_id: str, index: int) -> str:
    """Generate unique candidate ID based on search ID."""
    return f"{search_id}-cand-{index}"


class SearchService:
    async def create_search(self, request: SearchCreateRequest, user_id: str | None = None, workspace_id: str | None = None) -> SearchCreateResponse:
        search_id = f"search-{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)

        # Create initial record in queued state using repository
        async with get_db_session() as session:
            repo = SearchRepository(session)
            if await repo.count_active_searches() >= settings.max_active_searches:
                raise SearchRateLimitError("Too many active searches; retry after current searches finish")
            await repo.create_search(search_id, request, user_id=user_id, workspace_id=workspace_id)

        return SearchCreateResponse(
            id=search_id,
            status="queued",
            stage=None,
            progress_percent=0,
            stage_message="Search queued",
            created_at=now,
            completed_at=None,
            candidate_count=0,
        )

    @staticmethod
    def _request_from_record(record) -> SearchCreateRequest:
        return SearchCreateRequest(
            machine_name=record.machine_name,
            part_name=record.part_name,
            original_part_number=record.original_part_number,
            manufacturer=record.manufacturer,
            quantity=record.quantity,
            requirements=RequirementSpec(**record.requirements_json),
        )

    async def _set_search_state(
        self,
        search_id: str,
        *,
        status: SearchStatus | None = None,
        stage: SearchStage | None = None,
        progress_percent: int | None = None,
        stage_message: str | None = None,
        error: str | None = None,
    ):
        """Keep database transactions short; provider calls must not run inside one."""
        async with get_db_session() as session:
            repo = SearchRepository(session)
            record = await repo.get_search(search_id)
            if not record:
                return None
            if status is not None:
                record.status = status
            if stage is not None:
                record.stage = stage
            if progress_percent is not None:
                record.progress_percent = progress_percent
            if stage_message is not None:
                record.stage_message = stage_message
            if error is not None:
                record.error = error
            if status == SearchStatus.COMPLETED:
                record.completed_at = datetime.now(timezone.utc)
            await session.flush()
            return record

    async def _persist_candidates(self, search_id: str, candidates: list[CandidateResponse], workspace_id: str | None) -> int:
        async with get_db_session() as session:
            repo = SearchRepository(session)
            try:
                saved = await repo.save_candidates(search_id, candidates, workspace_id=workspace_id)
            except Exception as exc:
                raise ProviderError(f"Candidate persistence failed: {exc}") from exc
            if not saved:
                raise ProviderError("Candidate persistence returned no saved candidates")
            return len(saved)

    async def _run_pipeline(self, search_id: str):
        """Run the provider exactly once and convert every failure to FAILED."""
        async with get_db_session() as session:
            repo = SearchRepository(session)
            record = await repo.get_search(search_id)
            if not record:
                return None
            if record.status in (SearchStatus.COMPLETED, SearchStatus.FAILED):
                return record
            request = self._request_from_record(record)
            workspace_id = record.workspace_id

        started_at = time.perf_counter()
        current_stage = SearchStage.SOURCE_DISCOVERY
        pipeline_active = True
        stage_update_futures = []
        try:
            await self._set_search_state(
                search_id,
                status=SearchStatus.RUNNING,
                stage=SearchStage.SOURCE_DISCOVERY,
                progress_percent=STAGE_PROGRESS[SearchStage.SOURCE_DISCOVERY],
                stage_message=STAGE_MESSAGES[SearchStage.SOURCE_DISCOVERY],
                error=None,
            )
            logger.info("search_started search_id=%s provider=%s stage=%s", search_id, settings.search_provider, SearchStage.SOURCE_DISCOVERY.value)
            logger.info("provider_started search_id=%s provider=%s stage=%s", search_id, settings.search_provider, SearchStage.SOURCE_DISCOVERY.value)
            loop = asyncio.get_running_loop()
            stage_started_at: dict[SearchStage, float] = {}
            last_stage: SearchStage | None = None

            async def drain_stage_updates() -> None:
                if stage_update_futures:
                    await asyncio.gather(
                        *(asyncio.wrap_future(future) for future in stage_update_futures),
                        return_exceptions=True,
                    )

            def on_stage(stage: SearchStage) -> None:
                nonlocal current_stage, last_stage
                if not pipeline_active:
                    return
                current_stage = stage
                if last_stage is not None and last_stage in stage_started_at:
                    logger.info(
                        "search_stage_completed search_id=%s provider=%s stage=%s duration_ms=%s",
                        search_id,
                        settings.search_provider,
                        last_stage.value,
                        round((time.perf_counter() - stage_started_at[last_stage]) * 1000),
                    )
                stage_started_at[stage] = time.perf_counter()
                last_stage = stage
                logger.info(
                    "search_stage_started search_id=%s provider=%s stage=%s",
                    search_id,
                    settings.search_provider,
                    stage.value,
                )
                stage_update_futures.append(asyncio.run_coroutine_threadsafe(
                    self._set_search_state(
                        search_id,
                        stage=stage,
                        progress_percent=STAGE_PROGRESS[stage],
                        stage_message=STAGE_MESSAGES[stage],
                    ),
                    loop,
                ))

            def run_provider() -> list[CandidateResponse]:
                use_test_fixture = (
                    os.environ.get("TEST_MODE", "false").lower() == "true"
                    and isinstance(_provider, RealSearchProvider)
                )
                active_provider = MockSearchProvider() if use_test_fixture else _provider
                provider_fn = active_provider.discover_candidates
                if "stage_callback" in inspect.signature(provider_fn).parameters:
                    return provider_fn(request, search_id, stage_callback=on_stage)
                # Preserve compatibility with simple test doubles that still
                # implement the original two-argument contract.
                return provider_fn(request, search_id)

            candidates = await asyncio.wait_for(
                asyncio.to_thread(run_provider),
                timeout=SEARCH_DEADLINE_SECONDS,
            )
            await drain_stage_updates()
            pipeline_active = False
            logger.info("provider_completed search_id=%s provider=%s stage=%s duration_ms=%s candidate_count=%s", search_id, settings.search_provider, SearchStage.SOURCE_DISCOVERY.value, round((time.perf_counter() - started_at) * 1000), len(candidates))
            if not candidates:
                raise ProviderError("Search provider returned no candidates")

            current_stage = SearchStage.EVIDENCE_COMPILATION
            await self._set_search_state(
                search_id,
                stage=SearchStage.EVIDENCE_COMPILATION,
                progress_percent=STAGE_PROGRESS[SearchStage.EVIDENCE_COMPILATION],
                stage_message=STAGE_MESSAGES[SearchStage.EVIDENCE_COMPILATION],
            )
            count = await self._persist_candidates(search_id, candidates, workspace_id)
            offer_count = sum(len(candidate.offers) for candidate in candidates)
            supplier_count = len({offer.supplier_name for candidate in candidates for offer in candidate.offers})
            logger.info(
                "candidate_persistence_completed search_id=%s stage=%s candidate_count=%s supplier_count=%s offer_count=%s",
                search_id,
                SearchStage.EVIDENCE_COMPILATION.value,
                count,
                supplier_count,
                offer_count,
            )
            await self._set_search_state(
                search_id,
                status=SearchStatus.COMPLETED,
                progress_percent=100,
                stage_message="Search completed",
            )
            logger.info(
                "search_completed search_id=%s provider=%s duration_ms=%s candidate_count=%s supplier_count=%s offer_count=%s",
                search_id,
                settings.search_provider,
                round((time.perf_counter() - started_at) * 1000),
                count,
                supplier_count,
                offer_count,
            )
        except asyncio.TimeoutError:
            pipeline_active = False
            await drain_stage_updates()
            error = f"Search provider pipeline timed out after {SEARCH_DEADLINE_SECONDS} seconds"
            logger.exception("search_failed search_id=%s provider=%s stage=%s duration_ms=%s error=%s", search_id, settings.search_provider, current_stage.value, round((time.perf_counter() - started_at) * 1000), error)
            await self.fail_search(search_id, error)
        except Exception as exc:
            pipeline_active = False
            await drain_stage_updates()
            error = str(exc) or exc.__class__.__name__
            logger.exception("search_failed search_id=%s provider=%s stage=%s duration_ms=%s error=%s", search_id, settings.search_provider, current_stage.value, round((time.perf_counter() - started_at) * 1000), error)
            await self.fail_search(search_id, error)

        async with get_db_session() as session:
            return await SearchRepository(session).get_search(search_id)

    async def advance_search(self, search_id: str):
        """Run the complete search pipeline (kept for API compatibility)."""
        return await self._run_pipeline(search_id)

    async def complete_search(self, search_id: str):
        """Run the complete search pipeline immediately (for testing/demo)."""
        return await self._run_pipeline(search_id)

    async def fail_search(self, search_id: str, error: str):
        """Mark the search as failed."""
        async with get_db_session() as session:
            repo = SearchRepository(session)

            record = await repo.get_search(search_id)
            if not record:
                return None

            record.status = SearchStatus.FAILED
            record.error = error
            await session.flush()
            return record

    async def get_search(self, search_id: str, workspace_id: str | None = None) -> SearchStatusResponse:
        async with get_db_session() as session:
            repo = SearchRepository(session)

            record = await repo.get_search(search_id, workspace_id=workspace_id)
            if not record:
                raise KeyError(f"Search not found: {search_id}")

            return SearchStatusResponse(**search_record_to_schema(record))

    async def get_candidates(self, search_id: str, workspace_id: str | None = None) -> CandidateListResponse:
        async with get_db_session() as session:
            repo = SearchRepository(session)

            record = await repo.get_search(search_id, workspace_id=workspace_id)
            if not record:
                raise KeyError(f"Search not found: {search_id}")

            candidates = await repo.get_candidates(search_id, workspace_id=workspace_id)
            items = [search_candidate_to_schema(c) for c in candidates]
            return CandidateListResponse(search_id=search_id, items=items)


search_service = SearchService()
