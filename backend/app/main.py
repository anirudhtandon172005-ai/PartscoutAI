from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

# Load env variables from root and backend .env
root_dir = Path(__file__).resolve().parent.parent.parent
load_dotenv(root_dir / ".env")
load_dotenv(root_dir / "backend" / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import searches, auth, ai, crawler
from app.schemas import HealthResponse

app = FastAPI(
    title="PartScout AI API",
    description="Backend API for PartScout AI - Intelligent Spare Part Discovery",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(searches.router)
app.include_router(auth.router)
app.include_router(ai.router)
app.include_router(crawler.router)


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="ok")


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "PartScout AI API", "docs": "/docs", "health": "/health"}