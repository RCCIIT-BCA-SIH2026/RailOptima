import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Automatic Block Planning System for Indian Railways"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SIH_PROBLEM_CODE: str = "SIH26027"
    DATA_MODE_LABEL: str = "SIMULATED DEMO DATA"
    
    # Security & Tokens
    JWT_SECRET: str = "ir-production-secret-key-2026-sih-ai-block-planner"
    SECRET_KEY: str = "ir-production-secret-key-2026-sih-ai-block-planner"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Primary Database (Defaults to SQLite for portable instant runnability)
    DATABASE_URL: str = "sqlite:///./data/railway_planner.db"
    
    # MongoDB Atlas Cluster (Loaded strictly from .env)
    MONGODB_USER: str = ""
    MONGODB_PASSWORD: str = ""
    MONGODB_HOST: str = ""
    MONGODB_URL: str = ""
    MONGODB_URI: str = ""
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    
    # Google Maps Integration API Key
    MAP_API_KEY: str = ""
    VITE_MAP_API_KEY: str = ""
    VITE_GOOGLE_MAPS_API_KEY: str = ""

    # OpenRouter & LLM Model Keys
    OPENROUTER_API_KEY: str = ""
    AI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    VITE_OPENROUTER_API_KEY: str = ""
    VITE_AI_API_KEY: str = ""
    
    # ML & Optimization Microservice URL (Port 8001)
    ML_SERVICE_URL: str = "http://127.0.0.1:8001"

    # AI & Vector Engine Keys (Gemini & Pinecone)
    GEMINI_API_KEY: str = ""
    GEMINI_API_KEY_1: str = ""
    GEMINI_API_KEY_2: str = ""
    GEMINI_API_KEY_3: str = ""
    
    PINECONE_API_KEY: str = ""
    PINECONE_API_KEY_1: str = ""
    PINECONE_API_KEY_2: str = ""

    GEMINI_API_KEYS: List[str] = []
    PINECONE_API_KEYS: List[str] = []
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

settings = Settings()

