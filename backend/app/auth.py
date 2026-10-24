from dataclasses import dataclass
from typing import Annotated, Optional

import httpx
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import text, select

from app.config import settings
from app.db import get_db_session, WorkspaceMember


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None = None
    metadata: dict = None


async def get_current_user(authorization: Annotated[str | None, Header()] = None) -> CurrentUser:
    """Resolve the Supabase user without trusting client-provided identity fields.

    SQLite/test mode intentionally supports an anonymous demo identity so the existing
    local test suite and prototype workflow remain usable. Supabase mode requires a
    bearer token and validates it through Supabase Auth's user endpoint.
    """
    if settings.database_provider.lower() == "sqlite":
        return CurrentUser(id="00000000-0000-0000-0000-000000000001", email="local@partscout.test", metadata={})

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase Auth is not configured")

    token = authorization.split(" ", 1)[1].strip()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
                headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth provider unavailable") from exc

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    payload = response.json()
    return CurrentUser(id=payload["id"], email=payload.get("email"), metadata=payload.get("user_metadata") or {})


CurrentUserDependency = Annotated[CurrentUser, Depends(get_current_user)]


async def get_workspace_id(user: CurrentUser) -> str:
    """Get the user's workspace ID."""
    if settings.database_provider.lower() == "sqlite":
        # Return a valid UUID for demo workspace
        return "00000000-0000-0000-0000-000000000002"

    async with get_db_session() as session:
        result = await session.execute(
            select(WorkspaceMember.workspace_id)
            .where(WorkspaceMember.user_id == user.id)
            .order_by(WorkspaceMember.created_at)
            .limit(1)
        )
        workspace_id = result.scalar_one_or_none()
    if not workspace_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No workspace membership found")
    return str(workspace_id)


async def get_user_workspaces(user: CurrentUser) -> list[dict]:
    """Get all workspaces the user belongs to with their roles."""
    if settings.database_provider.lower() == "sqlite":
        return [{"id": "00000000-0000-0000-0000-000000000002", "name": "Local Demo Workspace", "facility": "Local Demo Plant", "role": "owner"}]

    async with get_db_session() as session:
        from app.db.models import Workspace, WorkspaceMember
        result = await session.execute(
            select(Workspace.id, Workspace.name, Workspace.facility, WorkspaceMember.role)
            .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
            .where(WorkspaceMember.user_id == user.id)
            .order_by(Workspace.created_at)
        )
        return [{"id": str(row.id), "name": row.name, "facility": row.facility, "role": row.role.value if hasattr(row.role, 'value') else row.role} for row in result.fetchall()]