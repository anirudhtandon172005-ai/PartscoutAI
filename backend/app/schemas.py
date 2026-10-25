from typing import Literal
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime


Compatibility = Literal["compatible", "partial", "incompatible", "unknown"]
SearchStatus = Literal["queued", "running", "completed", "failed"]
SearchStage = Literal[
    "source_discovery",
    "page_retrieval",
    "attribute_extraction",
    "normalization",
    "validation",
    "evidence_compilation",
]


class RequirementSpec(BaseModel):
    mounting: str | None = None
    output: str | None = None
    sensing_range_mm: float | None = Field(default=None, ge=0)
    connector: str | None = None
    operating_voltage: str | None = None
    switching_frequency: str | None = None


class SearchCreateRequest(BaseModel):
    machine_name: str = Field(min_length=1, max_length=200)
    part_name: str = Field(min_length=1, max_length=200)
    original_part_number: str = Field(min_length=1, max_length=200)
    manufacturer: str | None = Field(default=None, max_length=200)
    quantity: int = Field(gt=0, le=100000)
    requirements: RequirementSpec


class SearchCreateResponse(BaseModel):
    id: str
    status: SearchStatus
    stage: SearchStage | None = None
    progress_percent: int = Field(ge=0, le=100, default=0)
    stage_message: str = ""
    created_at: datetime
    completed_at: datetime | None = None
    candidate_count: int = 0


class SearchStatusResponse(BaseModel):
    id: str
    status: SearchStatus
    stage: SearchStage | None = None
    progress_percent: int = Field(ge=0, le=100, default=0)
    stage_message: str = ""
    request: SearchCreateRequest
    candidate_count: int = 0
    created_at: datetime
    completed_at: datetime | None = None
    error: str | None = None


class WorkspaceRequestCreate(BaseModel):
    """Wire contract for persisting a procurement request."""
    id: str | None = None
    request_number: str | None = None
    machine_id: str | None = None
    machine_name: str = Field(default="General Facility Asset", max_length=255)
    part_name: str = Field(min_length=1, max_length=255)
    original_part_number: str = Field(min_length=1, max_length=255)
    manufacturer: str = Field(default="", max_length=255)
    quantity_needed: int = Field(gt=0, le=100000)
    urgency: Literal["Line Down (Critical)", "Urgent (24-48h)", "Planned Maintenance", "Standard Restock"]
    acceptable_alternatives: bool = True
    custom_requirements: str = ""
    status: Literal["Draft", "Researching", "Candidates Found", "Quote Requested", "Approved", "PO Issued", "Installed"] = "Researching"
    target_component_id: str | None = None


class CandidateEvidence(BaseModel):
    field: str
    quote: str
    source_url: HttpUrl
    confidence: float = Field(ge=0.0, le=1.0)
    retrieved_at: datetime


class CandidateOffer(BaseModel):
    """A procurement offer extracted from a source page.

    Procurement fields remain optional because a listing may expose stock but
    not price, or a price but not a contact. The real-provider pipeline only
    emits offers when the minimum fields needed to identify and verify a
    listing are present.
    """

    supplier_name: str
    supplier_id: str | None = None
    supplier_domain: str = ""
    supplier_type: str = "Specialist Stockist"
    location: str = ""
    reported_price: float | None = Field(default=None, ge=0)
    currency: str | None = None
    stock_status: str | None = None
    quantity_available: int | None = Field(default=None, ge=0)
    lead_time_days: int | None = Field(default=None, ge=0)
    min_order_quantity: int | None = Field(default=None, ge=1)
    source_url: HttpUrl
    product_url: HttpUrl | None = None
    datasheet_url: HttpUrl | None = None
    last_checked: datetime
    freshness: Literal["fresh", "moderate", "stale"] = "fresh"
    contact_phone: str | None = None
    contact_email: str | None = None
    evidence_quote: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    notes: str | None = None


class CandidateResponse(BaseModel):
    id: str
    part_number: str
    manufacturer: str
    compatibility: Compatibility
    score: int = Field(ge=0, le=100)
    specifications: dict[str, object]
    evidence: list[CandidateEvidence]
    offers: list[CandidateOffer] = Field(default_factory=list)


class CandidateListResponse(BaseModel):
    search_id: str
    items: list[CandidateResponse]


class ErrorResponse(BaseModel):
    detail: str


class HealthResponse(BaseModel):
    status: Literal["ok"]


class WorkspaceSummary(BaseModel):
    id: str
    name: str
    facility: str
    role: str


class MeResponse(BaseModel):
    id: str
    email: str | None = None
    full_name: str = ""
    facility: str = ""
    workspaces: list[WorkspaceSummary] = []
