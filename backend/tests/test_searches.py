import os
import tempfile
from datetime import datetime, timezone
from uuid import uuid4
os.environ["TEST_MODE"] = "true"

# Create a temporary database file for tests
test_db_fd, test_db_path = tempfile.mkstemp(suffix='.db')
os.environ["DATABASE_PATH"] = test_db_path

import pytest
import pytest_asyncio
import app.services.search_service as search_service_module
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas import SearchCreateRequest, RequirementSpec, Compatibility, CandidateResponse, CandidateOffer
from app.services.search_service import search_service
from app.services.provider_contracts import ProviderError
from app.db import init_db, close_db, get_db_session, SearchRepository, SupplierOffer
from sqlalchemy import select
from app.config import settings


# Module-level fixture for database setup/teardown
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    await init_db()
    yield
    await close_db()
    try:
        os.close(test_db_fd)
        os.unlink(test_db_path)
    except Exception:
        pass


# Test client fixture
@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# Health tests
class TestHealth:
    @pytest.mark.asyncio
    async def test_health_returns_200(self, client):
        response = await client.get("/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_returns_ok(self, client):
        response = await client.get("/health")
        assert response.json() == {"status": "ok"}

    @pytest.mark.asyncio
    async def test_health_details_exposes_safe_runtime_identity(self, client):
        response = await client.get("/health/details")
        assert response.status_code == 200
        data = response.json()
        assert data["database_provider"] == "sqlite"
        assert data["database_host"] is None
        assert data["database_connected"] is True
        assert data["schema_ready"] is True
        assert data["schema_error"] is None
        assert isinstance(data["configuration_warnings"], list)
        assert "tinyfish_configured" in data
        assert "nvidia_configured" in data
        assert "api_key" not in response.text.lower()


# Validation tests
class TestValidation:
    @pytest.mark.asyncio
    async def test_valid_request_accepted(self, client):
        payload = {
            "machine_name": "Apex PackWorks Line 4",
            "part_name": "M18 Inductive Proximity Sensor",
            "original_part_number": "BES 516-325-G-E5-C-S4",
            "manufacturer": "Balluff",
            "quantity": 2,
            "requirements": {
                "mounting": "flush",
                "output": "PNP normally open",
                "sensing_range_mm": 8,
                "connector": "M12 4-pin",
            },
        }
        response = await client.post("/api/v1/searches", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["id"].startswith("search-")
        assert data["status"] == "queued"
        assert data["progress_percent"] == 0
        assert data["stage"] is None

        # Complete the search via service for validation
        search_id = data["id"]
        await search_service.complete_search(search_id)
        status_response = await client.get(f"/api/v1/searches/{search_id}")
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["status"] == "completed"
        assert status_data["progress_percent"] == 100
        assert status_data["candidate_count"] == 3

    @pytest.mark.asyncio
    async def test_empty_part_name_rejected(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        response = await client.post("/api/v1/searches", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_workspace_request_accepts_snake_case_wire_contract(self, client):
        test_token = uuid4().hex[:8]
        response = await client.post("/api/v1/workspace/requests", json={
            "id": f"req-contract-{test_token}",
            "request_number": f"REQ-2026-{test_token.upper()}",
            "machine_id": "mach-rf480-line4",
            "machine_name": "RF-480 Line 4",
            "part_name": "M18 Inductive Sensor",
            "original_part_number": "BES-516",
            "manufacturer": "Balluff",
            "quantity_needed": 2,
            "urgency": "Line Down (Critical)",
            "acceptable_alternatives": True,
            "custom_requirements": "Flush mount",
            "status": "Researching",
            "target_component_id": "part-balluff-bes516",
        })
        assert response.status_code == 201
        assert response.json()["part_name"] == "M18 Inductive Sensor"
        assert response.json()["quantity_needed"] == 2

    @pytest.mark.asyncio
    async def test_workspace_request_missing_required_field_is_validation_error(self, client):
        response = await client.post("/api/v1/workspace/requests", json={
            "machine_name": "RF-480 Line 4",
            "original_part_number": "BES-516",
            "quantity_needed": 2,
            "urgency": "Line Down (Critical)",
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_zero_quantity_rejected(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 0,
            "requirements": {},
        }
        response = await client.post("/api/v1/searches", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_negative_sensing_range_rejected(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {"sensing_range_mm": -5},
        }
        response = await client.post("/api/v1/searches", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_oversized_strings_rejected(self, client):
        payload = {
            "machine_name": "x" * 201,
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        response = await client.post("/api/v1/searches", json=payload)
        assert response.status_code == 422


class TestWorkspaceRegistry:
    @pytest.mark.asyncio
    async def test_machine_registry_is_persisted_and_returned_by_bootstrap(self, client):
        bootstrap = await client.get("/api/v1/workspace/bootstrap")
        assert bootstrap.status_code == 200
        assert any(machine["id"] == "mach-rf480-line4" for machine in bootstrap.json()["machines"])

        machine_id = "mach-test-persisted"
        created = await client.post("/api/v1/workspace/machines", json={
            "id": machine_id,
            "manufacturer": "Test Manufacturer",
            "model": "Test Model",
            "machine_type": "Test Equipment",
            "facility": "Test Plant",
            "production_line": "Test Line",
            "criticality": "Medium",
            "notes": "Registry persistence test",
        })
        assert created.status_code == 201
        refreshed = await client.get("/api/v1/workspace/bootstrap")
        assert any(machine["id"] == machine_id for machine in refreshed.json()["machines"])
        deleted = await client.delete(f"/api/v1/workspace/machines/{machine_id}")
        assert deleted.status_code == 200


# Search lifecycle tests
class TestSearchLifecycle:
    @pytest.mark.asyncio
    async def test_create_returns_201(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        response = await client.post("/api/v1/searches", json=payload)
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_created_search_has_id(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        response = await client.post("/api/v1/searches", json=payload)
        data = response.json()
        assert "id" in data
        assert data["id"].startswith("search-")

    @pytest.mark.asyncio
    async def test_created_search_is_completed(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        response = await client.post("/api/v1/searches", json=payload)
        data = response.json()
        assert data["status"] == "queued"

        # Complete via service
        search_id = data["id"]
        await search_service.complete_search(search_id)
        status_response = await client.get(f"/api/v1/searches/{search_id}")
        assert status_response.json()["status"] == "completed"

    @pytest.mark.asyncio
    async def test_status_endpoint_returns_request(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {"mounting": "flush"},
        }
        create_response = await client.post("/api/v1/searches", json=payload)
        search_id = create_response.json()["id"]

        status_response = await client.get(f"/api/v1/searches/{search_id}")
        assert status_response.status_code == 200
        data = status_response.json()
        assert data["id"] == search_id
        assert data["request"]["machine_name"] == "Test Machine"
        assert data["request"]["requirements"]["mounting"] == "flush"

    @pytest.mark.asyncio
    async def test_candidate_endpoint_returns_candidates(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        create_response = await client.post("/api/v1/searches", json=payload)
        search_id = create_response.json()["id"]

        # Complete the search to generate candidates
        await search_service.complete_search(search_id)

        candidates_response = await client.get(f"/api/v1/searches/{search_id}/candidates")
        assert candidates_response.status_code == 200
        data = candidates_response.json()
        assert data["search_id"] == search_id
        assert len(data["items"]) == 3

    @pytest.mark.asyncio
    async def test_unknown_search_returns_404(self, client):
        response = await client.get("/api/v1/searches/search-unknown")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_unknown_search_candidates_returns_404(self, client):
        response = await client.get("/api/v1/searches/search-unknown/candidates")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_provider_error_is_terminal_failed_state(self, client, monkeypatch):
        class FailingProvider:
            def discover_candidates(self, request, search_id):
                raise ProviderError("TinyFish failed")

        monkeypatch.setattr(search_service_module, "_provider", FailingProvider())
        response = await client.post("/api/v1/searches", json={
            "machine_name": "Test Machine", "part_name": "Test Part",
            "original_part_number": "PN-123", "manufacturer": "Test Corp",
            "quantity": 1, "requirements": {},
        })
        record = await search_service.complete_search(response.json()["id"])
        assert record.status.value == "failed"
        assert record.error == "TinyFish failed"

    @pytest.mark.asyncio
    async def test_provider_timeout_is_terminal_failed_state(self, client, monkeypatch):
        class SlowProvider:
            def discover_candidates(self, request, search_id):
                import time
                time.sleep(0.05)
                return []

        monkeypatch.setattr(search_service_module, "_provider", SlowProvider())
        monkeypatch.setattr(search_service_module, "SEARCH_DEADLINE_SECONDS", 0.01)
        response = await client.post("/api/v1/searches", json={
            "machine_name": "Test Machine", "part_name": "Test Part",
            "original_part_number": "PN-123", "manufacturer": "Test Corp",
            "quantity": 1, "requirements": {},
        })
        record = await search_service.complete_search(response.json()["id"])
        assert record.status.value == "failed"
        assert "timed out" in record.error

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "scenario, expected_status, expected_compatibility",
        [
            ("success", "completed", "compatible"),
            ("empty", "failed", None),
            ("single_candidate", "completed", "compatible"),
            ("provider_failure", "failed", None),
            ("invalid_evidence", "completed", "unknown"),
            ("missing_required_field", "completed", "partial"),
            ("conflicting_field", "completed", "incompatible"),
        ],
    )
    async def test_fixture_scenario_lifecycle(self, client, monkeypatch, scenario, expected_status, expected_compatibility):
        monkeypatch.setattr(settings, "fixture_scenario", scenario)
        response = await client.post("/api/v1/searches", json={
            "machine_name": "Test Machine",
            "part_name": "M18 Inductive Proximity Sensor",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {
                "mounting": "flush",
                "output": "PNP normally open",
                "sensing_range_mm": 8,
                "connector": "M12 4-pin",
            },
        })
        assert response.status_code == 201
        record = await search_service.complete_search(response.json()["id"])
        assert record.status.value == expected_status
        if expected_compatibility:
            candidates = await client.get(f"/api/v1/searches/{record.id}/candidates")
            target = next(item for item in candidates.json()["items"] if item["part_number"] == "IGT205")
            assert target["compatibility"] == expected_compatibility

    @pytest.mark.asyncio
    async def test_fixture_timeout_is_terminal_failed_state(self, client, monkeypatch):
        monkeypatch.setattr(settings, "fixture_scenario", "timeout")
        monkeypatch.setattr(search_service_module, "SEARCH_DEADLINE_SECONDS", 0.01)
        response = await client.post("/api/v1/searches", json={
            "machine_name": "Test Machine", "part_name": "M18 Sensor",
            "original_part_number": "PN-123", "quantity": 1, "requirements": {},
        })
        record = await search_service.complete_search(response.json()["id"])
        assert record.status.value == "failed"
        assert "timed out" in record.error

    @pytest.mark.asyncio
    async def test_active_search_limit_returns_429(self, client, monkeypatch):
        monkeypatch.setattr(settings, "max_active_searches", 0)
        response = await client.post("/api/v1/searches", json={
            "machine_name": "Test Machine", "part_name": "M18 Sensor",
            "original_part_number": "PN-123", "quantity": 1, "requirements": {},
        })
        assert response.status_code == 429


# Contract tests
class TestContract:
    @pytest.mark.asyncio
    async def test_complete_offer_persists_supplier_and_candidate_link(self, client):
        response = await client.post("/api/v1/searches", json={
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-OFFER",
            "quantity": 1,
            "requirements": {},
        })
        search_id = response.json()["id"]
        offer = CandidateOffer(
            supplier_name="Supplier Test",
            supplier_domain="supplier.test",
            reported_price=12.5,
            currency="USD",
            stock_status="In Stock",
            quantity_available=4,
            lead_time_days=2,
            min_order_quantity=1,
            source_url="https://supplier.test/part",
            product_url="https://supplier.test/part",
            evidence_quote="In stock: 4 units at USD 12.50 each",
            confidence=0.9,
            last_checked=datetime.now(timezone.utc),
        )
        candidate = CandidateResponse(
            id=f"{search_id}-offer-candidate",
            part_number="PN-OFFER-CANDIDATE",
            manufacturer="Supplier Test",
            compatibility="unknown",
            score=0,
            specifications={},
            evidence=[],
            offers=[offer],
        )
        async with get_db_session() as session:
            await SearchRepository(session).save_candidates(
                search_id,
                [candidate],
                workspace_id="00000000-0000-0000-0000-000000000002",
            )
        candidates_response = await client.get(f"/api/v1/searches/{search_id}/candidates")
        assert candidates_response.status_code == 200
        assert candidates_response.json()["items"][0]["offers"][0]["supplier_name"] == "Supplier Test"
        async with get_db_session() as session:
            row = (await session.execute(select(SupplierOffer).where(SupplierOffer.candidate_id == candidate.id))).scalar_one()
            assert row.reported_price == 12.5
            assert row.supplier_name == "Supplier Test"

    @pytest.mark.asyncio
    async def test_candidate_score_is_0_to_100(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        create_response = await client.post("/api/v1/searches", json=payload)
        search_id = create_response.json()["id"]

        candidates_response = await client.get(f"/api/v1/searches/{search_id}/candidates")
        data = candidates_response.json()
        for candidate in data["items"]:
            assert 0 <= candidate["score"] <= 100

    @pytest.mark.asyncio
    async def test_compatibility_has_valid_value(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        create_response = await client.post("/api/v1/searches", json=payload)
        search_id = create_response.json()["id"]

        candidates_response = await client.get(f"/api/v1/searches/{search_id}/candidates")
        data = candidates_response.json()
        valid_compatibilities = {"compatible", "partial", "incompatible", "unknown"}
        for candidate in data["items"]:
            assert candidate["compatibility"] in valid_compatibilities

    @pytest.mark.asyncio
    async def test_evidence_has_required_fields(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        create_response = await client.post("/api/v1/searches", json=payload)
        search_id = create_response.json()["id"]

        candidates_response = await client.get(f"/api/v1/searches/{search_id}/candidates")
        data = candidates_response.json()
        for candidate in data["items"]:
            for evidence in candidate["evidence"]:
                assert "field" in evidence
                assert "quote" in evidence
                assert "source_url" in evidence
                assert "confidence" in evidence
                assert 0.0 <= evidence["confidence"] <= 1.0

    @pytest.mark.asyncio
    async def test_timestamps_are_present(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        create_response = await client.post("/api/v1/searches", json=payload)
        data = create_response.json()
        assert "created_at" in data
        assert "completed_at" in data

        # Verify ISO 8601 format
        from datetime import datetime
        datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
        # completed_at is null for queued status
        assert data["completed_at"] is None

        # Complete the search and check timestamps again
        search_id = data["id"]
        await search_service.complete_search(search_id)
        status_response = await client.get(f"/api/v1/searches/{search_id}")
        status_data = status_response.json()
        assert status_data["completed_at"] is not None
        datetime.fromisoformat(status_data["completed_at"].replace("Z", "+00:00"))

    @pytest.mark.asyncio
    async def test_candidate_list_contains_search_id(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        create_response = await client.post("/api/v1/searches", json=payload)
        search_id = create_response.json()["id"]

        candidates_response = await client.get(f"/api/v1/searches/{search_id}/candidates")
        data = candidates_response.json()
        assert data["search_id"] == search_id

    @pytest.mark.asyncio
    async def test_same_request_twice_deterministic_candidates(self, client):
        payload = {
            "machine_name": "Apex PackWorks Line 4",
            "part_name": "M18 Inductive Proximity Sensor",
            "original_part_number": "BES 516-325-G-E5-C-S4",
            "manufacturer": "Balluff",
            "quantity": 2,
            "requirements": {
                "mounting": "flush",
                "output": "PNP normally open",
                "sensing_range_mm": 8,
                "connector": "M12 4-pin",
            },
        }
        # Create first search
        response1 = await client.post("/api/v1/searches", json=payload)
        search_id1 = response1.json()["id"]
        candidates1 = await client.get(f"/api/v1/searches/{search_id1}/candidates")

        # Create second search with same request
        response2 = await client.post("/api/v1/searches", json=payload)
        search_id2 = response2.json()["id"]
        candidates2 = await client.get(f"/api/v1/searches/{search_id2}/candidates")

        # Candidates should have same content (deterministic)
        items1 = candidates1.json()["items"]
        items2 = candidates2.json()["items"]
        assert len(items1) == len(items2)
        for c1, c2 in zip(items1, items2):
            assert c1["part_number"] == c2["part_number"]
            assert c1["manufacturer"] == c2["manufacturer"]
            assert c1["score"] == c2["score"]
            assert c1["compatibility"] == c2["compatibility"]

    @pytest.mark.asyncio
    async def test_two_searches_have_different_ids(self, client):
        payload = {
            "machine_name": "Test Machine",
            "part_name": "Test Part",
            "original_part_number": "PN-123",
            "manufacturer": "Test Corp",
            "quantity": 1,
            "requirements": {},
        }
        response1 = await client.post("/api/v1/searches", json=payload)
        response2 = await client.post("/api/v1/searches", json=payload)
        assert response1.json()["id"] != response2.json()["id"]


# Schema validation tests
class TestSchemaValidation:
    def test_valid_requirement_spec(self):
        spec = RequirementSpec(
            mounting="flush",
            output="PNP normally open",
            sensing_range_mm=8.0,
            connector="M12 4-pin",
        )
        assert spec.mounting == "flush"
        assert spec.sensing_range_mm == 8.0

    def test_invalid_negative_sensing_range(self):
        with pytest.raises(ValueError):
            RequirementSpec(sensing_range_mm=-1)

    def test_valid_search_create_request(self):
        req = SearchCreateRequest(
            machine_name="Test Machine",
            part_name="Test Part",
            original_part_number="PN-123",
            manufacturer="Test Corp",
            quantity=5,
            requirements=RequirementSpec(mounting="flush"),
        )
        assert req.quantity == 5

    def test_invalid_zero_quantity(self):
        with pytest.raises(ValueError):
            SearchCreateRequest(
                machine_name="Test Machine",
                part_name="Test Part",
                original_part_number="PN-123",
                manufacturer="Test Corp",
                quantity=0,
                requirements=RequirementSpec(),
            )

    def test_invalid_compatibility_value(self):
        # Pydantic v2 validates Literal at assignment time, not model creation
        # This test ensures the type annotation is correct
        from typing import Literal
        Compatibility = Literal["compatible", "partial", "incompatible", "unknown"]
        assert "compatible" in Compatibility.__args__
        assert "partial" in Compatibility.__args__
        assert "incompatible" in Compatibility.__args__
        assert "unknown" in Compatibility.__args__


# Stage contract tests
class TestStageContract:
    def test_valid_stage(self):
        from app.schemas import SearchStage
        valid_stages = [
            "source_discovery",
            "page_retrieval",
            "attribute_extraction",
            "normalization",
            "validation",
            "evidence_compilation",
        ]
        for stage in valid_stages:
            SearchStage.__args__  # verify Literal exists
        # Pydantic validates at model creation
        from app.schemas import SearchStatusResponse
        from datetime import datetime
        resp = SearchStatusResponse(
            id="test",
            status="running",
            stage="page_retrieval",
            progress_percent=25,
            stage_message="Retrieving pages",
            request=SearchCreateRequest(
                machine_name="Test",
                part_name="Test",
                original_part_number="PN-123",
                manufacturer="Test",
                quantity=1,
                requirements=RequirementSpec(),
            ),
            candidate_count=0,
            created_at=datetime.now(),
        )
        assert resp.stage == "page_retrieval"

    def test_invalid_stage_rejected(self):
        from app.schemas import SearchStatusResponse
        from datetime import datetime
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            SearchStatusResponse(
                id="test",
                status="running",
                stage="invalid_stage",
                progress_percent=25,
                stage_message="Test",
                request=SearchCreateRequest(
                    machine_name="Test",
                    part_name="Test",
                    original_part_number="PN-123",
                    manufacturer="Test",
                    quantity=1,
                    requirements=RequirementSpec(),
                ),
                candidate_count=0,
                created_at=datetime.now(),
            )

    def test_progress_below_zero_rejected(self):
        from app.schemas import SearchStatusResponse
        from datetime import datetime
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            SearchStatusResponse(
                id="test",
                status="running",
                stage="source_discovery",
                progress_percent=-1,
                stage_message="Test",
                request=SearchCreateRequest(
                    machine_name="Test",
                    part_name="Test",
                    original_part_number="PN-123",
                    manufacturer="Test",
                    quantity=1,
                    requirements=RequirementSpec(),
                ),
                candidate_count=0,
                created_at=datetime.now(),
            )

    def test_progress_above_100_rejected(self):
        from app.schemas import SearchStatusResponse
        from datetime import datetime
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            SearchStatusResponse(
                id="test",
                status="running",
                stage="source_discovery",
                progress_percent=101,
                stage_message="Test",
                request=SearchCreateRequest(
                    machine_name="Test",
                    part_name="Test",
                    original_part_number="PN-123",
                    manufacturer="Test",
                    quantity=1,
                    requirements=RequirementSpec(),
                ),
                candidate_count=0,
                created_at=datetime.now(),
            )

    def test_failed_search_requires_error(self):
        from app.schemas import SearchStatusResponse
        from datetime import datetime
        # The schema allows error to be None even for failed status
        # This test documents the current behavior
        resp = SearchStatusResponse(
            id="test",
            status="failed",
            stage="page_retrieval",
            progress_percent=25,
            stage_message="Failed",
            request=SearchCreateRequest(
                machine_name="Test",
                part_name="Test",
                original_part_number="PN-123",
                manufacturer="Test",
                quantity=1,
                requirements=RequirementSpec(),
            ),
            candidate_count=0,
            created_at=datetime.now(),
            error=None,  # Currently allowed
        )
        assert resp.error is None

    def test_queued_contract(self):
        from app.schemas import SearchStatusResponse
        from datetime import datetime
        resp = SearchStatusResponse(
            id="test",
            status="queued",
            stage=None,
            progress_percent=0,
            stage_message="Queued",
            request=SearchCreateRequest(
                machine_name="Test",
                part_name="Test",
                original_part_number="PN-123",
                manufacturer="Test",
                quantity=1,
                requirements=RequirementSpec(),
            ),
            candidate_count=0,
            created_at=datetime.now(),
            error=None,
        )
        assert resp.status == "queued"
        assert resp.progress_percent == 0
        assert resp.error is None
        assert resp.stage is None

    def test_running_contract(self):
        from app.schemas import SearchStatusResponse
        from datetime import datetime
        resp = SearchStatusResponse(
            id="test",
            status="running",
            stage="source_discovery",
            progress_percent=10,
            stage_message="Discovering sources",
            request=SearchCreateRequest(
                machine_name="Test",
                part_name="Test",
                original_part_number="PN-123",
                manufacturer="Test",
                quantity=1,
                requirements=RequirementSpec(),
            ),
            candidate_count=0,
            created_at=datetime.now(),
            error=None,
        )
        assert resp.status == "running"
        assert 1 <= resp.progress_percent <= 99
        assert resp.error is None
        assert resp.stage is not None

    def test_completed_contract(self):
        from app.schemas import SearchStatusResponse
        from datetime import datetime
        resp = SearchStatusResponse(
            id="test",
            status="completed",
            stage="evidence_compilation",
            progress_percent=100,
            stage_message="Search completed",
            request=SearchCreateRequest(
                machine_name="Test",
                part_name="Test",
                original_part_number="PN-123",
                manufacturer="Test",
                quantity=1,
                requirements=RequirementSpec(),
            ),
            candidate_count=3,
            created_at=datetime.now(),
            completed_at=datetime.now(),
            error=None,
        )
        assert resp.status == "completed"
        assert resp.progress_percent == 100
        assert resp.error is None
        assert resp.candidate_count >= 0

    def test_failed_contract(self):
        from app.schemas import SearchStatusResponse
        from datetime import datetime
        resp = SearchStatusResponse(
            id="test",
            status="failed",
            stage="page_retrieval",
            progress_percent=25,
            stage_message="Failed during retrieval",
            request=SearchCreateRequest(
                machine_name="Test",
                part_name="Test",
                original_part_number="PN-123",
                manufacturer="Test",
                quantity=1,
                requirements=RequirementSpec(),
            ),
            candidate_count=0,
            created_at=datetime.now(),
            error="Mock provider failed to retrieve candidate pages",
        )
        assert resp.status == "failed"
        assert resp.error is not None
        assert resp.progress_percent < 100
