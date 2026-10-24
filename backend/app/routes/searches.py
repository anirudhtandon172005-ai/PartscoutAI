import os
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from app.auth import CurrentUserDependency, get_workspace_id
from app.schemas import (
    SearchCreateRequest,
    SearchCreateResponse,
    SearchStatusResponse,
    CandidateListResponse,
    ErrorResponse,
)
from app.services.search_service import search_service

router = APIRouter(prefix="/api/v1/searches", tags=["searches"])

# Check if running in test mode
TEST_MODE = os.environ.get("TEST_MODE", "false").lower() == "true"


async def _run_search_lifecycle(search_id: str):
    """Background task to run the search through all stages."""
    import asyncio

    try:
        # Simulate processing time between stages.
        for _ in range(10):  # Max 10 iterations (more than enough for 6 stages)
            await asyncio.sleep(0.5)
            record = await search_service.advance_search(search_id)
            if record and record.status == "completed":
                break
    except Exception as exc:
        await search_service.fail_search(search_id, f"Search pipeline failed: {exc}")


@router.post(
    "",
    response_model=SearchCreateResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def create_search(request: SearchCreateRequest, background_tasks: BackgroundTasks, user: CurrentUserDependency) -> SearchCreateResponse:
    """Create a new part search and return the search ID. The search runs asynchronously through stages."""
    try:
        response = await search_service.create_search(request, user_id=user.id, workspace_id=await get_workspace_id(user))
        # Start the background lifecycle (skip in test mode)
        if not TEST_MODE:
            background_tasks.add_task(_run_search_lifecycle, response.id)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create search: {str(e)}",
        )


@router.get(
    "/{search_id}",
    response_model=SearchStatusResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Search not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_search(search_id: str, user: CurrentUserDependency) -> SearchStatusResponse:
    """Get the status and details of a search by ID."""
    try:
        return await search_service.get_search(search_id, workspace_id=await get_workspace_id(user))
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve search: {str(e)}",
        )


@router.get(
    "/{search_id}/candidates",
    response_model=CandidateListResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Search not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_candidates(search_id: str, user: CurrentUserDependency) -> CandidateListResponse:
    """Get the candidate parts for a search by ID."""
    try:
        return await search_service.get_candidates(search_id, workspace_id=await get_workspace_id(user))
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve candidates: {str(e)}",
        )
