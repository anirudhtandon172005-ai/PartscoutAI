import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Resolve the backend environment file from the project, not the caller's
    # current directory (uvicorn may be launched from either repo root).
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    database_provider: str = "sqlite"
    database_url: str | None = None
    database_path: str = "partscout.db"
    database_echo: bool = False
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    # Keep the fixture provider as the safe local default. Real NVIDIA calls
    # are opt-in and must use backend-only environment variables.
    llm_provider: str = "fixture"
    search_provider: str = "fixture"
    fixture_scenario: str = "success"
    max_active_searches: int = 100
    tinyfish_api_key: str | None = None
    tinyfish_search_url: str = "https://api.search.tinyfish.ai"
    tinyfish_fetch_url: str = "https://api.fetch.tinyfish.ai"
    nvidia_api_key: str | None = None
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str | None = None
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

settings = Settings()
