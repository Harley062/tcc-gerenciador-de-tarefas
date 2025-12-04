from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://sgti:sgti123@localhost/sgti"
    redis_url: str = "redis://localhost:6379"
    openai_api_key: str = ""
    openai_model: str = "gpt-4"
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str | list[str] = ["http://localhost:3000", "http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Parse CORS origins from various formats, handling empty strings gracefully"""
        if v is None or v == "":
            return ["http://localhost:3000", "http://localhost:5173"]
        
        if isinstance(v, list):
            return v
        
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return ["http://localhost:3000", "http://localhost:5173"]
            
            if v.startswith("["):
                import json
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    return ["http://localhost:3000", "http://localhost:5173"]
            
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        
        return ["http://localhost:3000", "http://localhost:5173"]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
