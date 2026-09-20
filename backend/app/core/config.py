import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

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
    
    # MongoDB Atlas Cluster Credentials
    MONGODB_USER: str = "ankitkarmakar200512_db_user"
    MONGODB_PASSWORD: str = "iaRBstUjDm2HrFq3"
    MONGODB_HOST: str = "railoptima.uhkmnya.mongodb.net"
    MONGODB_URL: str = "mongodb+srv://ankitkarmakar200512_db_user:iaRBstUjDm2HrFq3@railoptima.uhkmnya.mongodb.net/railway_planner?retryWrites=true&w=majority"
    MONGODB_URI: str = "mongodb+srv://ankitkarmakar200512_db_user:iaRBstUjDm2HrFq3@railoptima.uhkmnya.mongodb.net/railway_planner?retryWrites=true&w=majority"
    DB_USER: str = "ankitkarmakar200512_db_user"
    DB_PASSWORD: str = "iaRBstUjDm2HrFq3"
    
    # Google Maps Integration API Key
    MAP_API_KEY: str = "AIzaSyAnidLeEYWpn5GYU7h7GWKrkWr7f58lbd0"
    VITE_MAP_API_KEY: str = "AIzaSyAnidLeEYWpn5GYU7h7GWKrkWr7f58lbd0"
    VITE_GOOGLE_MAPS_API_KEY: str = "AIzaSyAnidLeEYWpn5GYU7h7GWKrkWr7f58lbd0"

    # OpenRouter AI & LLM Model Keys
    OPENROUTER_API_KEY: str = "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"
    AI_API_KEY: str = "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"
    OPENAI_API_KEY: str = "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"
    VITE_OPENROUTER_API_KEY: str = "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"
    VITE_AI_API_KEY: str = "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"
    
    # ML & Optimization Microservice URL (Port 8001)
    ML_SERVICE_URL: str = "http://127.0.0.1:8001"

    # AI & Vector Engine Keys (Gemini & Pinecone)
    GEMINI_API_KEY: str = "AIzaSyAT8fSsDUfpuxICd-_PZKQkrnLFZicgR54"
    GEMINI_API_KEY_1: str = "AQ.Ab8RN6JXxjmDeYbotsyTqjbFdylAvY3WFRbaJb-63MEBI3iSAg"
    GEMINI_API_KEY_2: str = "AQ.Ab8RN6KD8cINMCw0MjH2ASWRApOLl1EIu96UP6WoYYZ6NTKtmA"
    GEMINI_API_KEY_3: str = "AIzaSyAT8fSsDUfpuxICd-_PZKQkrnLFZicgR54"
    
    PINECONE_API_KEY: str = "pcsk_3GdioE_6er4vnkiz69Heit1xKiEzoZPTePZs8s6Mr14NKQqifVBaLkLtFY9V9ZmBc6daYE"
    PINECONE_API_KEY_1: str = "pcsk_3GdioE_6er4vnkiz69Heit1xKiEzoZPTePZs8s6Mr14NKQqifVBaLkLtFY9V9ZmBc6daYE"
    PINECONE_API_KEY_2: str = "pcsk_2DQHgA_6Wvscc4aThZGbo7Xq43Kxgbb8pHuG6TgzBzy8Sztam6ET77Kwjdw5CaKV8gkDom"

    GEMINI_API_KEYS: List[str] = [
        "AIzaSyAT8fSsDUfpuxICd-_PZKQkrnLFZicgR54",
        "AQ.Ab8RN6JXxjmDeYbotsyTqjbFdylAvY3WFRbaJb-63MEBI3iSAg",
        "AQ.Ab8RN6KD8cINMCw0MjH2ASWRApOLl1EIu96UP6WoYYZ6NTKtmA"
    ]
    PINECONE_API_KEYS: List[str] = [
        "pcsk_3GdioE_6er4vnkiz69Heit1xKiEzoZPTePZs8s6Mr14NKQqifVBaLkLtFY9V9ZmBc6daYE",
        "pcsk_2DQHgA_6Wvscc4aThZGbo7Xq43Kxgbb8pHuG6TgzBzy8Sztam6ET77Kwjdw5CaKV8gkDom"
    ]
    
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
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

settings = Settings()

