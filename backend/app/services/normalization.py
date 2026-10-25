"""Deterministic normalization shared by providers and compatibility scoring."""

import re
from typing import Any


ALIASES = {
    "pnp no": "pnp normally open",
    "pnp normally-open": "pnp normally open",
    "pnp normally open (no)": "pnp normally open",
    "normally open pnp": "pnp normally open",
    "m12 4 pin": "m12 4-pin",
    "m12 4-pin connector": "m12 4-pin",
    "m12 4 pin connector": "m12 4-pin",
    "m12x1 4 pin": "m12 4-pin",
    "m12x1 4-pin": "m12 4-pin",
    "m12 x 1 4-pin": "m12 4-pin",
    "m12 x 1 4 pin": "m12 4-pin",
    "non flush": "non-flush",
    "non-flush mount": "non-flush",
    "flush mount": "flush",
}


def normalize_value(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    cleaned = " ".join(value.strip().lower().split())
    # Electrical values commonly arrive with optional spacing around the unit
    # and an optional DC suffix. Keep the suffix because AC/DC is meaningful.
    cleaned = re.sub(r"(?<=\d)\s*(?=v\s*dc\b)", "", cleaned)
    cleaned = re.sub(r"(?<=\d)\s*(?=vdc\b)", "", cleaned)
    cleaned = re.sub(r"\s+dc\b", " dc", cleaned)
    cleaned = ALIASES.get(cleaned, cleaned)
    cleaned = re.sub(r"(?<=\d)\s+(?=mm\b|v\b|hz\b)", "", cleaned)
    cleaned = re.sub(r"(?<=\d)(?=mm\b|v\b|hz\b)", "", cleaned)
    numeric_unit = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(mm|v|hz)", cleaned)
    if numeric_unit:
        return float(numeric_unit.group(1))
    voltage = re.fullmatch(r"(\d+(?:\.\d+)?)(?:v)\s*dc", cleaned)
    if voltage:
        return f"{float(voltage.group(1)):g}v dc"
    # Equivalent metric thread spellings compare equal while the raw value is
    # still retained by the API in evidence/specifications.
    cleaned = re.sub(r"\s*[×x]\s*", "x", cleaned)
    return cleaned


def normalize_specifications(specifications: dict[str, Any]) -> dict[str, Any]:
    return {key: normalize_value(value) for key, value in specifications.items()}
