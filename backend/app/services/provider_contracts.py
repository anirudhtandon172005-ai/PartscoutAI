"""Provider contracts for the search pipeline.

External providers must implement these contracts instead of leaking provider-
specific response shapes into the search service or API routes.  The fixture
provider remains the default until each real adapter has passed its contract
tests.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Protocol

from app.schemas import CandidateResponse, SearchCreateRequest
from app.db.models import SearchStage

StageCallback = Callable[[SearchStage], None]


class ProviderError(RuntimeError):
    """A provider failed in a way that should fail the current search."""


@dataclass(frozen=True)
class DiscoveredSource:
    url: str
    source_type: str
    manufacturer: str | None = None
    part_number: str | None = None
    discovery_reason: str = ""


@dataclass(frozen=True)
class FetchedDocument:
    source: DiscoveredSource
    title: str
    content: str
    retrieved_at: datetime
    status: str = "success"
    error: str | None = None


@dataclass(frozen=True)
class PipelineSources:
    discovered: list[DiscoveredSource] = field(default_factory=list)
    fetched: list[FetchedDocument] = field(default_factory=list)


class DiscoveryProvider(Protocol):
    """Find candidate product pages or datasheets for a request."""

    def discover(
        self,
        request: SearchCreateRequest,
        search_id: str,
    ) -> list[DiscoveredSource]: ...


class PageFetcher(Protocol):
    """Fetch source content for later extraction."""

    def fetch(
        self,
        source: DiscoveredSource,
        search_id: str,
    ) -> FetchedDocument: ...


class StructuredExtractor(Protocol):
    """Extract typed candidate data from a fetched document."""

    def extract(
        self,
        request: SearchCreateRequest,
        document: FetchedDocument,
        search_id: str,
    ) -> CandidateResponse: ...


class SearchProvider(Protocol):
    """Compatibility boundary used by the current service.

    This high-level contract lets the existing fixture remain usable while the
    pipeline is split into discovery, fetch, extraction, and validation stages.
    """

    def discover_candidates(
        self,
        request: SearchCreateRequest,
        search_id: str,
        stage_callback: StageCallback | None = None,
    ) -> list[CandidateResponse]: ...
