from __future__ import annotations
from typing import Literal, Optional, List, Dict
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime


Compatibility = Literal["compatible", "partial", "incompatible", "unknown"]
SearchStatus = Literal["queued", "running", "completed", "failed"]


class RequirementSpec(BaseModel):
    mounting: Optional[str] = None
    output: Optional[str] = None
    sensing_range_mm: Optional[float] = Field(default=None, ge=0)
    connector: Optional[str] = None


class SearchCreateRequest(BaseModel):
    machine_name: str = Field(min_length=1, max_length=200)
    part_name: str = Field(min_length=1, max_length=200)
    original_part_number: str = Field(min_length=1, max_length=200)
    manufacturer: Optional[str] = Field(default=None, max_length=200)
    quantity: int = Field(gt=0, le=100000)
    requirements: RequirementSpec = Field(default_factory=RequirementSpec)


class SearchCreateResponse(BaseModel):
    id: str
    status: SearchStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    candidate_count: int = 0


class SearchStatusResponse(BaseModel):
    id: str
    status: SearchStatus
    request: SearchCreateRequest
    candidate_count: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


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
    created_at: Optional[str] = None


class TokenVerifyRequest(BaseModel):
    access_token: str


class TokenVerifyResponse(BaseModel):
    valid: bool
    user: Optional[AuthUser] = None
    message: str


class AuthConfigResponse(BaseModel):
    supabase_configured: bool
    supabase_url: Optional[str] = None
    auth_modes: list[str] = ["email_password", "quick_demo_persona"]