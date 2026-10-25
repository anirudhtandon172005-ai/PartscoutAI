from __future__ import annotations
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, HttpUrl
from app.services.scraper_service import tinyfish_service, SPECIFIC_INDUSTRIAL_SOURCES

router = APIRouter(prefix="/api/v1/crawler", tags=["crawler"])


class CrawlerStatusResponse(BaseModel):
    configured: bool
    provider: str = "TinyFish Web Agent Engine"
    base_url: str
    active: bool
    whitelisted_sources_count: int = 8


class SpecificSourceItem(BaseModel):
    id: str
    name: str
    domain: str
    url_template: str
    category: str
    reliability: str
    typical_delivery: str


class ScrapePartRequest(BaseModel):
    url: str = Field(..., description="Target distributor catalog or OEM URL to scrape")
    part_number: Optional[str] = Field(None, description="Industrial part number to look for")
    goal: Optional[str] = Field(None, description="Custom scraping natural language goal")


class ScrapeSpecificSourceRequest(BaseModel):
    source_id: str = Field(..., description="Whitelisted distributor ID (e.g. mcmaster, ifm, grainger, radwell, digikey)")
    part_number: str = Field(..., description="Industrial part number to scrape")
    goal: Optional[str] = Field(None, description="Custom extraction goal")


class ScrapePartResponse(BaseModel):
    success: bool
    run_id: Optional[str] = None
    status: Optional[str] = None
    num_of_steps: Optional[int] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    target_url: Optional[str] = None
    source_id: Optional[str] = None
    source_name: Optional[str] = None


@router.get("/status", response_model=CrawlerStatusResponse)
async def get_crawler_status() -> CrawlerStatusResponse:
    """Return TinyFish web scraping crawler engine status."""
    is_ready = tinyfish_service.is_configured()
    return CrawlerStatusResponse(
        configured=is_ready,
        provider="TinyFish Web Agent Engine",
        base_url=tinyfish_service.base_url,
        active=is_ready,
        whitelisted_sources_count=len(SPECIFIC_INDUSTRIAL_SOURCES),
    )


@router.get("/sources", response_model=list[SpecificSourceItem])
async def list_whitelisted_sources() -> list[SpecificSourceItem]:
    """Return whitelisted industrial distributor and OEM catalog sites for targeted scraping."""
    return [SpecificSourceItem(**s) for s in tinyfish_service.get_specific_sources()]


@router.post("/scrape", response_model=ScrapePartResponse)
async def scrape_part(payload: ScrapePartRequest) -> ScrapePartResponse:
    """Trigger TinyFish automated scraping agent on an industrial supplier URL."""
    res = await tinyfish_service.scrape_part_specs(
        url=payload.url,
        part_number=payload.part_number,
        goal=payload.goal,
    )

    if not res.get("success"):
        return ScrapePartResponse(
            success=False,
            error=res.get("error", "TinyFish scraping agent failed"),
            target_url=payload.url,
        )

    return ScrapePartResponse(
        success=True,
        run_id=res.get("run_id"),
        status=res.get("status"),
        num_of_steps=res.get("num_of_steps"),
        result=res.get("result"),
        error=res.get("error"),
        target_url=res.get("target_url", payload.url),
    )


@router.post("/scrape-specific", response_model=ScrapePartResponse)
async def scrape_specific_source(payload: ScrapeSpecificSourceRequest) -> ScrapePartResponse:
    """
    Scrape targeted industrial part data exclusively from a whitelisted distributor/OEM site.
    Prevents open-internet crawler errors and ambiguous search engine results.
    """
    res = await tinyfish_service.scrape_specific_source(
        source_id=payload.source_id,
        part_number=payload.part_number,
        goal=payload.goal,
    )

    return ScrapePartResponse(
        success=res.get("success", False),
        run_id=res.get("run_id"),
        status=res.get("status"),
        num_of_steps=res.get("num_of_steps"),
        result=res.get("result"),
        error=res.get("error"),
        target_url=res.get("target_url"),
        source_id=res.get("source_id"),
        source_name=res.get("source_name"),
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

