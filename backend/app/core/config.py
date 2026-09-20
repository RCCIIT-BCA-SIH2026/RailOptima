import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Automatic Block Planning System for Indian Railways"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SIH_PROBLEM_CODE: str = "SIH26027"
    DATA_MODE_LABEL: str = "SIMULATED DEMO DATA"
    
    # Security
    JWT_SECRET: str = "ir-production-secret-key-2026-sih-ai-block-planner"
    SECRET_KEY: str = "ir-production-secret-key-2026-sih-ai-block-planner"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = "sqlite:///./data/railway_planner.db"
    MONGODB_USER: Optional[str] = None
    MONGODB_PASSWORD: Optional[str] = None
    MONGODB_HOST: Optional[str] = None
    MONGODB_URL: Optional[str] = None
    MONGODB_URI: Optional[str] = None
    MONGODB_SHELL_COMMAND: Optional[str] = None
    DB_USER: Optional[str] = None
    # Maps API
    MAP_API_KEY: Optional[str] = "AIzaSyAnidLeEYWpn5GYU7h7GWKrkWr7f58lbd0"
    
    # OpenRouter AI & LLM Model API Key
    OPENROUTER_API_KEY: Optional[str] = "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"
    AI_API_KEY: Optional[str] = "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"
    OPENAI_API_KEY: Optional[str] = "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"




    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000"
    ]

    model_config = SettingsConfigDict(
        env_file=[
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../.env"),
            os.path.join(os.getcwd(), ".env"),
            ".env"
        ],
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()

