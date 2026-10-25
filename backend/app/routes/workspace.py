from datetime import date, datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Body, HTTPException, status, Query
from sqlalchemy import select, text

from app.auth import CurrentUserDependency, get_workspace_id, get_user_workspaces
from app.config import settings
from app.db import get_db_session, WorkspaceRepository
from app.db.models import (
    Machine, Part, PartRequest, RequestNote, Supplier, SupplierOffer,
    Quotation, SourceDomain, CollectionJob, DataQualityIssue, SavedPart
)
from app.schemas import MeResponse, WorkspaceSummary, WorkspaceRequestCreate

router = APIRouter(prefix="/api/v1", tags=["workspace"])


def _json_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _model_to_dict(model) -> dict[str, Any]:
    """Convert SQLAlchemy model to dict with JSON-serializable values."""
    return {key: _json_value(value) for key, value in model.__dict__.items() if not key.startswith('_')}


def _row_to_dict(row) -> dict[str, Any]:
    """Convert SQLAlchemy row to dict with JSON-serializable values."""
    return {key: _json_value(value) for key, value in row._mapping.items()}


@router.get("/me", response_model=MeResponse)
async def get_me(user: CurrentUserDependency) -> MeResponse:
    """Get current user profile and workspaces."""
    if settings.database_provider.lower() == "sqlite":
        return MeResponse(
            id=user.id,
            email=user.email,
            full_name="Local Demo User",
            facility="Local Demo Plant",
            workspaces=[WorkspaceSummary(id="00000000-0000-0000-0000-000000000002", name="Local Demo Workspace", facility="Local Demo Plant", role="owner")],
        )

    async with get_db_session() as session:
        from app.db.models import Profile
        profile = (await session.execute(
            select(Profile).where(Profile.id == user.id)
        )).scalar_one_or_none()
        workspaces = await get_user_workspaces(user)

    return MeResponse(
        id=user.id,
        email=user.email,
        full_name=profile.full_name if profile else user.metadata.get("full_name", ""),
        facility=profile.facility if profile else user.metadata.get("facility", ""),
        workspaces=[WorkspaceSummary(**ws) for ws in workspaces],
    )


@router.get("/workspace/bootstrap")
async def get_workspace_bootstrap(user: CurrentUserDependency) -> dict[str, Any]:
    """Bootstrap workspace data for the frontend."""
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)

        machines = await repo.get_machines(workspace_id)
        parts = await repo.get_parts(workspace_id)
        requests = await repo.get_requests(workspace_id)
        suppliers = await repo.get_suppliers(workspace_id)
        offers = await repo.get_offers(workspace_id)
        quotations = await repo.get_quotations(workspace_id)
        source_domains = await repo.get_source_domains(workspace_id)
        collection_jobs = await repo.get_collection_jobs(workspace_id)
        quality_issues = await repo.get_quality_issues(workspace_id)
        saved_parts = await repo.get_saved_parts(workspace_id, user.id)

    return {
        "machines": [_model_to_dict(m) for m in machines],
        "parts": [_model_to_dict(p) for p in parts],
        "requests": [_model_to_dict(r) for r in requests],
        "suppliers": [_model_to_dict(s) for s in suppliers],
        "offers": [_model_to_dict(o) for o in offers],
        "quotations": [_model_to_dict(q) for q in quotations],
        "source_domains": [_model_to_dict(d) for d in source_domains],
        "collection_jobs": [_model_to_dict(j) for j in collection_jobs],
        "quality_issues": [_model_to_dict(i) for i in quality_issues],
        "saved_part_ids": [sp.part_id for sp in saved_parts],
    }


# Machine endpoints
@router.post("/workspace/machines", status_code=status.HTTP_201_CREATED)
async def create_machine(user: CurrentUserDependency, body: dict[str, Any] = Body(...)) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)
    machine_id = body.get("id", f"mach-{uuid4().hex[:12]}")

    machine = Machine(
        id=machine_id,
        workspace_id=workspace_id,
        manufacturer=body["manufacturer"],
        model=body["model"],
        machine_type=body.get("machine_type", ""),
        facility=body.get("facility", ""),
        production_line=body.get("production_line", ""),
        commission_year=body.get("commission_year"),
        criticality=body.get("criticality", "Medium"),
        notes=body.get("notes", ""),
    )

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        await repo.create_machine(machine)

    return _model_to_dict(machine)


@router.patch("/workspace/machines/{machine_id}")
async def update_machine(machine_id: str, user: CurrentUserDependency, body: dict[str, Any] = Body(...)) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        machine = await repo.update_machine(machine_id, workspace_id, body)

    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")

    return _model_to_dict(machine)


@router.delete("/workspace/machines/{machine_id}")
async def delete_machine(machine_id: str, user: CurrentUserDependency):
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        deleted = await repo.delete_machine(machine_id, workspace_id)

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")

    return {"deleted": True}


# Part Request endpoints
@router.get("/workspace/requests")
async def get_requests(user: CurrentUserDependency):
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        requests = await repo.get_requests(workspace_id)

    return [_model_to_dict(r) for r in requests]


@router.post("/workspace/requests", status_code=status.HTTP_201_CREATED)
async def create_request(user: CurrentUserDependency, body: WorkspaceRequestCreate) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)
    values = body.model_dump()
    request_id = str(values.get("id") or f"req-{uuid4().hex[:12]}")

    request = PartRequest(
        id=request_id,
        workspace_id=workspace_id,
        machine_id=values.get("machine_id"),
        request_number=values.get("request_number") or f"REQ-{uuid4().hex[:8].upper()}",
        machine_name=values["machine_name"],
        part_name=values["part_name"],
        original_part_number=values["original_part_number"],
        manufacturer=values["manufacturer"],
        quantity_needed=values["quantity_needed"],
        urgency=values["urgency"],
        acceptable_alternatives=values["acceptable_alternatives"],
        custom_requirements=values["custom_requirements"],
        status=values["status"],
        target_component_id=values["target_component_id"],
        created_by=user.id,
    )

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        await repo.create_request(request)

    return _model_to_dict(request)


@router.patch("/workspace/requests/{request_id}/status")
async def update_request_status(request_id: str, user: CurrentUserDependency, body: dict[str, str] = Body(...)) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        request = await repo.update_request(request_id, workspace_id, {"status": body.get("status")})

    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    return _model_to_dict(request)


@router.post("/workspace/requests/{request_id}/notes", status_code=status.HTTP_201_CREATED)
async def add_request_note(request_id: str, user: CurrentUserDependency, body: dict[str, str] = Body(...)) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        request = await repo.get_request(request_id, workspace_id)
        if not request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

        note = RequestNote(
            workspace_id=workspace_id,
            request_id=request_id,
            author_id=user.id,
            author_name=user.metadata.get("full_name", user.email or "User"),
            text=body.get("text", "").strip(),
        )
        note = await repo.add_request_note(note)

    return _model_to_dict(note)


# Saved Parts endpoints
@router.put("/workspace/saved-parts/{part_id}")
async def set_saved_part(part_id: str, user: CurrentUserDependency, body: dict[str, bool] = Body(...)) -> dict[str, bool]:
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        await repo.toggle_saved_part(workspace_id, user.id, part_id, body.get("saved", False))

    return {"saved": bool(body.get("saved", False))}


# Quotation endpoints
@router.get("/workspace/quotations")
async def get_quotations(user: CurrentUserDependency):
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        quotations = await repo.get_quotations(workspace_id)

    return [_model_to_dict(q) for q in quotations]


@router.post("/workspace/quotations", status_code=status.HTTP_201_CREATED)
async def create_quotation(user: CurrentUserDependency, body: dict[str, Any] = Body(...)) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)

    quotation = Quotation(
        id=body.get("id", f"quote-{uuid4().hex[:12]}"),
        workspace_id=workspace_id,
        part_request_id=body["part_request_id"],
        supplier_id=body.get("supplier_id"),
        part_number=body["part_number"],
        supplier_name=body["supplier_name"],
        unit_price=body["unit_price"],
        currency=body.get("currency", "USD"),
        quantity=body["quantity"],
        total_price=body["total_price"],
        lead_time_weeks=body.get("lead_time_weeks", 0),
        rfq_number=body["rfq_number"],
        valid_until=body.get("valid_until"),
        terms=body.get("terms", ""),
        is_official=body.get("is_official", False),
        status=body.get("status", "Pending Review"),
        created_by=user.id,
    )

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        await repo.create_quotation(quotation)

    return _model_to_dict(quotation)


@router.patch("/workspace/quotations/{quotation_id}/status")
async def update_quotation_status(quotation_id: str, user: CurrentUserDependency, body: dict[str, str] = Body(...)) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        quotation = await repo.update_quotation(quotation_id, workspace_id, {"status": body.get("status")})

    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")

    return _model_to_dict(quotation)


# Source Domain endpoints
@router.get("/workspace/source-domains")
async def get_source_domains(user: CurrentUserDependency):
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        domains = await repo.get_source_domains(workspace_id)

    return [_model_to_dict(d) for d in domains]


@router.post("/workspace/source-domains", status_code=status.HTTP_201_CREATED)
async def create_source_domain(user: CurrentUserDependency, body: dict[str, Any] = Body(...)) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)

    domain = SourceDomain(
        id=body.get("id", f"dom-{uuid4().hex[:12]}"),
        workspace_id=workspace_id,
        name=body["name"],
        domain=body["domain"],
        category=body["category"],
        enabled=body.get("enabled", True),
        crawl_frequency=body.get("crawl_frequency", "Daily"),
        notes=body.get("notes", ""),
    )

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        await repo.create_source_domain(domain)

    return _model_to_dict(domain)


@router.patch("/workspace/source-domains/{domain_id}")
async def update_source_domain(domain_id: str, user: CurrentUserDependency, body: dict[str, Any] = Body(...)) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        domain = await repo.update_source_domain(domain_id, workspace_id, body)

    if not domain:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source domain not found")

    return _model_to_dict(domain)


# Collection Job endpoints
@router.get("/workspace/collection-jobs")
async def get_collection_jobs(user: CurrentUserDependency):
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        jobs = await repo.get_collection_jobs(workspace_id)

    return [_model_to_dict(j) for j in jobs]


# Data Quality Issue endpoints
@router.get("/workspace/quality-issues")
async def get_quality_issues(user: CurrentUserDependency):
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        issues = await repo.get_quality_issues(workspace_id)

    return [_model_to_dict(i) for i in issues]


@router.patch("/workspace/quality-issues/{issue_id}/resolve")
async def resolve_quality_issue(issue_id: str, user: CurrentUserDependency) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        issue = await repo.resolve_quality_issue(issue_id, workspace_id, user.id)

    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quality issue not found")

    return _model_to_dict(issue)


# Supplier endpoints
@router.get("/workspace/suppliers")
async def get_suppliers(user: CurrentUserDependency):
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        suppliers = await repo.get_suppliers(workspace_id)

    return [_model_to_dict(s) for s in suppliers]


@router.post("/workspace/suppliers", status_code=status.HTTP_201_CREATED)
async def create_supplier(user: CurrentUserDependency, body: dict[str, Any] = Body(...)) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)

    supplier = Supplier(
        id=body.get("id", f"supp-{uuid4().hex[:12]}"),
        workspace_id=workspace_id,
        name=body["name"],
        domain=body.get("domain", ""),
        type=body.get("type", "Specialist Stockist"),
        country=body.get("country", ""),
        headquarters=body.get("headquarters", ""),
        inventory_reliability_score=body.get("inventory_reliability_score"),
        average_fulfillment_days=body.get("average_fulfillment_days"),
        active_listings_count=body.get("active_listings_count", 0),
        verified_partner=body.get("verified_partner", False),
        contact_disclaimer=body.get("contact_disclaimer", ""),
        direct_phone=body.get("direct_phone"),
        support_email=body.get("support_email"),
        website_url=body.get("website_url", ""),
        description=body.get("description", ""),
    )

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        await repo.create_supplier(supplier)

    return _model_to_dict(supplier)


# Supplier Offer endpoints
@router.get("/workspace/offers")
async def get_offers(user: CurrentUserDependency):
    workspace_id = await get_workspace_id(user)

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        offers = await repo.get_offers(workspace_id)

    return [_model_to_dict(o) for o in offers]


@router.post("/workspace/offers", status_code=status.HTTP_201_CREATED)
async def create_offer(user: CurrentUserDependency, body: dict[str, Any] = Body(...)) -> dict[str, Any]:
    workspace_id = await get_workspace_id(user)

    offer = SupplierOffer(
        id=body.get("id", f"off-{uuid4().hex[:12]}"),
        workspace_id=workspace_id,
        supplier_id=body["supplier_id"],
        part_id=body.get("part_id"),
        part_number=body["part_number"],
        supplier_name=body["supplier_name"],
        supplier_domain=body.get("supplier_domain", ""),
        supplier_type=body.get("supplier_type", "Specialist Stockist"),
        location=body.get("location", ""),
        reported_price=body["reported_price"],
        currency=body.get("currency", "USD"),
        stock_status=body["stock_status"],
        quantity_available=body.get("quantity_available"),
        lead_time_days=body.get("lead_time_days", 0),
        min_order_quantity=body.get("min_order_quantity", 1),
        source_url=body.get("source_url", ""),
        last_checked=body.get("last_checked"),
        freshness=body.get("freshness", "stale"),
        notes=body.get("notes"),
    )

    async with get_db_session() as session:
        repo = WorkspaceRepository(session)
        await repo.create_offer(offer)

    return _model_to_dict(offer)
