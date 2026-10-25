from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routes import searches
from app.schemas import HealthResponse
from app.db import init_db, close_db, get_db_session
from app.config import settings
from app.routes import workspace
from urllib.parse import urlsplit
from sqlalchemy import text
from uuid import uuid4


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="PartScout AI API",
    description="Backend API for PartScout AI - Intelligent Spare Part Discovery",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    # Vite uses the next available localhost port when 5173 is occupied. Keep
    # local development flexible without allowing arbitrary network origins.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or f"req-{uuid4().hex[:12]}"
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

app.include_router(searches.router)
app.include_router(workspace.router)


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="ok")


@app.get("/health/details", tags=["health"])
async def health_details() -> dict[str, object]:
    """Expose safe runtime identity information without credentials."""
    database_host = None
    if settings.database_provider.lower() == "supabase" and settings.database_url:
        database_host = urlsplit(settings.database_url).hostname
    database_connected = False
    database_error = None
    schema_ready = False
    schema_error = None
    try:
        async with get_db_session() as session:
            await session.execute(text("SELECT 1"))
        database_connected = True
    except Exception as exc:
        database_error = exc.__class__.__name__
    if database_connected:
        try:
            async with get_db_session() as session:
                await session.execute(text("SELECT offers FROM search_candidates LIMIT 0"))
                await session.execute(text("SELECT candidate_id FROM supplier_offers LIMIT 0"))
            schema_ready = True
        except Exception as exc:
            schema_error = exc.__class__.__name__

    configuration_warnings: list[str] = []
    if settings.database_provider.lower() == "sqlite" and settings.search_provider.lower() == "real":
        configuration_warnings.append("SQLite is a local/test database; configure Supabase before enabling real provider searches.")
    if settings.llm_provider.lower() == "nvidia" and not settings.nvidia_model:
        configuration_warnings.append("NVIDIA LLM mode is selected but NVIDIA_MODEL is missing.")
    if database_connected and not schema_ready:
        configuration_warnings.append("Database is reachable but the candidate-offer migrations are not applied.")

    return {
        "database_provider": settings.database_provider,
        "database_host": database_host,
        "database_path": settings.database_path if settings.database_provider.lower() == "sqlite" else None,
        "database_connected": database_connected,
        "database_error": database_error,
        "schema_ready": schema_ready,
        "schema_error": schema_error,
        "search_provider": settings.search_provider,
        "llm_provider": settings.llm_provider,
        "tinyfish_configured": bool(settings.tinyfish_api_key),
        "nvidia_configured": bool(settings.nvidia_api_key and settings.nvidia_model),
        "tinyfish_endpoint": urlsplit(settings.tinyfish_search_url).hostname,
        "nvidia_endpoint": urlsplit(settings.nvidia_base_url).hostname,
        "configuration_warnings": configuration_warnings,
    }


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "PartScout AI API", "docs": "/docs", "health": "/health"}
