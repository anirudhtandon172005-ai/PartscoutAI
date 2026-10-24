import uuid
from datetime import datetime, timezone
from typing import Any
import enum

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


class MockSearchProvider:
    """Deterministic mock provider that returns consistent candidates for the same request."""

    def discover_candidates(self, request: SearchCreateRequest, search_id: str) -> list[CandidateResponse]:
        return self._generate_candidates(request, search_id)

    def _generate_candidates(self, request: SearchCreateRequest, search_id: str) -> list[CandidateResponse]:
        candidates: list[CandidateResponse] = []

        # Candidate 1: ifm IGT205 (best match - 96%)
        candidates.append(
            CandidateResponse(
                id=_make_candidate_id(search_id, 1),
                part_number="IGT205",
                manufacturer="ifm efector",
                compatibility="compatible",
                score=96,
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
                    CandidateEvidence(
                        field="sensing_range_mm",
                        quote="Sensing range: 8 mm",
                        source_url="https://www.ifm.com/product/IGT205",
                        confidence=0.98,
                    ),
                    CandidateEvidence(
                        field="mounting",
                        quote="Flush mountable",
                        source_url="https://www.ifm.com/product/IGT205",
                        confidence=0.98,
                    ),
                    CandidateEvidence(
                        field="output",
                        quote="PNP Normally Open (NO)",
                        source_url="https://www.ifm.com/manuals/IGT205_EN.pdf",
                        confidence=0.97,
                    ),
                    CandidateEvidence(
                        field="connector",
                        quote="M12 connector, gold-plated contacts",
                        source_url="https://www.ifm.com/manuals/IGT205_EN.pdf",
                        confidence=0.97,
                    ),
                ],
            )
        )

        # Candidate 2: Turck Bi8U-M18 (functional equivalent - 92%)
        candidates.append(
            CandidateResponse(
                id=_make_candidate_id(search_id, 2),
                part_number="Bi8U-M18-AP6X-H1141",
                manufacturer="Turck",
                compatibility="compatible",
                score=92,
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
                    CandidateEvidence(
                        field="sensing_range_mm",
                        quote="Rated switching distance: 8 mm",
                        source_url="https://turck.us/product/Bi8U-M18-AP6X-H1141",
                        confidence=0.96,
                    ),
                    CandidateEvidence(
                        field="mounting",
                        quote="Mounting: Flush",
                        source_url="https://turck.us/product/Bi8U-M18-AP6X-H1141",
                        confidence=0.96,
                    ),
                    CandidateEvidence(
                        field="output",
                        quote="DC 3-wire, NO contact, PNP output",
                        source_url="https://turck.us/product/Bi8U-M18-AP6X-H1141",
                        confidence=0.96,
                    ),
                    CandidateEvidence(
                        field="connector",
                        quote="M12 x 1 male connector",
                        source_url="https://turck.us/product/Bi8U-M18-AP6X-H1141",
                        confidence=0.96,
                    ),
                ],
            )
        )

        # Candidate 3: Pepperl+Fuchs NBB8 (mounting review required - 88%)
        candidates.append(
            CandidateResponse(
                id=_make_candidate_id(search_id, 3),
                part_number="NBB8-18GM50-E2-V1",
                manufacturer="Pepperl+Fuchs",
                compatibility="partial",
                score=88,
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
                    CandidateEvidence(
                        field="sensing_range_mm",
                        quote="Rated operating distance: 8 mm",
                        source_url="https://pepperl-fuchs.com/en/spec/084321.htm",
                        confidence=0.94,
                    ),
                    CandidateEvidence(
                        field="mounting",
                        quote="Installation: flush",
                        source_url="https://pepperl-fuchs.com/en/spec/084321.htm",
                        confidence=0.94,
                    ),
                    CandidateEvidence(
                        field="output",
                        quote="Switching function: Normally open (NO). Output type: PNP",
                        source_url="https://pepperl-fuchs.com/en/spec/084321.htm",
                        confidence=0.94,
                    ),
                    CandidateEvidence(
                        field="connector",
                        quote="Connection type: Male connector M12, 4-pin",
                        source_url="https://pepperl-fuchs.com/en/spec/084321.htm",
                        confidence=0.94,
                    ),
                ],
            )
        )

        return candidates


_provider = MockSearchProvider()

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

    async def advance_search(self, search_id: str):
        """Advance the search to the next stage."""
        async with get_db_session() as session:
            repo = SearchRepository(session)

            record = await repo.get_search(search_id)
            if not record:
                return None

            if record.status == SearchStatus.QUEUED:
                record.status = SearchStatus.RUNNING
                record.stage = STAGE_PROGRESSION[0]
                record.progress_percent = STAGE_PROGRESS[record.stage]
                record.stage_message = STAGE_MESSAGES[record.stage]
            elif record.status == SearchStatus.RUNNING and record.stage:
                try:
                    current_idx = STAGE_PROGRESSION.index(record.stage)
                    if current_idx + 1 < len(STAGE_PROGRESSION):
                        record.stage = STAGE_PROGRESSION[current_idx + 1]
                        record.progress_percent = STAGE_PROGRESS[record.stage]
                        record.stage_message = STAGE_MESSAGES[record.stage]
                    else:
                        record.status = SearchStatus.COMPLETED
                        record.stage = STAGE_PROGRESSION[-1]
                        record.progress_percent = 100
                        record.stage_message = "Search completed"
                        record.completed_at = datetime.now(timezone.utc)
                        # Generate candidates - reconstruct request from record
                        request = SearchCreateRequest(
                            machine_name=record.machine_name,
                            part_name=record.part_name,
                            original_part_number=record.original_part_number,
                            manufacturer=record.manufacturer,
                            quantity=record.quantity,
                            requirements=RequirementSpec(**record.requirements_json),
                        )
                        candidates = _provider.discover_candidates(request, search_id)
                        await repo.save_candidates(search_id, candidates, workspace_id=record.workspace_id)
                except ValueError:
                    record.stage = STAGE_PROGRESSION[0]
                    record.progress_percent = STAGE_PROGRESS[record.stage]
                    record.stage_message = STAGE_MESSAGES[record.stage]

            await session.flush()
            return record

    async def complete_search(self, search_id: str):
        """Complete the search immediately (for testing/demo)."""
        async with get_db_session() as session:
            repo = SearchRepository(session)

            record = await repo.get_search(search_id)
            if not record:
                return None

            while record.status != SearchStatus.COMPLETED:
                # Advance within the same session
                if record.status == SearchStatus.QUEUED:
                    record.status = SearchStatus.RUNNING
                    record.stage = STAGE_PROGRESSION[0]
                    record.progress_percent = STAGE_PROGRESS[record.stage]
                    record.stage_message = STAGE_MESSAGES[record.stage]
                elif record.status == SearchStatus.RUNNING and record.stage:
                    try:
                        current_idx = STAGE_PROGRESSION.index(record.stage)
                        if current_idx + 1 < len(STAGE_PROGRESSION):
                            record.stage = STAGE_PROGRESSION[current_idx + 1]
                            record.progress_percent = STAGE_PROGRESS[record.stage]
                            record.stage_message = STAGE_MESSAGES[record.stage]
                        else:
                            record.status = SearchStatus.COMPLETED
                            record.stage = STAGE_PROGRESSION[-1]
                            record.progress_percent = 100
                            record.stage_message = "Search completed"
                            record.completed_at = datetime.now(timezone.utc)
                            # Generate candidates - reconstruct request from record
                            request = SearchCreateRequest(
                                machine_name=record.machine_name,
                                part_name=record.part_name,
                                original_part_number=record.original_part_number,
                                manufacturer=record.manufacturer,
                                quantity=record.quantity,
                                requirements=RequirementSpec(**record.requirements_json),
                            )
                            candidates = _provider.discover_candidates(request, search_id)
                            await repo.save_candidates(search_id, candidates, workspace_id=record.workspace_id)
                    except ValueError:
                        record.stage = STAGE_PROGRESSION[0]
                        record.progress_percent = STAGE_PROGRESS[record.stage]
                        record.stage_message = STAGE_MESSAGES[record.stage]

                await session.flush()
                # Refresh record from session
                await session.refresh(record)

            return record

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