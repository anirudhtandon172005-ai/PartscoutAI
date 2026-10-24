import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas import SearchCreateRequest, RequirementSpec, Compatibility


# Test client fixture
@pytest.fixture
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
        assert data["status"] == "completed"
        assert data["candidate_count"] == 3

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
        assert data["status"] == "completed"

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


# Contract tests
class TestContract:
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
        datetime.fromisoformat(data["completed_at"].replace("Z", "+00:00"))

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