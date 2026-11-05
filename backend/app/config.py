import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "SafeCheck"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # AWS Credentials & Settings
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "")
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")

    # Optional mock mode for local testing without AWS account
    MOCK_AWS: bool = os.getenv("MOCK_AWS", "false").lower() in ("true", "1", "yes")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./safecheck.db")

    # CORS Allowed Origins
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS", 
        "http://localhost:3000,http://127.0.0.1:3000,https://*.vercel.app"
    )

    # Moderation Rules (Configurable thresholds)
    THRESHOLD_FLAGGED: float = 30.0
    THRESHOLD_BLOCKED: float = 70.0

    # Max upload image size: 5 MB (Standard for Rekognition inline bytes/S3 standard)
    MAX_IMAGE_SIZE_BYTES: int = 5 * 1024 * 1024

    def get_cors_origins(self) -> List[str]:
        origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        return origins


settings = Settings()
