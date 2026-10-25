from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text, Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.sqlite import JSON
from datetime import datetime

from app.config import settings


class Base(DeclarativeBase):
    pass


# SQLite is the local/test fallback. Supabase uses a private async PostgreSQL URL.
if settings.database_provider.lower() == "supabase":
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required when DATABASE_PROVIDER=supabase")
    # Convert postgres:// to postgresql+asyncpg:// for asyncpg driver
    DATABASE_URL = settings.database_url.replace("postgres://", "postgresql+asyncpg://", 1).replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    DATABASE_URL = f"sqlite+aiosqlite:///{settings.database_path}"

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=settings.database_echo)

# Create async session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# Create auth.users table for SQLite tests
class AuthUser(Base):
    __tablename__ = "auth_users"
    id = Column(String(64), primary_key=True)
    email = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)


async def init_db() -> None:
    """Initialize the database, creating all tables."""
    if settings.database_provider.lower() == "sqlite":
        async with engine.begin() as conn:
            # Create auth.users table first (referenced by foreign keys)
            await conn.run_sync(AuthUser.metadata.create_all)
            # Create all other tables
            await conn.run_sync(Base.metadata.create_all)
            # create_all does not alter an existing local database. Keep the
            # developer fallback forward-compatible with the versioned schema.
            columns = await conn.execute(text("PRAGMA table_info(search_candidates)"))
            if "offers" not in {row[1] for row in columns.fetchall()}:
                await conn.execute(text("ALTER TABLE search_candidates ADD COLUMN offers JSON NOT NULL DEFAULT '[]'"))
            offer_columns = await conn.execute(text("PRAGMA table_info(supplier_offers)"))
            if "candidate_id" not in {row[1] for row in offer_columns.fetchall()}:
                await conn.execute(text("ALTER TABLE supplier_offers ADD COLUMN candidate_id VARCHAR(64)"))
        await _seed_local_demo_workspace()
    else:
        # For Supabase, we rely on migrations applied via Supabase SQL editor
        # This just verifies the connection works
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))


async def close_db() -> None:
    """Close the database engine."""
    await engine.dispose()


async def _seed_local_demo_workspace() -> None:
    """Create a minimal persisted local workspace for SQLite development/tests.

    SQLite mode is intentionally anonymous, but it still needs real rows for
    the equipment registry and workspace bootstrap. This seed is idempotent.
    """
    from sqlalchemy import select
    from app.db.models import Workspace, WorkspaceMember, Machine

    user_id = "00000000-0000-0000-0000-000000000001"
    workspace_id = "00000000-0000-0000-0000-000000000002"
    machine_id = "mach-rf480-line4"

    async with async_session_factory() as session:
        user = await session.get(AuthUser, user_id)
        if not user:
            session.add(AuthUser(id=user_id, email="local@partscout.test"))

        workspace = await session.get(Workspace, workspace_id)
        if not workspace:
            session.add(Workspace(
                id=workspace_id,
                name="Local Demo Workspace",
                facility="Local Demo Plant",
                owner_id=user_id,
            ))

        membership = await session.get(WorkspaceMember, (workspace_id, user_id))
        if not membership:
            session.add(WorkspaceMember(workspace_id=workspace_id, user_id=user_id, role="owner"))

        machine = await session.get(Machine, machine_id)
        if not machine:
            session.add(Machine(
                id=machine_id,
                workspace_id=workspace_id,
                manufacturer="Krones",
                model="RF-480 HighSpeed Rotary Filler",
                machine_type="Beverage bottling filler",
                facility="Local Demo Plant",
                production_line="Line 4",
                commission_year=2021,
                criticality="High",
                notes="Persisted local development asset for registry workflow testing.",
            ))
        await session.commit()


@asynccontextmanager
async def get_db_session() -> AsyncSession:
    """Get a database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db() -> AsyncSession:
    """FastAPI dependency for database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
