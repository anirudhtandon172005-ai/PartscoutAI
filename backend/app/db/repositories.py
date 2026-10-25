from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import enum
import hashlib
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    SearchRecord,
    SearchCandidate,
    CandidateEvidenceRecord,
    SearchStatus,
    SearchStage,
    Compatibility,
    PartRequest,
    RequestNote,
    Quotation,
    Machine,
    Part,
    Supplier,
    SupplierOffer,
    SourceDomain,
    CollectionJob,
    DataQualityIssue,
    SavedPart,
)
from app.schemas import SearchCreateRequest, CandidateResponse, CandidateEvidence, CandidateOffer


class SearchRepository:
    """Repository for search operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_search(self, search_id: str, request: SearchCreateRequest, user_id: str | None = None, workspace_id: str | None = None) -> SearchRecord:
        """Create a new search record."""
        record = SearchRecord(
            id=search_id,
            workspace_id=workspace_id,
            created_by=user_id,
            machine_name=request.machine_name,
            part_name=request.part_name,
            original_part_number=request.original_part_number,
            manufacturer=request.manufacturer,
            quantity=request.quantity,
            requirements_json=request.requirements.model_dump(),
            status=SearchStatus.QUEUED,
            stage=None,
            progress_percent=0,
            stage_message="Search queued",
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def get_search(self, search_id: str, workspace_id: str | None = None) -> Optional[SearchRecord]:
        """Get a search by ID."""
        filters = [SearchRecord.id == search_id]
        if workspace_id is not None:
            filters.append(SearchRecord.workspace_id == workspace_id)
        result = await self.session.execute(
            select(SearchRecord).where(*filters).options(selectinload(SearchRecord.candidates).selectinload(SearchCandidate.evidence))
        )
        return result.scalar_one_or_none()

    async def count_active_searches(self) -> int:
        result = await self.session.execute(
            select(func.count(SearchRecord.id)).where(
                SearchRecord.status.in_([SearchStatus.QUEUED, SearchStatus.RUNNING])
            )
        )
        return int(result.scalar_one())

    async def update_search_status(
        self,
        search_id: str,
        status: Optional[SearchStatus] = None,
        stage: Optional[SearchStage] = None,
        progress_percent: Optional[int] = None,
        stage_message: Optional[str] = None,
        error: Optional[str] = None,
    ) -> Optional[SearchRecord]:
        """Update search status and stage."""
        record = await self.get_search(search_id)
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

        await self.session.flush()
        return record

    async def save_candidates(
        self,
        search_id: str,
        candidates: List[CandidateResponse],
        workspace_id: str | None = None,
    ) -> List[SearchCandidate]:
        """Save candidates for a search."""
        candidate_ids = [candidate.id for candidate in candidates]
        # Supplier offers are linked to candidates and must be replaced along
        # with them when a search is re-run.
        if candidate_ids:
            await self.session.execute(
                delete(SupplierOffer).where(SupplierOffer.candidate_id.in_(candidate_ids))
            )
        # Delete existing candidates for this search (cascade will handle evidence)
        await self.session.execute(
            delete(SearchCandidate).where(SearchCandidate.search_id == search_id)
        )

        saved_candidates = []
        for candidate in candidates:
            persisted_offers = []
            for offer in candidate.offers:
                supplier_key = f"{offer.supplier_name}|{offer.supplier_domain}".lower().encode()
                persisted_offers.append(offer.model_copy(update={
                    "supplier_id": offer.supplier_id or f"supp-{hashlib.sha1(supplier_key).hexdigest()[:16]}"
                }))
            candidate_record = SearchCandidate(
                id=candidate.id,
                workspace_id=workspace_id,
                search_id=search_id,
                part_number=candidate.part_number,
                manufacturer=candidate.manufacturer,
                compatibility=Compatibility(candidate.compatibility),
                score=candidate.score,
                specifications_json=candidate.specifications,
                offers_json=[offer.model_dump(mode="json") for offer in persisted_offers],
                created_at=datetime.now(timezone.utc),
            )
            self.session.add(candidate_record)
            saved_candidates.append(candidate_record)

            # Save evidence
            for ev in candidate.evidence:
                evidence_record = CandidateEvidenceRecord(
                    workspace_id=workspace_id,
                    candidate_id=candidate.id,
                    field=ev.field,
                    quote=ev.quote,
                    source_url=str(ev.source_url),
                    confidence=ev.confidence,
                    retrieved_at=ev.retrieved_at,
                    created_at=datetime.now(timezone.utc),
                )
                self.session.add(evidence_record)

            # Persist only procurement-ready listings. The candidate JSON
            # still retains partial source observations, but supplier tables
            # must never contain fabricated zero/default values.
            for offer_index, offer in enumerate(persisted_offers):
                if (
                    offer.reported_price is None
                    or not offer.currency
                    or not offer.stock_status
                    or offer.lead_time_days is None
                    or offer.min_order_quantity is None
                    or not offer.evidence_quote
                    or offer.confidence is None
                ):
                    continue
                supplier_key = f"{offer.supplier_name}|{offer.supplier_domain}".lower().encode()
                supplier_id = offer.supplier_id or f"supp-{hashlib.sha1(supplier_key).hexdigest()[:16]}"
                supplier = await self.session.get(Supplier, supplier_id)
                if supplier is None:
                    supplier = Supplier(
                        id=supplier_id,
                        workspace_id=workspace_id,
                        name=offer.supplier_name,
                        domain=offer.supplier_domain,
                        type=offer.supplier_type,
                        direct_phone=offer.contact_phone,
                        support_email=offer.contact_email,
                        website_url=str(offer.product_url or offer.source_url),
                        contact_disclaimer="Contact details and availability are source observations; confirm directly before procurement.",
                    )
                    self.session.add(supplier)

                self.session.add(SupplierOffer(
                    id=f"offer-{candidate.id}-{offer_index}",
                    workspace_id=workspace_id,
                    supplier_id=supplier_id,
                    candidate_id=candidate.id,
                    part_id=None,
                    part_number=candidate.part_number,
                    supplier_name=offer.supplier_name,
                    supplier_domain=offer.supplier_domain,
                    supplier_type=offer.supplier_type,
                    location=offer.location,
                    reported_price=offer.reported_price,
                    currency=offer.currency,
                    stock_status=offer.stock_status,
                    quantity_available=offer.quantity_available,
                    lead_time_days=offer.lead_time_days,
                    min_order_quantity=offer.min_order_quantity,
                    source_url=str(offer.source_url),
                    last_checked=offer.last_checked,
                    freshness=offer.freshness,
                    notes=offer.notes,
                ))
                self.session.add(CandidateEvidenceRecord(
                    workspace_id=workspace_id,
                    candidate_id=candidate.id,
                    field="supplier_offer",
                    quote=offer.evidence_quote,
                    source_url=str(offer.source_url),
                    confidence=offer.confidence,
                    retrieved_at=offer.last_checked,
                    created_at=datetime.now(timezone.utc),
                ))

        await self.session.flush()
        return saved_candidates

    async def get_candidates(self, search_id: str, workspace_id: str | None = None) -> List[SearchCandidate]:
        """Get all candidates for a search with their evidence."""
        filters = [SearchCandidate.search_id == search_id]
        if workspace_id is not None:
            filters.append(SearchCandidate.workspace_id == workspace_id)
        result = await self.session.execute(
            select(SearchCandidate)
            .where(*filters)
            .options(selectinload(SearchCandidate.evidence))
            .order_by(SearchCandidate.score.desc())
        )
        return list(result.scalars().all())

    async def get_candidate(self, candidate_id: str) -> Optional[SearchCandidate]:
        """Get a single candidate by ID."""
        result = await self.session.execute(
            select(SearchCandidate).where(SearchCandidate.id == candidate_id)
        )
        return result.scalar_one_or_none()

    async def get_candidate_with_evidence(self, candidate_id: str) -> Optional[SearchCandidate]:
        """Get a candidate with its evidence loaded."""
        result = await self.session.execute(
            select(SearchCandidate)
            .options(selectinload(SearchCandidate.evidence))
            .where(SearchCandidate.id == candidate_id)
        )
        return result.scalar_one_or_none()


class WorkspaceRepository:
    """Repository for workspace-scoped operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # Machine operations
    async def get_machines(self, workspace_id: str) -> List[Machine]:
        result = await self.session.execute(
            select(Machine).where(Machine.workspace_id == workspace_id).order_by(Machine.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_machine(self, machine: Machine) -> Machine:
        self.session.add(machine)
        await self.session.flush()
        return machine

    async def update_machine(self, machine_id: str, workspace_id: str, data: dict) -> Optional[Machine]:
        result = await self.session.execute(
            select(Machine).where(Machine.id == machine_id, Machine.workspace_id == workspace_id)
        )
        machine = result.scalar_one_or_none()
        if not machine:
            return None
        for key, value in data.items():
            setattr(machine, key, value)
        machine.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return machine

    async def delete_machine(self, machine_id: str, workspace_id: str) -> bool:
        result = await self.session.execute(
            delete(Machine).where(Machine.id == machine_id, Machine.workspace_id == workspace_id)
        )
        return result.rowcount > 0

    # Part operations
    async def get_parts(self, workspace_id: str) -> List[Part]:
        result = await self.session.execute(
            select(Part).where(Part.workspace_id == workspace_id).order_by(Part.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_part(self, part: Part) -> Part:
        self.session.add(part)
        await self.session.flush()
        return part

    async def update_part(self, part_id: str, workspace_id: str, data: dict) -> Optional[Part]:
        result = await self.session.execute(
            select(Part).where(Part.id == part_id, Part.workspace_id == workspace_id)
        )
        part = result.scalar_one_or_none()
        if not part:
            return None
        for key, value in data.items():
            setattr(part, key, value)
        part.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return part

    # Part Request operations
    async def get_requests(self, workspace_id: str) -> List[PartRequest]:
        result = await self.session.execute(
            select(PartRequest)
            .where(PartRequest.workspace_id == workspace_id)
            .options(selectinload(PartRequest.notes))
            .order_by(PartRequest.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_request(self, request_id: str, workspace_id: str) -> Optional[PartRequest]:
        result = await self.session.execute(
            select(PartRequest)
            .where(PartRequest.id == request_id, PartRequest.workspace_id == workspace_id)
            .options(selectinload(PartRequest.notes))
        )
        return result.scalar_one_or_none()

    async def create_request(self, request: PartRequest) -> PartRequest:
        self.session.add(request)
        await self.session.flush()
        return request

    async def update_request(self, request_id: str, workspace_id: str, data: dict) -> Optional[PartRequest]:
        result = await self.session.execute(
            select(PartRequest).where(PartRequest.id == request_id, PartRequest.workspace_id == workspace_id)
        )
        request = result.scalar_one_or_none()
        if not request:
            return None
        for key, value in data.items():
            setattr(request, key, value)
        request.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return request

    async def add_request_note(self, note: RequestNote) -> RequestNote:
        self.session.add(note)
        await self.session.flush()
        return note

    # Supplier operations
    async def get_suppliers(self, workspace_id: str) -> List[Supplier]:
        result = await self.session.execute(
            select(Supplier).where(Supplier.workspace_id == workspace_id).order_by(Supplier.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_supplier(self, supplier: Supplier) -> Supplier:
        self.session.add(supplier)
        await self.session.flush()
        return supplier

    # Supplier Offer operations
    async def get_offers(self, workspace_id: str) -> List[SupplierOffer]:
        result = await self.session.execute(
            select(SupplierOffer).where(SupplierOffer.workspace_id == workspace_id).order_by(SupplierOffer.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_offer(self, offer: SupplierOffer) -> SupplierOffer:
        self.session.add(offer)
        await self.session.flush()
        return offer

    # Quotation operations
    async def get_quotations(self, workspace_id: str) -> List[Quotation]:
        result = await self.session.execute(
            select(Quotation).where(Quotation.workspace_id == workspace_id).order_by(Quotation.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_quotation(self, quotation: Quotation) -> Quotation:
        self.session.add(quotation)
        await self.session.flush()
        return quotation

    async def update_quotation(self, quotation_id: str, workspace_id: str, data: dict) -> Optional[Quotation]:
        result = await self.session.execute(
            select(Quotation).where(Quotation.id == quotation_id, Quotation.workspace_id == workspace_id)
        )
        quotation = result.scalar_one_or_none()
        if not quotation:
            return None
        for key, value in data.items():
            setattr(quotation, key, value)
        quotation.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return quotation

    # Source Domain operations
    async def get_source_domains(self, workspace_id: str) -> List[SourceDomain]:
        result = await self.session.execute(
            select(SourceDomain).where(SourceDomain.workspace_id == workspace_id).order_by(SourceDomain.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_source_domain(self, domain: SourceDomain) -> SourceDomain:
        self.session.add(domain)
        await self.session.flush()
        return domain

    async def update_source_domain(self, domain_id: str, workspace_id: str, data: dict) -> Optional[SourceDomain]:
        result = await self.session.execute(
            select(SourceDomain).where(SourceDomain.id == domain_id, SourceDomain.workspace_id == workspace_id)
        )
        domain = result.scalar_one_or_none()
        if not domain:
            return None
        for key, value in data.items():
            setattr(domain, key, value)
        domain.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return domain

    # Collection Job operations
    async def get_collection_jobs(self, workspace_id: str) -> List[CollectionJob]:
        result = await self.session.execute(
            select(CollectionJob).where(CollectionJob.workspace_id == workspace_id).order_by(CollectionJob.created_at.desc())
        )
        return list(result.scalars().all())

    # Data Quality Issue operations
    async def get_quality_issues(self, workspace_id: str) -> List[DataQualityIssue]:
        result = await self.session.execute(
            select(DataQualityIssue).where(DataQualityIssue.workspace_id == workspace_id).order_by(DataQualityIssue.detected_at.desc())
        )
        return list(result.scalars().all())

    async def resolve_quality_issue(self, issue_id: str, workspace_id: str, user_id: str) -> Optional[DataQualityIssue]:
        result = await self.session.execute(
            select(DataQualityIssue).where(DataQualityIssue.id == issue_id, DataQualityIssue.workspace_id == workspace_id)
        )
        issue = result.scalar_one_or_none()
        if not issue:
            return None
        issue.resolved = True
        issue.resolved_by = user_id
        issue.resolved_at = datetime.now(timezone.utc)
        await self.session.flush()
        return issue

    # Saved Parts operations
    async def get_saved_parts(self, workspace_id: str, user_id: str) -> List[SavedPart]:
        result = await self.session.execute(
            select(SavedPart).where(SavedPart.workspace_id == workspace_id, SavedPart.user_id == user_id)
        )
        return list(result.scalars().all())

    async def toggle_saved_part(self, workspace_id: str, user_id: str, part_id: str, saved: bool) -> bool:
        if saved:
            saved_part = SavedPart(workspace_id=workspace_id, user_id=user_id, part_id=part_id)
            self.session.add(saved_part)
        else:
            await self.session.execute(
                delete(SavedPart).where(SavedPart.workspace_id == workspace_id, SavedPart.user_id == user_id, SavedPart.part_id == part_id)
            )
        await self.session.flush()
        return saved


def search_record_to_schema(record: SearchRecord) -> Dict[str, Any]:
    """Convert SearchRecord to schema-compatible dict."""
    return {
        "id": record.id,
        "status": record.status.value if isinstance(record.status, enum.Enum) else record.status,
        "stage": record.stage.value if isinstance(record.stage, enum.Enum) else record.stage,
        "progress_percent": record.progress_percent,
        "stage_message": record.stage_message,
        "request": {
            "machine_name": record.machine_name,
            "part_name": record.part_name,
            "original_part_number": record.original_part_number,
            "manufacturer": record.manufacturer,
            "quantity": record.quantity,
            "requirements": record.requirements_json,
        },
        "candidate_count": len(record.candidates),
        "created_at": record.created_at.isoformat() if record.created_at else "",
        "completed_at": record.completed_at.isoformat() if record.completed_at else None,
        "error": record.error,
    }


def search_candidate_to_schema(candidate: SearchCandidate) -> CandidateResponse:
    """Convert SearchCandidate to CandidateResponse schema."""
    evidence_list = [
        CandidateEvidence(
            field=ev.field,
            quote=ev.quote,
            source_url=ev.source_url,
            confidence=ev.confidence,
            retrieved_at=ev.retrieved_at,
        )
        for ev in candidate.evidence
    ]

    return CandidateResponse(
        id=candidate.id,
        part_number=candidate.part_number,
        manufacturer=candidate.manufacturer,
        compatibility=candidate.compatibility.value if isinstance(candidate.compatibility, enum.Enum) else candidate.compatibility,
        score=candidate.score,
        specifications=candidate.specifications_json,
        evidence=evidence_list,
        offers=[CandidateOffer.model_validate(offer) for offer in (candidate.offers_json or [])],
    )
