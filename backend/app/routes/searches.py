from fastapi import APIRouter, HTTPException, status
from app.schemas import (
    SearchCreateRequest,
    SearchCreateResponse,
    SearchStatusResponse,
    CandidateListResponse,
    ErrorResponse,
)
from app.services.search_service import search_service

router = APIRouter(prefix="/api/v1/searches", tags=["searches"])


@router.post(
    "",
    response_model=SearchCreateResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def create_search(request: SearchCreateRequest) -> SearchCreateResponse:
    """Create a new part search and return the search ID."""
    try:
        return search_service.create_search(request)
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
async def get_search(search_id: str) -> SearchStatusResponse:
    """Get the status and details of a search by ID."""
    try:
        return search_service.get_search(search_id)
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
async def get_candidates(search_id: str) -> CandidateListResponse:
    """Get the candidate parts for a search by ID."""
    try:
        return search_service.get_candidates(search_id)
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