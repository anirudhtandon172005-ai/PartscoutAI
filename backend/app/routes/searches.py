import os
import asyncio
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from app.auth import CurrentUserDependency, get_workspace_id
from app.schemas import (
    SearchCreateRequest,
    SearchCreateResponse,
    SearchStatusResponse,
    CandidateListResponse,
    ErrorResponse,
)
from app.services.search_service import search_service, SEARCH_DEADLINE_SECONDS, SearchRateLimitError

router = APIRouter(prefix="/api/v1/searches", tags=["searches"])

def is_test_mode() -> bool:
    """Read test mode at request time so test suites can configure imports safely."""
    return os.environ.get("TEST_MODE", "false").lower() == "true"

# Background task deadline = provider deadline + small margin
BG_TASK_DEADLINE_SECONDS = SEARCH_DEADLINE_SECONDS + 10


async def _run_search_lifecycle(search_id: str):
    """Background task with hard deadline; guarantees terminal state."""
    try:
        await asyncio.wait_for(search_service.advance_search(search_id), timeout=BG_TASK_DEADLINE_SECONDS)
    except asyncio.TimeoutError:
        await search_service.fail_search(search_id, f"Background task timed out after {BG_TASK_DEADLINE_SECONDS} seconds")
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
        if not is_test_mode():
            background_tasks.add_task(_run_search_lifecycle, response.id)
        return response
    except SearchRateLimitError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
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
