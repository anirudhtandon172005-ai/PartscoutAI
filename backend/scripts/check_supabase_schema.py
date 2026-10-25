"""Read-only Supabase schema verification for the PartScout runtime.

This intentionally checks through PostgREST and never prints credentials or
row data. It is useful before switching DATABASE_PROVIDER to supabase.
"""

import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings  # noqa: E402


TABLES = (
    "profiles",
    "workspaces",
    "workspace_members",
    "machines",
    "parts",
    "part_requests",
    "searches",
    "search_candidates",
    "candidate_evidence",
    "suppliers",
    "supplier_offers",
    "quotations",
)
REQUIRED_COLUMNS = {
    "search_candidates": ("offers",),
    "supplier_offers": ("candidate_id",),
}


def main() -> int:
    if not settings.supabase_url or not settings.supabase_anon_key:
        print(json.dumps({"ok": False, "error": "SUPABASE_URL and SUPABASE_ANON_KEY are required"}, indent=2))
        return 1

    base_url = settings.supabase_url.rstrip("/") + "/rest/v1"
    headers = {"apikey": settings.supabase_anon_key, "Accept-Profile": "public"}
    results: dict[str, int] = {}
    missing_columns: list[str] = []
    with httpx.Client(timeout=10, headers=headers) as client:
        for table in TABLES:
            response = client.get(f"{base_url}/{table}", params={"select": "*", "limit": 1})
            results[table] = response.status_code
        for table, columns in REQUIRED_COLUMNS.items():
            for column in columns:
                response = client.get(f"{base_url}/{table}", params={"select": column, "limit": 1})
                if response.status_code != 200:
                    missing_columns.append(f"{table}.{column}")

    ok = all(code == 200 for code in results.values()) and not missing_columns
    print(json.dumps({"ok": ok, "table_status": results, "missing_columns": missing_columns}, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
