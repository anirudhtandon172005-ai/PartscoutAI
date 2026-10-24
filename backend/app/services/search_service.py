import uuid
from datetime import datetime, timezone
from typing import Any

from app.schemas import (
    SearchCreateRequest,
    SearchCreateResponse,
    SearchStatusResponse,
    CandidateResponse,
    CandidateListResponse,
    CandidateEvidence,
    RequirementSpec,
    SearchStatus,
    Compatibility,
)


class SearchRecord:
    def __init__(
        self,
        search_id: str,
        request: SearchCreateRequest,
        status: SearchStatus,
        candidates: list[CandidateResponse] | None = None,
        created_at: datetime | None = None,
        completed_at: datetime | None = None,
        error: str | None = None,
    ):
        self.search_id = search_id
        self.request = request
        self.status = status
        self.candidates = candidates or []
        self.created_at = created_at or datetime.now(timezone.utc)
        self.completed_at = completed_at
        self.error = error


class MockSearchProvider:
    """Deterministic mock provider that returns consistent candidates for the same request."""

    def discover_candidates(self, request: SearchCreateRequest) -> list[CandidateResponse]:
        return self._generate_candidates(request)

    def _generate_candidates(self, request: SearchCreateRequest) -> list[CandidateResponse]:
        candidates: list[CandidateResponse] = []

        # Candidate 1: ifm IGT205 (best match - 96%)
        candidates.append(
            CandidateResponse(
                id="candidate-001",
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
                id="candidate-002",
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
                id="candidate-003",
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


# In-memory stores
_searches: dict[str, SearchRecord] = {}
_candidates: dict[str, list[CandidateResponse]] = {}
_provider = MockSearchProvider()


class SearchService:
    def create_search(self, request: SearchCreateRequest) -> SearchCreateResponse:
        search_id = f"search-{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)

        # Generate candidates synchronously
        candidates = _provider.discover_candidates(request)

        # Store search record
        record = SearchRecord(
            search_id=search_id,
            request=request,
            status="completed",
            candidates=candidates,
            created_at=now,
            completed_at=now,
        )
        _searches[search_id] = record
        _candidates[search_id] = candidates

        return SearchCreateResponse(
            id=search_id,
            status="completed",
            created_at=now,
            completed_at=now,
            candidate_count=len(candidates),
        )

    def get_search(self, search_id: str) -> SearchStatusResponse:
        record = _searches.get(search_id)
        if not record:
            raise KeyError(f"Search not found: {search_id}")

        return SearchStatusResponse(
            id=record.search_id,
            status=record.status,
            request=record.request,
            candidate_count=len(record.candidates),
            created_at=record.created_at,
            completed_at=record.completed_at,
            error=record.error,
        )

    def get_candidates(self, search_id: str) -> CandidateListResponse:
        if search_id not in _searches:
            raise KeyError(f"Search not found: {search_id}")

        items = _candidates.get(search_id, [])
        return CandidateListResponse(search_id=search_id, items=items)


search_service = SearchService()