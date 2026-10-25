from fastapi import FastAPI
from app.routes import searches, auth, ai
from app.schemas import HealthResponse

app = FastAPI(
    title="PartScout AI API",
    description="Backend API for PartScout AI - Intelligent Spare Part Discovery",
    version="0.1.0",
)

app.include_router(searches.router)
app.include_router(auth.router)
app.include_router(ai.router)


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="ok")


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "PartScout AI API", "docs": "/docs", "health": "/health"}