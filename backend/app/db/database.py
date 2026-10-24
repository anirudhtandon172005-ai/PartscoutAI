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
    else:
        # For Supabase, we rely on migrations applied via Supabase SQL editor
        # This just verifies the connection works
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))


async def close_db() -> None:
    """Close the database engine."""
    await engine.dispose()


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