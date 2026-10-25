"""Validate backend runtime configuration without printing credentials.

Run from the repository root with:
    backend/.venv/bin/python backend/scripts/validate_runtime.py
"""

import json
import sys
from pathlib import Path
from urllib.parse import urlsplit

# Allow invocation from the repository root without requiring PYTHONPATH.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    provider = settings.database_provider.lower()
    search_provider = settings.search_provider.lower()
    llm_provider = settings.llm_provider.lower()

    if provider == "supabase":
        if not settings.database_url:
            errors.append("DATABASE_URL is required for DATABASE_PROVIDER=supabase")
        if not settings.supabase_url or not settings.supabase_anon_key:
            errors.append("SUPABASE_URL and SUPABASE_ANON_KEY are required for Supabase auth")
    elif provider != "sqlite":
        errors.append(f"Unsupported DATABASE_PROVIDER: {settings.database_provider}")

    if provider == "sqlite" and search_provider == "real":
        errors.append("Real provider searches require Supabase/Postgres; SQLite is local/test-only")
    if search_provider == "real":
        if not settings.tinyfish_api_key:
            errors.append("TINYFISH_API_KEY is required for SEARCH_PROVIDER=real")
        if not settings.nvidia_api_key or not settings.nvidia_model:
            errors.append("NVIDIA_API_KEY and NVIDIA_MODEL are required for SEARCH_PROVIDER=real")
    if llm_provider == "nvidia" and (not settings.nvidia_api_key or not settings.nvidia_model):
        errors.append("NVIDIA_API_KEY and NVIDIA_MODEL are required for LLM_PROVIDER=nvidia")
    if provider == "sqlite" and search_provider == "fixture":
        warnings.append("SQLite/fixture mode is suitable for local testing only")

    result = {
        "ok": not errors,
        "database_provider": settings.database_provider,
        "database_host": urlsplit(settings.database_url).hostname if provider == "supabase" and settings.database_url else None,
        "search_provider": settings.search_provider,
        "llm_provider": settings.llm_provider,
        "errors": errors,
        "warnings": warnings,
    }
    print(json.dumps(result, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
