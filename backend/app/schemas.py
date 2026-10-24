from typing import Literal
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime


Compatibility = Literal["compatible", "partial", "incompatible", "unknown"]
SearchStatus = Literal["queued", "running", "completed", "failed"]


class RequirementSpec(BaseModel):
    mounting: str | None = None
    output: str | None = None
    sensing_range_mm: float | None = Field(default=None, ge=0)
    connector: str | None = None


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
    created_at: datetime
    completed_at: datetime | None = None
    candidate_count: int = 0


class SearchStatusResponse(BaseModel):
    id: str
    status: SearchStatus
    request: SearchCreateRequest
    candidate_count: int = 0
    created_at: datetime
    completed_at: datetime | None = None
    error: str | None = None


class CandidateEvidence(BaseModel):
    field: str
    quote: str
    source_url: HttpUrl
    confidence: float = Field(ge=0.0, le=1.0)


class CandidateResponse(BaseModel):
    id: str
    part_number: str
    manufacturer: str
    compatibility: Compatibility
    score: int = Field(ge=0, le=100)
    specifications: dict[str, object]
    evidence: list[CandidateEvidence]


class CandidateListResponse(BaseModel):
    search_id: str
    items: list[CandidateResponse]


class ErrorResponse(BaseModel):
    detail: str


class HealthResponse(BaseModel):
    status: Literal["ok"]


UserRole = Literal["engineer", "procurement", "admin"]


class AuthUser(BaseModel):
    id: str
    email: str
    name: str = "Plant Specialist"
    role: UserRole = "engineer"
    plant_site: str = "Apex PackWorks - Main Plant (Facility B4)"
    created_at: str | None = None


class TokenVerifyRequest(BaseModel):
    access_token: str


class TokenVerifyResponse(BaseModel):
    valid: bool
    user: AuthUser | None = None
    message: str


class AuthConfigResponse(BaseModel):
    supabase_configured: bool
    supabase_url: str | None = None
    auth_modes: list[str] = ["email_password", "quick_demo_persona"]