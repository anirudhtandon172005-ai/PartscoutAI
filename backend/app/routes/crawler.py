from typing import Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, HttpUrl
from app.services.scraper_service import tinyfish_service

router = APIRouter(prefix="/api/v1/crawler", tags=["crawler"])


class CrawlerStatusResponse(BaseModel):
    configured: bool
    provider: str = "TinyFish Web Agent Engine"
    base_url: str
    active: bool


class ScrapePartRequest(BaseModel):
    url: str = Field(..., description="Target distributor catalog or OEM URL to scrape")
    part_number: Optional[str] = Field(None, description="Industrial part number to look for")
    goal: Optional[str] = Field(None, description="Custom scraping natural language goal")


class ScrapePartResponse(BaseModel):
    success: bool
    run_id: Optional[str] = None
    status: Optional[str] = None
    num_of_steps: Optional[int] = None
    result: Optional[Any] = None
    error: Optional[str] = None


@router.get("/status", response_model=CrawlerStatusResponse)
async def get_crawler_status() -> CrawlerStatusResponse:
    """Return TinyFish web scraping crawler engine status."""
    is_ready = tinyfish_service.is_configured()
    return CrawlerStatusResponse(
        configured=is_ready,
        provider="TinyFish Web Agent Engine",
        base_url=tinyfish_service.base_url,
        active=is_ready,
    )


@router.post("/scrape", response_model=ScrapePartResponse)
async def scrape_part(payload: ScrapePartRequest) -> ScrapePartResponse:
    """Trigger TinyFish automated scraping agent on an industrial supplier URL."""
    res = await tinyfish_service.scrape_part_specs(
        url=payload.url,
        part_number=payload.part_number,
        goal=payload.goal,
    )

    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=res.get("error", "TinyFish scraping agent failed"),
        )

    return ScrapePartResponse(
        success=True,
        run_id=res.get("run_id"),
        status=res.get("status"),
        num_of_steps=res.get("num_of_steps"),
        result=res.get("result"),
        error=res.get("error"),
    )


@router.get("/runs/{run_id}")
async def get_run_status(run_id: str) -> dict[str, Any]:
    """Check status of a TinyFish scraping automation run."""
    res = await tinyfish_service.get_run_status(run_id)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=res.get("error", "Run not found or polling failed"),
        )
    return res.get("data", {})
