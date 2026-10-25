from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.services.llm_service import openrouter_service

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


class AIStatusResponse(BaseModel):
    configured: bool
    provider: str
    model: str
    label: Optional[str] = None
    limit_remaining_usd: Optional[float] = None
    free_model_daily_requests: Optional[dict] = None


class AIAnalyzeRequest(BaseModel):
    part_number: str = Field(..., description="Target part number or identifier")
    original_specs: dict = Field(default_factory=dict, description="Original part specifications")
    candidate_specs: dict = Field(default_factory=dict, description="Candidate part specifications")
    machine_context: Optional[str] = Field(None, description="Industrial asset / line context")


class AIAnalyzeResponse(BaseModel):
    success: bool
    provider: str
    model: str
    analysis: str


@router.get("/status", response_model=AIStatusResponse)
async def get_ai_status() -> AIStatusResponse:
    """Return OpenRouter intelligence status and quota."""
    status_info = await openrouter_service.get_key_status()
    return AIStatusResponse(
        configured=status_info.get("configured", False),
        provider=status_info.get("provider", "OpenRouter"),
        model=status_info.get("model", openrouter_service.model),
        label=status_info.get("label"),
        limit_remaining_usd=status_info.get("limit_remaining_usd"),
        free_model_daily_requests=status_info.get("free_model_daily_requests"),
    )


@router.post("/analyze-replacement", response_model=AIAnalyzeResponse)
async def analyze_replacement(payload: AIAnalyzeRequest) -> AIAnalyzeResponse:
    """Analyze part replacement viability using OpenRouter LLM."""
    system_prompt = (
        "You are PartScout AI, an expert industrial automation and reliability engineering intelligence assistant. "
        "Analyze technical compatibility between industrial parts with strict engineering rigor."
    )
    user_prompt = (
        f"Analyze replacement viability for part {payload.part_number}.\n"
        f"Original Specs: {payload.original_specs}\n"
        f"Candidate Specs: {payload.candidate_specs}\n"
        f"Asset Context: {payload.machine_context or 'Industrial packaging/conveyor line'}\n"
        "Provide a concise engineering assessment of dimensional fit, electrical compatibility, and any risk factors."
    )

    res = await openrouter_service.query_llm(prompt=user_prompt, system_prompt=system_prompt)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=res.get("error", "Failed to query OpenRouter model"),
        )

    return AIAnalyzeResponse(
        success=True,
        provider="OpenRouter",
        model=res.get("model", openrouter_service.model),
        analysis=res.get("response", ""),
    )
