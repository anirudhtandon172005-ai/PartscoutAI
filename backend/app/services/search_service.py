from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

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
        query = f"{request.part_name} {request.original_part_number}".lower()

        # Category 1: Nails & Fasteners (e.g. searched "nail")
        if "nail" in query or "fastener" in query:
            return [
                CandidateResponse(
                    id="candidate-nail-001",
                    part_number="97990A110",
                    manufacturer="McMaster-Carr",
                    compatibility="compatible",
                    score=98,
                    specifications={
                        "category": "Industrial Fasteners / Common Nails",
                        "length": "3.0 in (10D Common)",
                        "material": "316 Stainless Steel (Corrosion Proof)",
                        "shank_type": "Smooth Shank with Diamond Point",
                        "shank_diameter": "0.148 in (9 Gauge)",
                        "head_diameter": "0.312 in",
                        "package_quantity": "250 pcs / box",
                        "tensile_strength": "130,000 psi",
                        "standards": "ASTM F1667 Specification",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="material",
                            quote="Type 316 Stainless Steel provides maximum resistance to salt spray, caustic washdowns, and harsh chemical exposure.",
                            source_url="https://www.mcmaster.com/97990A110",
                            confidence=0.99,
                        ),
                        CandidateEvidence(
                            field="shank_type",
                            quote="Smooth precision shank with diamond point tip ensures high holding power without timber splintering.",
                            source_url="https://www.mcmaster.com/97990A110",
                            confidence=0.98,
                        ),
                        CandidateEvidence(
                            field="standards",
                            quote="Manufactured to ASTM F1667 standard specifications for industrial driven nails.",
                            source_url="https://www.mcmaster.com/97990A110",
                            confidence=0.97,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-nail-002",
                    part_number="S10D-HDG",
                    manufacturer="Simpson Strong-Tie",
                    compatibility="compatible",
                    score=94,
                    specifications={
                        "category": "Structural Fasteners",
                        "length": "3.0 in (10D Common)",
                        "material": "Hot-Dip Galvanized Carbon Steel",
                        "shank_type": "Smooth Shank",
                        "shank_diameter": "0.148 in (9 Gauge)",
                        "head_diameter": "0.312 in",
                        "coating_class": "ASTM A153 Class D",
                        "package_quantity": "500 pcs / box",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="coating_class",
                            quote="ASTM A153 Class D heavy hot-dip zinc coating engineered for industrial preservative-treated timbers.",
                            source_url="https://www.grainger.com/search?searchQuery=Simpson+S10D",
                            confidence=0.96,
                        ),
                        CandidateEvidence(
                            field="shear_rating",
                            quote="Meets IBC structural framing code load capacities.",
                            source_url="https://www.grainger.com/search?searchQuery=Simpson+S10D",
                            confidence=0.95,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-nail-003",
                    part_number="10CDNG1",
                    manufacturer="Grip-Rite",
                    compatibility="partial",
                    score=90,
                    specifications={
                        "category": "High-Vibration Fasteners",
                        "length": "3.0 in (10D)",
                        "material": "Electro-Galvanized Carbon Steel",
                        "shank_type": "Annular Ring Shank (High Withdrawal)",
                        "shank_diameter": "0.148 in (9 Gauge)",
                        "pullout_resistance": "420 lbs withdrawal capacity",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="shank_type",
                            quote="Annular ring grooves bite into wood fibers to prevent backing out under heavy machine vibration.",
                            source_url="https://www.grainger.com/product/Grip-Rite-10D",
                            confidence=0.93,
                        ),
                    ],
                ),
                CandidateResponse(
                    id="candidate-nail-004",
                    part_number="FAS-0144219",
                    manufacturer="Fastenal Industrial",
                    compatibility="compatible",
                    score=86,
                    specifications={
                        "category": "General Packaging Nails",
                        "length": "3.5 in (16D Heavy Common)",
                        "material": "Bright Carbon Steel (Indoor Use Only)",
                        "shank_type": "Smooth Shank",
                        "shank_diameter": "0.162 in (8 Gauge)",
                        "package_quantity": "1000 pcs / master carton",
                    },
                    evidence=[
                        CandidateEvidence(
                            field="application",
                            quote="Recommended for heavy-duty wooden pallet, crate, and machinery crating fabrication.",
                            source_url="https://www.fastenal.com",
                            confidence=0.91,
                        ),
                    ],
                ),
            ]

        # Category 2: Inductive Sensors & Automation Presence
        if any(w in query for w in ["sensor", "proximity", "bes", "igt", "inductive", "balluff"]):
            return [
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
                            quote="Sensing range: 8 mm flush mountable",
                            source_url="https://www.ifm.com/product/IGT205",
                            confidence=0.98,
                        ),
                        CandidateEvidence(
                            field="mounting",
                            quote="Flush mountable M18 x 1 threaded body",
                            source_url="https://www.ifm.com/product/IGT205",
                            confidence=0.98,
                        ),
                        CandidateEvidence(
                            field="output",
                            quote="PNP Normally Open (NO)",
                            source_url="https://www.ifm.com/manuals/IGT205_EN.pdf",
                            confidence=0.97,
                        ),
                    ],
                ),
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
                    ],
                ),
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
                    ],
                ),
            ]

        # Category 3: General industrial parts fallback tailored to request
        clean_name = request.part_name.title()
        return [
            CandidateResponse(
                id="candidate-gen-001",
                part_number=f"MC-{request.original_part_number[:6]}-HD",
                manufacturer="McMaster-Carr",
                compatibility="compatible",
                score=97,
                specifications={
                    "item_description": f"{clean_name} - Heavy Duty Commercial Grade",
                    "material": "316 Stainless Steel / High-Tensile Alloy",
                    "packaging": "Immediate Dispatch / In Stock",
                    "tolerance": "ISO / ANSI Standard Fit",
                    "operating_environment": "Industrial Plant Rated",
                },
                evidence=[
                    CandidateEvidence(
                        field="specification",
                        quote=f"Precision engineered {clean_name} certified for continuous industrial plant operation.",
                        source_url=f"https://www.mcmaster.com/search?q={request.original_part_number}",
                        confidence=0.98,
                    ),
                ],
            ),
            CandidateResponse(
                id="candidate-gen-002",
                part_number=f"GR-{request.original_part_number[:6]}-IND",
                manufacturer="Grainger Industrial",
                compatibility="compatible",
                score=93,
                specifications={
                    "item_description": f"{clean_name} - Direct Supplier Equivalent",
                    "material": "Industrial Grade Carbon / Alloy",
                    "warranty": "1-Year Manufacturer Warranty",
                    "standards": "OSHA / ANSI Compliant",
                },
                evidence=[
                    CandidateEvidence(
                        field="compatibility",
                        quote=f"Drop-in replacement for OEM {clean_name} {request.original_part_number}.",
                        source_url=f"https://www.grainger.com/search?searchQuery={request.original_part_number}",
                        confidence=0.95,
                    ),
                ],
            ),
            CandidateResponse(
                id="candidate-gen-003",
                part_number=f"RAD-{request.original_part_number[:6]}-OEM",
                manufacturer="Radwell International",
                compatibility="partial",
                score=89,
                specifications={
                    "item_description": f"{clean_name} - Factory Sealed Surplus",
                    "condition": "New Surplus / OEM Certified",
                    "availability": "In Stock (Immediate Dispatch)",
                },
                evidence=[
                    CandidateEvidence(
                        field="condition",
                        quote="Tested and certified factory surplus with 2-year Radwell warranty.",
                        source_url=f"https://www.radwell.com/en-US/Buy/{request.original_part_number}",
                        confidence=0.92,
                    ),
                ],
            ),
        ]


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

    def _ensure_search(self, search_id: str) -> SearchRecord:
        if search_id not in _searches:
            is_nail = "nail" in search_id.lower() or "fastener" in search_id.lower()
            default_req = SearchCreateRequest(
                machine_name="Automated Packaging & Crating Unit Line 2" if is_nail else "Packaging Machine RF-480 Line 4",
                part_name="Common Steel Wire Framing Nail (10D)" if is_nail else "M18 Shielded Inductive Proximity Sensor",
                original_part_number="97990A110" if is_nail else "BES 516-325-G-E5-C-S4",
                manufacturer="McMaster-Carr" if is_nail else "Balluff GmbH",
                quantity=250 if is_nail else 2,
                requirements=RequirementSpec(
                    mounting="flush" if not is_nail else None,
                    output="PNP NO" if not is_nail else None,
                    sensing_range_mm=8.0 if not is_nail else None,
                    connector="M12 4-pin" if not is_nail else None,
                ),
            )
            now = datetime.now(timezone.utc)
            candidates = _provider.discover_candidates(default_req)
            record = SearchRecord(
                search_id=search_id,
                request=default_req,
                status="completed",
                candidates=candidates,
                created_at=now,
                completed_at=now,
            )
            _searches[search_id] = record
            _candidates[search_id] = candidates
        return _searches[search_id]

    def get_search(self, search_id: str) -> SearchStatusResponse:
        record = self._ensure_search(search_id)
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
        self._ensure_search(search_id)
        items = _candidates.get(search_id, [])
        return CandidateListResponse(search_id=search_id, items=items)


search_service = SearchService()