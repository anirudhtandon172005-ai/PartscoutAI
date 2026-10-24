#!/usr/bin/env python3
"""
Seed script to populate Supabase/PostgreSQL with initial demo data.
Run this after applying the migration to set up demo workspaces.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.config import settings
from app.db.models import (
    Base,
    Profile,
    Workspace,
    WorkspaceMember,
    Machine,
    Part,
    PartRequest,
    RequestNote,
    Supplier,
    SupplierOffer,
    Quotation,
    SourceDomain,
    CollectionJob,
    DataQualityIssue,
    SavedPart,
    UserRole,
    WorkspaceRole,
    RequestStatus,
    RequestUrgency,
    MachineCriticality,
    QuoteStatus,
    OfferFreshness,
    CollectionJobStatus,
    QualitySeverity,
)


async def seed_data():
    """Seed the database with demo data."""
    if settings.database_provider.lower() == "sqlite":
        print("Skipping seed for SQLite - using local demo data")
        return

    if not settings.database_url:
        print("DATABASE_URL not set, skipping seed")
        return

    DATABASE_URL = settings.database_url.replace("postgres://", "postgresql+asyncpg://", 1).replace("postgresql://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        try:
            # Check if data already exists
            result = await session.execute(text("SELECT COUNT(*) FROM public.workspaces"))
            count = result.scalar()
            if count > 0:
                print("Database already seeded, skipping...")
                return

            print("Seeding database with demo data...")

            # Create demo user profile (this would normally come from auth trigger)
            demo_user_id = "00000000-0000-0000-0000-000000000001"
            demo_user_email = "demo@partscout.test"

            # Create workspace
            workspace_id = "00000000-0000-0000-0000-000000000002"
            workspace = Workspace(
                id=workspace_id,
                name="Apex PackWorks - Main Plant",
                facility="Apex PackWorks - Main Plant (Facility B4)",
                owner_id=demo_user_id,
            )
            session.add(workspace)

            # Create workspace member
            member = WorkspaceMember(
                workspace_id=workspace_id,
                user_id=demo_user_id,
                role=WorkspaceRole.OWNER,
            )
            session.add(member)

            # Create profile
            profile = Profile(
                id=demo_user_id,
                email=demo_user_email,
                full_name="Marcus Vance",
                facility="Apex PackWorks - Main Plant (Facility B4)",
                role=UserRole.ENGINEER,
            )
            session.add(profile)

            # Create machines
            machines = [
                Machine(
                    id="mach-rf480-line4",
                    workspace_id=workspace_id,
                    manufacturer="Krones AG",
                    model="Rotary Filler RF-480 HighSpeed",
                    machine_type="Beverage Bottling & Capping Carousel",
                    facility="Apex PackWorks - Main Plant (Building B)",
                    production_line="High-Velocity Bottling Line 4",
                    commission_year=2018,
                    criticality=MachineCriticality.HIGH,
                    notes="Downstream capper proximity station. Subject to high-pressure washdown (CIP 65°C caustic solutions).",
                ),
                Machine(
                    id="mach-kuka-cell2",
                    workspace_id=workspace_id,
                    manufacturer="KUKA Robotics",
                    model="KR 16 R2010 Cybertech",
                    machine_type="6-Axis Articulated Robot Arm",
                    facility="Apex PackWorks - Assembly Wing",
                    production_line="Robotic Case Packing Cell 2",
                    commission_year=2021,
                    criticality=MachineCriticality.MEDIUM,
                    notes="End-of-arm tooling vacuum gripper manifold.",
                ),
                Machine(
                    id="mach-hydra-ext1",
                    workspace_id=workspace_id,
                    manufacturer="Battenfeld-Cincinnati",
                    model="solEX 75-40 Extruder",
                    machine_type="Single-Screw High Output Extrusion",
                    facility="Apex PackWorks - Polymer Processing",
                    production_line="Profile Extrusion Line 1",
                    commission_year=2016,
                    criticality=MachineCriticality.HIGH,
                    notes="Barrel temperature zone 3 thermocouple & melt pressure safety interlock.",
                ),
            ]
            session.add_all(machines)

            # Create parts
            parts = [
                Part(
                    id="part-balluff-bes516",
                    workspace_id=workspace_id,
                    part_number="BES 516-325-G-E5-C-S4",
                    manufacturer="Balluff GmbH",
                    name="M18 Shielded Inductive Proximity Sensor",
                    category="Inductive Sensors / Automation Presence Detection",
                    description="M18x1 cylindrical flush-mount proximity switch with PNP Normally Open switching output, 8mm operating distance, and 4-pin M12 standard connector.",
                    datasheet_url="https://example.com/datasheets/balluff-bes516.pdf",
                    specifications={
                        "sensing_distance_mm": 8.0,
                        "installation_type": "flush",
                        "thread_size": "M18 x 1.0",
                        "housing_length_mm": 65,
                        "threaded_length_mm": 45,
                        "output": "PNP NO",
                        "operating_voltage": "10-30 V DC",
                        "switching_frequency_hz": 500,
                        "housing_material": "Nickel-Plated Brass",
                        "sensing_face_material": "PBT",
                        "ip_rating": "IP67/IP68",
                        "connector": "M12 4-pin",
                        "temperature_range": "-25 to +70 C",
                    },
                ),
                Part(
                    id="part-ifm-igt205",
                    workspace_id=workspace_id,
                    part_number="IGT205",
                    manufacturer="ifm efector",
                    name="M18 Flush Inductive Sensor (Full Stainless)",
                    category="Inductive Proximity / Food & Wet Area Industrial",
                    description="High-grade stainless steel M18 inductive proximity sensor with gold-plated 4-pin M12 connector. Designed for harsh washdown and mechanical shock resistance.",
                    datasheet_url="https://example.com/datasheets/ifm-igt205.pdf",
                    specifications={
                        "sensing_distance_mm": 8.0,
                        "installation_type": "flush",
                        "thread_size": "M18 x 1.0",
                        "housing_length_mm": 70,
                        "threaded_length_mm": 48,
                        "output": "PNP NO",
                        "operating_voltage": "10-36 V DC",
                        "switching_frequency_hz": 400,
                        "housing_material": "316L Stainless Steel",
                        "sensing_face_material": "PEEK",
                        "ip_rating": "IP68/IP69K",
                        "connector": "M12 4-pin gold-plated",
                        "temperature_range": "-40 to +85 C",
                    },
                ),
            ]
            session.add_all(parts)

            # Create part request
            request = PartRequest(
                id="req-2026-line4-sensor",
                workspace_id=workspace_id,
                machine_id="mach-rf480-line4",
                request_number="REQ-2026-0891",
                machine_name="Krones Rotary Filler RF-480 (Line 4)",
                part_name="M18 Shielded Inductive Proximity Sensor",
                original_part_number="BES 516-325-G-E5-C-S4",
                manufacturer="Balluff GmbH",
                quantity_needed=2,
                urgency=RequestUrgency.LINE_DOWN,
                acceptable_alternatives=True,
                custom_requirements="Must be flush mount M18 with 8mm sensing range and PNP NO output. Stainless housing preferred due to daily washdown.",
                status=RequestStatus.CANDIDATES_FOUND,
                target_component_id="part-balluff-bes516",
                created_by=demo_user_id,
            )
            session.add(request)

            # Create request note
            note = RequestNote(
                workspace_id=workspace_id,
                request_id="req-2026-line4-sensor",
                author_id=demo_user_id,
                author_name="Marcus Vance (Lead Maintenance Tech)",
                text="Sensor failed during morning sanitization cycle on Capper Station 3. Line running at reduced 60% capacity.",
            )
            session.add(note)

            # Create suppliers
            suppliers = [
                Supplier(
                    id="supp-mcmaster",
                    workspace_id=None,  # Global supplier
                    name="McMaster-Carr Supply Company",
                    domain="mcmaster.com",
                    type="Authorized Distributor",
                    country="United States",
                    headquarters="Elmhurst, Illinois",
                    inventory_reliability_score=99.4,
                    average_fulfillment_days=1,
                    active_listings_count=580000,
                    verified_partner=True,
                    contact_disclaimer="Illustrative directory entry. Contact information represents publicly known supplier headquarters; PartScout does not verify live representative availability.",
                    direct_phone="+1 (630) 833-0300 (Public Directory)",
                    support_email="orders@mcmaster.com (Public Directory)",
                    website_url="https://www.mcmaster.com",
                    description="Premier North American supplier of industrial maintenance, repair, and operations (MRO) hardware with same-day order processing and extensive CAD library integration.",
                ),
                Supplier(
                    id="supp-radwell",
                    workspace_id=None,
                    name="Radwell International LLC",
                    domain="radwell.com",
                    type="Specialist Stockist",
                    country="United States & Europe",
                    headquarters="Willingboro, New Jersey",
                    inventory_reliability_score=94.8,
                    average_fulfillment_days=2,
                    active_listings_count=2200000,
                    verified_partner=True,
                    contact_disclaimer="Illustrative directory entry. Surplus and factory sealed inventory states change frequently. Contact sales directly to reserve specific lot serials.",
                    direct_phone="+1 (800) 884-5500 (Public Directory)",
                    support_email="sales@radwell.com (Public Directory)",
                    website_url="https://www.radwell.com",
                    description="Global specialist in surplus, refurbished, and obsolete factory automation parts, PLCs, drives, sensors, and servo motors with in-house testing labs.",
                ),
            ]
            session.add_all(suppliers)

            # Create supplier offers
            offers = [
                SupplierOffer(
                    id="off-ifm-mcmaster",
                    workspace_id=workspace_id,
                    supplier_id="supp-mcmaster",
                    part_id="part-ifm-igt205",
                    part_number="IGT205",
                    supplier_name="McMaster-Carr",
                    supplier_domain="mcmaster.com",
                    supplier_type="Authorized Distributor",
                    location="Elmhurst, IL, USA",
                    reported_price=108.40,
                    currency="USD",
                    stock_status="In Stock",
                    quantity_available=14,
                    lead_time_days=1,
                    min_order_quantity=1,
                    source_url="https://mcmaster.com/search?q=IGT205",
                    last_checked=datetime.now(timezone.utc),
                    freshness=OfferFreshness.FRESH,
                    notes="Guaranteed same-day courier dispatch for orders placed before 4:00 PM CST.",
                ),
            ]
            session.add_all(offers)

            # Create quotation
            quotation = Quotation(
                id="quote-rfq-101",
                workspace_id=workspace_id,
                part_request_id="req-2026-line4-sensor",
                supplier_id="supp-mcmaster",
                part_number="IGT205 (ifm efector)",
                supplier_name="McMaster-Carr",
                unit_price=108.40,
                currency="USD",
                quantity=2,
                total_price=216.80,
                lead_time_weeks=0,
                rfq_number="RFQ-2026-4018",
                quoted_at=datetime.now(timezone.utc),
                valid_until=datetime(2026, 11, 24, tzinfo=timezone.utc),
                terms="Net 30. Ground or Next-Day Air freight available.",
                is_official=True,
                status=QuoteStatus.PENDING_REVIEW,
                created_by=demo_user_id,
            )
            session.add(quotation)

            # Create source domains
            domains = [
                SourceDomain(
                    id="dom-1",
                    workspace_id=workspace_id,
                    name="Balluff Global Portal",
                    domain="balluff.com",
                    category="Manufacturer Portal",
                    enabled=True,
                    crawl_frequency="Daily",
                    last_crawl_status="Success",
                    last_crawl_time=datetime.now(timezone.utc),
                    extracted_products_count=14200,
                    notes="Official XML catalog sitemap endpoint indexed.",
                ),
                SourceDomain(
                    id="dom-2",
                    workspace_id=workspace_id,
                    name="ifm Electronic Catalog",
                    domain="ifm.com",
                    category="Manufacturer Portal",
                    enabled=True,
                    crawl_frequency="Daily",
                    last_crawl_status="Success",
                    last_crawl_time=datetime.now(timezone.utc),
                    extracted_products_count=22800,
                    notes="Complete multilingual spec tables extracted.",
                ),
            ]
            session.add_all(domains)

            # Create collection jobs
            jobs = [
                CollectionJob(
                    id="job-1089",
                    workspace_id=workspace_id,
                    job_name="Hourly Distributor Stock Delta Sync",
                    domain="digikey.com",
                    status=CollectionJobStatus.COMPLETED,
                    records_extracted=842,
                    duration_seconds=14.8,
                    retries=0,
                    started_at=datetime.now(timezone.utc),
                    completed_at=datetime.now(timezone.utc),
                ),
            ]
            session.add_all(jobs)

            # Create quality issues
            issues = [
                DataQualityIssue(
                    id="dq-1",
                    workspace_id=workspace_id,
                    issue_type="Stale Stock Observation",
                    severity=QualitySeverity.MEDIUM,
                    part_number="IME18-08BPSZC0S",
                    description="Supplier offer from Radwell has not refreshed in 32 hours. Stock claim of 12 units flagged for manual verification.",
                    sources=["radwell.com"],
                    detected_at=datetime.now(timezone.utc),
                    resolved=False,
                ),
            ]
            session.add_all(issues)

            # Create saved part
            saved = SavedPart(
                workspace_id=workspace_id,
                user_id=demo_user_id,
                part_id="part-ifm-igt205",
            )
            session.add(saved)

            await session.commit()
            print("Database seeded successfully!")

        except Exception as e:
            await session.rollback()
            print(f"Error seeding database: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_data())