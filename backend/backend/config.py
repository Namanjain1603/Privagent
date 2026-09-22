import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "PRIVAGENT Backend"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./privagent.db")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # M1 Client config
    M1_BASE_URL: str = os.getenv("M1_BASE_URL", "http://127.0.0.1:3001")
    M1_PLAN_PATH: str = os.getenv("M1_PLAN_PATH", "/api/m1/plan")
    
    # Security limits
    MAX_REQUEST_SIZE_BYTES: int = 1024 * 1024  # 1MB
    MAX_TARGET_LENGTH: int = 250
    MAX_VALUE_LENGTH: int = 500
    MAX_ACTIONS_PER_PLAN: int = 10
    ALLOWED_NAV_SCHEMES: List[str] = ["http", "https"]
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "chrome-extension://*"
    ]

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }


settings = Settings()
