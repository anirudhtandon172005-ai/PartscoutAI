from datetime import datetime, timezone

import pytest

from app.schemas import CandidateEvidence, CandidateResponse, RequirementSpec, SearchCreateRequest
from app.services.normalization import normalize_value
from app.services.real_providers import DeterministicMatcher, EvidenceValidator
from app.services.search_service import MockSearchProvider
from app.config import settings


def request(requirements: RequirementSpec) -> SearchCreateRequest:
    return SearchCreateRequest(
        machine_name="Line 1",
        part_name="sensor",
        original_part_number="OEM-1",
        manufacturer="OEM",
        quantity=1,
        requirements=requirements,
    )


def candidate(specifications: dict, evidence=None) -> CandidateResponse:
    if evidence is None:
        evidence = [
            CandidateEvidence(
                field=field,
                quote=str(value),
                source_url="https://example.com/spec",
                retrieved_at=datetime.now(timezone.utc),
                confidence=0.95,
            )
            for field, value in specifications.items()
        ]
    return CandidateResponse(
        id="raw",
        part_number="C-1",
        manufacturer="Supplier",
        compatibility="unknown",
        score=0,
        specifications=specifications,
        evidence=evidence,
    )


def test_normalization_handles_aliases_units_and_preserves_other_values() -> None:
    assert normalize_value("PNP NO") == "pnp normally open"
    assert normalize_value("PNP normally-open") == "pnp normally open"
    assert normalize_value("M12 4-pin connector") == "m12 4-pin"
    assert normalize_value("8 mm") == 8.0
    assert normalize_value("500Hz") == 500.0
    assert normalize_value("24 V DC") == "24v dc"
    assert normalize_value("24VDC") == "24v dc"
    assert normalize_value("M12 x 1 4 pin") == "m12 4-pin"
    assert normalize_value("flush mount") == "flush"
    assert normalize_value("non-flush") == "non-flush"
    assert normalize_value("uninterpreted label") == "uninterpreted label"


@pytest.mark.parametrize(
    "specifications, expected",
    [
        ({"mounting": "flush", "output": "PNP NO"}, "compatible"),
        ({"mounting": "flush"}, "partial"),
        ({"mounting": "non-flush", "output": "PNP NO"}, "incompatible"),
        ({}, "unknown"),
    ],
)
def test_deterministic_matcher_classifies_missing_and_conflicting_values(specifications, expected) -> None:
    result = DeterministicMatcher().match(
        request(RequirementSpec(mounting="flush", output="PNP normally open")),
        candidate(specifications),
        "search-test",
        1,
    )
    assert result.compatibility == expected


def test_evidence_validator_requires_matching_source_quote_and_timestamp() -> None:
    retrieved_at = datetime.now(timezone.utc)
    valid = CandidateEvidence(
        field="sensing_range_mm",
        quote="Sensing range: 8 mm",
        source_url="https://example.com/spec",
        retrieved_at=retrieved_at,
        confidence=0.96,
    )
    wrong_source = valid.model_copy(update={"source_url": "https://other.example/spec"})
    missing_quote = valid.model_copy(update={"quote": "Not in document"})
    assert EvidenceValidator().validate([valid, wrong_source, missing_quote], "Sensing range: 8 mm", "https://example.com/spec") == [valid]


def test_evidence_confidence_is_bounded() -> None:
    with pytest.raises(ValueError):
        CandidateEvidence(field="x", quote="x", source_url="https://example.com", retrieved_at=datetime.now(timezone.utc), confidence=1.1)


def test_matcher_does_not_promote_unevidenced_values() -> None:
    result = DeterministicMatcher().match(
        request(RequirementSpec(mounting="flush")),
        candidate({"mounting": "flush"}, evidence=[]),
        "search-test",
        1,
    )
    assert result.compatibility == "unknown"
    assert result.score == 0


@pytest.mark.parametrize(
    "scenario, expected_status, expected_compatibility",
    [
        ("success", "candidates", "compatible"),
        ("single_candidate", "candidates", "compatible"),
        ("invalid_evidence", "candidates", "unknown"),
        ("missing_required_field", "candidates", "partial"),
        ("conflicting_field", "candidates", "incompatible"),
        ("empty", "empty", None),
    ],
)
def test_fixture_scenarios_are_deterministic(monkeypatch, scenario, expected_status, expected_compatibility) -> None:
    monkeypatch.setattr(settings, "fixture_scenario", scenario)
    if scenario == "empty":
        assert MockSearchProvider().discover_candidates(request(RequirementSpec(mounting="flush")), "search-test") == []
        return
    items = MockSearchProvider().discover_candidates(
        request(RequirementSpec(mounting="flush", output="PNP normally open", sensing_range_mm=8, connector="M12 4-pin")),
        "search-test",
    )
    assert items
    assert items[0].compatibility == expected_compatibility
    assert items[0].score == (100 if expected_compatibility == "compatible" else 75 if expected_compatibility in {"partial", "incompatible"} else 0)
