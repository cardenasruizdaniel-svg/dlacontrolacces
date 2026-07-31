from functools import lru_cache
from typing import Any

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # Application
    APP_NAME: str = "DLA Access Enterprise"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "ERP Enterprise - DLA Redes y Seguridad"
    APP_AUTHOR: str = "DLA Redes y Seguridad"
    APP_EMAIL: str = "dev@dlaredes.com.co"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "dla_access_enterprise_production_secret_key_32_chars_min_hash_2026_xyz"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 90
    MFA_ENABLED: bool = True
    ENCRYPTION_KEY: str = "dla_access_enterprise_encryption_secret_key_2026"

    @model_validator(mode="after")
    def validate_security_keys(self) -> "Settings":
        if not self.SECRET_KEY or len(self.SECRET_KEY) < 32:
            self.SECRET_KEY = "dla_access_enterprise_production_secret_key_32_chars_min_hash_2026_xyz"
        if not self.ENCRYPTION_KEY or self.ENCRYPTION_KEY == "":
            self.ENCRYPTION_KEY = "dla_access_enterprise_encryption_secret_key_2026"
        return self

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./dla_access.db"
    DATABASE_ECHO: bool = False
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None) -> str:
        if not v or v == "" or "localhost:5432" in v:
            return "sqlite+aiosqlite:///./dla_access.db"
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300

    # RabbitMQ
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8080", "http://localhost:8082", "http://localhost:19006", "http://127.0.0.1:3000", "http://127.0.0.1:8080", "http://127.0.0.1:8082", "http://127.0.0.1:19006"]

    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB

    # Geolocation
    DEFAULT_GEOFENCE_RADIUS: float = 100.0  # meters
    GOOGLE_MAPS_API_KEY: str = ""

    # Password policy
    PASSWORD_LOCKOUT_ATTEMPTS: int = 5
    PASSWORD_LOCKOUT_MINUTES: int = 15

    # Facial Recognition
    FACE_RECOGNITION_TOLERANCE: float = 0.6
    FACE_DETECTION_MODEL: str = "hog"

    # Payroll - Colombian Legislation 2026
    MINIMUM_WAGE: int = 1423500
    TRANSPORTATION_ASSISTANCE: int = 200000
    HOUR_VALUE_FACTOR: float = 1.25
    NIGHT_HOUR_FACTOR: float = 1.75
    SUNDAY_HOLIDAY_FACTOR: float = 2.0
    NIGHT_SUNDAY_HOLIDAY_FACTOR: float = 2.5
    OVERTIME_FACTOR: float = 1.25
    NIGHT_OVERTIME_FACTOR: float = 1.75
    SUNDAY_HOLIDAY_OVERTIME_FACTOR: float = 2.0
    CESANTIA_PERCENTAGE: float = 8.33
    PRIMA_SERVICIOS_PERCENTAGE: float = 8.33
    INTERESES_CESANTIA_PERCENTAGE: float = 12.0
    HEALTH_PERCENTAGE: float = 4.0
    PENSION_PERCENTAGE: float = 4.0
    ARL_PERCENTAGE: float = 1.0  # Risk Level 1
    ICBF_PERCENTAGE: float = 3.0
    SENA_PERCENTAGE: float = 2.0
    CAJA_COMPENSACION_PERCENTAGE: float = 4.0

    # AI Assistant
    AI_MODEL: str = "gpt-4"
    AI_API_KEY: str = ""

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
