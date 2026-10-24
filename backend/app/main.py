from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import searches
from app.schemas import HealthResponse
from app.db import init_db, close_db
from app.config import settings
from app.routes import workspace


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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(searches.router)
app.include_router(workspace.router)


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="ok")


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "PartScout AI API", "docs": "/docs", "health": "/health"}
