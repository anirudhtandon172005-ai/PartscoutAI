import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    database_provider: str = "sqlite"
    database_url: str | None = None
    database_path: str = "partscout.db"
    database_echo: bool = False
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

settings = Settings()
