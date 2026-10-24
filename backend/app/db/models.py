from datetime import datetime
from typing import Optional, List
import enum
from sqlalchemy import (
    String,
    Text,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    JSON,
    Enum as SQLEnum,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import settings
from app.db.database import Base

# UUID column type - use String(64) for both SQLite and PostgreSQL
UUID_STR = String(64)

# Auth table name depends on database provider
# SQLite uses auth_users (no schema), PostgreSQL/Supabase uses auth.users
AUTH_TABLE = "auth_users" if settings.database_provider.lower() == "sqlite" else "auth.users"


class SearchStage(str, enum.Enum):
    SOURCE_DISCOVERY = "source_discovery"
    PAGE_RETRIEVAL = "page_retrieval"
    ATTRIBUTE_EXTRACTION = "attribute_extraction"
    NORMALIZATION = "normalization"
    VALIDATION = "validation"
    EVIDENCE_COMPILATION = "evidence_compilation"


class SearchStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Compatibility(str, enum.Enum):
    COMPATIBLE = "compatible"
    PARTIAL = "partial"
    INCOMPATIBLE = "incompatible"
    UNKNOWN = "unknown"


class UserRole(str, enum.Enum):
    ENGINEER = "engineer"
    PROCUREMENT = "procurement"
    ADMIN = "admin"


class WorkspaceRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    ENGINEER = "engineer"
    PROCUREMENT = "procurement"
    VIEWER = "viewer"


class RequestStatus(str, enum.Enum):
    DRAFT = "Draft"
    RESEARCHING = "Researching"
    CANDIDATES_FOUND = "Candidates Found"
    QUOTE_REQUESTED = "Quote Requested"
    APPROVED = "Approved"
    PO_ISSUED = "PO Issued"
    INSTALLED = "Installed"


class RequestUrgency(str, enum.Enum):
    LINE_DOWN = "Line Down (Critical)"
    URGENT = "Urgent (24-48h)"
    PLANNED = "Planned Maintenance"
    STANDARD = "Standard Restock"


class MachineCriticality(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class QuoteStatus(str, enum.Enum):
    PENDING_REVIEW = "Pending Review"
    ACCEPTED = "Accepted"
    DECLINED = "Declined"


class OfferFreshness(str, enum.Enum):
    FRESH = "fresh"
    MODERATE = "moderate"
    STALE = "stale"


class CollectionJobStatus(str, enum.Enum):
    COMPLETED = "Completed"
    RUNNING = "Running"
    FAILED = "Failed"
    QUEUED = "Queued"


class QualitySeverity(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    facility: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    role: Mapped[str] = mapped_column(SQLEnum(UserRole), nullable=False, default=UserRole.ENGINEER)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    facility: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    owner_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey(f"{AUTH_TABLE}.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    members: Mapped[List["WorkspaceMember"]] = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    machines: Mapped[List["Machine"]] = relationship("Machine", back_populates="workspace", cascade="all, delete-orphan")
    parts: Mapped[List["Part"]] = relationship("Part", back_populates="workspace", cascade="all, delete-orphan")
    requests: Mapped[List["PartRequest"]] = relationship("PartRequest", back_populates="workspace", cascade="all, delete-orphan")
    searches: Mapped[List["SearchRecord"]] = relationship("SearchRecord", back_populates="workspace", cascade="all, delete-orphan")
    suppliers: Mapped[List["Supplier"]] = relationship("Supplier", back_populates="workspace", cascade="all, delete-orphan")
    quotations: Mapped[List["Quotation"]] = relationship("Quotation", back_populates="workspace", cascade="all, delete-orphan")
    source_domains: Mapped[List["SourceDomain"]] = relationship("SourceDomain", back_populates="workspace", cascade="all, delete-orphan")
    collection_jobs: Mapped[List["CollectionJob"]] = relationship("CollectionJob", back_populates="workspace", cascade="all, delete-orphan")
    quality_issues: Mapped[List["DataQualityIssue"]] = relationship("DataQualityIssue", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey(f"{AUTH_TABLE}.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(SQLEnum(WorkspaceRole), nullable=False, default=WorkspaceRole.VIEWER)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="members")


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    manufacturer: Mapped[str] = mapped_column(String(255), nullable=False)
    model: Mapped[str] = mapped_column(String(255), nullable=False)
    machine_type: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    facility: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    production_line: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    commission_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    criticality: Mapped[str] = mapped_column(SQLEnum(MachineCriticality), nullable=False, default=MachineCriticality.MEDIUM)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="machines")
    requests: Mapped[List["PartRequest"]] = relationship("PartRequest", back_populates="machine")


class Part(Base):
    __tablename__ = "parts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    part_number: Mapped[str] = mapped_column(String(128), nullable=False)
    manufacturer: Mapped[str] = mapped_column(String(128), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    datasheet_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    specifications_json: Mapped[dict] = mapped_column("specifications", JSON, nullable=False, default={})
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="parts")
    candidates: Mapped[List["SearchCandidate"]] = relationship("SearchCandidate", back_populates="part")
    offers: Mapped[List["SupplierOffer"]] = relationship("SupplierOffer", back_populates="part")
    saved_by: Mapped[List["SavedPart"]] = relationship("SavedPart", back_populates="part")

    __table_args__ = (
        UniqueConstraint("workspace_id", "part_number", "manufacturer", name="uq_parts_workspace_part_manufacturer"),
        Index("idx_parts_workspace", "workspace_id"),
    )


class PartRequest(Base):
    __tablename__ = "part_requests"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    machine_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("machines.id", ondelete="SET NULL"), nullable=True)
    request_number: Mapped[str] = mapped_column(String(64), nullable=False)
    machine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    part_name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_part_number: Mapped[str] = mapped_column(String(128), nullable=False)
    manufacturer: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    quantity_needed: Mapped[int] = mapped_column(Integer, nullable=False)
    urgency: Mapped[str] = mapped_column(SQLEnum(RequestUrgency), nullable=False)
    acceptable_alternatives: Mapped[bool] = mapped_column(default=True)
    custom_requirements: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(SQLEnum(RequestStatus), nullable=False, default=RequestStatus.DRAFT)
    target_component_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_by: Mapped[str] = mapped_column(UUID_STR, ForeignKey(f"{AUTH_TABLE}.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="requests")
    machine: Mapped[Optional["Machine"]] = relationship("Machine", back_populates="requests")
    notes: Mapped[List["RequestNote"]] = relationship("RequestNote", back_populates="request", cascade="all, delete-orphan")
    quotations: Mapped[List["Quotation"]] = relationship("Quotation", back_populates="part_request", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("workspace_id", "request_number", name="uq_requests_workspace_number"),
        Index("idx_requests_workspace_status", "workspace_id", "status"),
        Index("idx_requests_created_by", "created_by"),
    )


class RequestNote(Base):
    __tablename__ = "request_notes"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), ForeignKey("part_requests.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey(f"{AUTH_TABLE}.id"), nullable=False)
    author_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    request: Mapped["PartRequest"] = relationship("PartRequest", back_populates="notes")


class SearchRecord(Base):
    __tablename__ = "searches"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by: Mapped[str] = mapped_column(UUID_STR, ForeignKey(f"{AUTH_TABLE}.id"), nullable=False, index=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("part_requests.id", ondelete="SET NULL"), nullable=True, index=True)
    machine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    part_name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_part_number: Mapped[str] = mapped_column(String(128), nullable=False)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    requirements_json: Mapped[dict] = mapped_column("requirements", JSON, nullable=False, default={})
    status: Mapped[str] = mapped_column(SQLEnum(SearchStatus), nullable=False, default=SearchStatus.QUEUED)
    stage: Mapped[Optional[str]] = mapped_column(SQLEnum(SearchStage), nullable=True)
    progress_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stage_message: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="searches")
    candidates: Mapped[List["SearchCandidate"]] = relationship("SearchCandidate", back_populates="search", cascade="all, delete-orphan", lazy="selectin")

    __table_args__ = (
        Index("idx_searches_workspace_status", "workspace_id", "status"),
        Index("idx_searches_created_by", "created_by"),
    )


class SearchCandidate(Base):
    __tablename__ = "search_candidates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    search_id: Mapped[str] = mapped_column(String(64), ForeignKey("searches.id"), nullable=False, index=True)
    part_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("parts.id", ondelete="SET NULL"), nullable=True)
    part_number: Mapped[str] = mapped_column(String(128), nullable=False)
    manufacturer: Mapped[str] = mapped_column(String(128), nullable=False)
    compatibility: Mapped[str] = mapped_column(SQLEnum(Compatibility), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    specifications_json: Mapped[dict] = mapped_column("specifications", JSON, nullable=False, default={})
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace")
    search: Mapped["SearchRecord"] = relationship("SearchRecord", back_populates="candidates")
    part: Mapped[Optional["Part"]] = relationship("Part", back_populates="candidates")
    evidence: Mapped[List["CandidateEvidenceRecord"]] = relationship("CandidateEvidenceRecord", back_populates="candidate", cascade="all, delete-orphan", lazy="selectin")

    __table_args__ = (
        Index("idx_candidates_search_score", "search_id", "score"),
    )


class CandidateEvidenceRecord(Base):
    __tablename__ = "candidate_evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    candidate_id: Mapped[str] = mapped_column(String(64), ForeignKey("search_candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    field: Mapped[str] = mapped_column(String(128), nullable=False)
    quote: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str] = mapped_column(String(512), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    verified_by_human: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    candidate: Mapped["SearchCandidate"] = relationship("SearchCandidate", back_populates="evidence")


class SavedPart(Base):
    __tablename__ = "saved_parts"

    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey(f"{AUTH_TABLE}.id", ondelete="CASCADE"), primary_key=True)
    part_id: Mapped[str] = mapped_column(String(64), ForeignKey("parts.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace")
    part: Mapped["Part"] = relationship("Part", back_populates="saved_by")


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    type: Mapped[str] = mapped_column(String(64), nullable=False, default="Specialist Stockist")
    country: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    headquarters: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    inventory_reliability_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    average_fulfillment_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    active_listings_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    verified_partner: Mapped[bool] = mapped_column(default=False)
    contact_disclaimer: Mapped[str] = mapped_column(Text, nullable=False, default="")
    direct_phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    support_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    website_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="suppliers")
    offers: Mapped[List["SupplierOffer"]] = relationship("SupplierOffer", back_populates="supplier", cascade="all, delete-orphan")


class SupplierOffer(Base):
    __tablename__ = "supplier_offers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id: Mapped[str] = mapped_column(String(64), ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, index=True)
    part_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("parts.id", ondelete="SET NULL"), nullable=True)
    part_number: Mapped[str] = mapped_column(String(128), nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(255), nullable=False)
    supplier_domain: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    supplier_type: Mapped[str] = mapped_column(String(64), nullable=False, default="Specialist Stockist")
    location: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    reported_price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    stock_status: Mapped[str] = mapped_column(String(64), nullable=False)
    quantity_available: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    lead_time_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    min_order_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    source_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    last_checked: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    freshness: Mapped[str] = mapped_column(SQLEnum(OfferFreshness), nullable=False, default=OfferFreshness.STALE)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace")
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="offers")
    part: Mapped[Optional["Part"]] = relationship("Part", back_populates="offers")

    __table_args__ = (
        Index("idx_offers_workspace_part", "workspace_id", "part_id"),
        Index("idx_offers_supplier", "supplier_id"),
    )


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    part_request_id: Mapped[str] = mapped_column(String(64), ForeignKey("part_requests.id", ondelete="CASCADE"), nullable=False)
    supplier_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    part_number: Mapped[str] = mapped_column(String(128), nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    total_price: Mapped[float] = mapped_column(Float, nullable=False)
    lead_time_weeks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rfq_number: Mapped[str] = mapped_column(String(64), nullable=False)
    quoted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    terms: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_official: Mapped[bool] = mapped_column(default=False)
    status: Mapped[str] = mapped_column(SQLEnum(QuoteStatus), nullable=False, default=QuoteStatus.PENDING_REVIEW)
    created_by: Mapped[str] = mapped_column(UUID_STR, ForeignKey(f"{AUTH_TABLE}.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="quotations")
    part_request: Mapped["PartRequest"] = relationship("PartRequest", back_populates="quotations")

    __table_args__ = (
        Index("idx_quotes_workspace_status", "workspace_id", "status"),
    )


class SourceDomain(Base):
    __tablename__ = "source_domains"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    enabled: Mapped[bool] = mapped_column(default=True)
    crawl_frequency: Mapped[str] = mapped_column(String(32), nullable=False, default="Daily")
    last_crawl_status: Mapped[str] = mapped_column(String(32), nullable=False, default="Warning")
    last_crawl_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    extracted_products_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="source_domains")


class CollectionJob(Base):
    __tablename__ = "collection_jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    job_name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(SQLEnum(CollectionJobStatus), nullable=False)
    records_extracted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    retries: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="collection_jobs")

    __table_args__ = (
        Index("idx_jobs_workspace_status", "workspace_id", "status"),
    )


class DataQualityIssue(Base):
    __tablename__ = "data_quality_issues"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(UUID_STR, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(SQLEnum(QualitySeverity), nullable=False)
    part_number: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    sources_json: Mapped[list] = mapped_column("sources", JSON, nullable=False, default=[])
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved: Mapped[bool] = mapped_column(default=False)
    resolved_by: Mapped[Optional[str]] = mapped_column(UUID_STR, ForeignKey(f"{AUTH_TABLE}.id", ondelete="SET NULL"), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="quality_issues")

    __table_args__ = (
        Index("idx_quality_workspace_resolved", "workspace_id", "resolved"),
    )