"""Admin backend configuration. Use same DATABASE_URL as main app to share DB."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "LeftoverLink Admin API"
    debug: bool = False
    # Use same DATABASE_URL as main server to share DB (users, admins tables)
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/leftoverlink"
    secret_key: str = "leftoverlink-dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: str = "http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
