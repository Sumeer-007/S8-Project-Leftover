"""Application configuration."""
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings from env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "LeftoverLink API"
    debug: bool = False
    # PostgreSQL: postgresql+asyncpg://user:password@host:port/dbname
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/leftoverlink"
    secret_key: str = "leftoverlink-dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175"
    # Admin app is built and deployed separately. Add its URL(s) here so it can fetch donations (comma-separated).
    # e.g. https://admin.yourdomain.com or http://localhost:5174 for local dev.
    admin_cors_origins: str = ""
    # Google Maps API key for Geocoding & Places
    google_maps_api_key: Optional[str] = None
    # Resend.com API key for sending emails (free tier: 100/day). Leave empty to skip sending.
    resend_api_key: Optional[str] = None
    # Verified sender address/name used in Resend emails.
    # Example: "Leftover Link <noreply@yourdomain.com>"
    email_from: Optional[str] = None
    # If true, /tasks/{id}/deliver sends email synchronously and returns delivery status/error in API response.
    delivery_email_debug: bool = False
    # Base URL of the client app (for feedback links in emails). e.g. https://yourapp.com
    client_base_url: str = "http://localhost:5173"
    # Optional full URL to use for feedback links instead of client_base_url/feedback/{token}.
    # Example: https://forms.gle/your-google-form-id
    feedback_public_url: Optional[str] = None
    # HTTPS URL for FCM webpush "open link" when client_base_url is http (localhost). FCM requires HTTPS for that field.
    # e.g. Firebase Hosting default: https://YOUR-PROJECT.web.app
    fcm_web_push_link: Optional[str] = Field(default=None)
    # Firebase Admin SDK JSON path. Set FIREBASE_CREDENTIALS_PATH in .env (full path on Windows OK).
    firebase_credentials_path: Optional[str] = Field(
        default="leftover-link-13fa4-firebase-adminsdk-fbsvc-27e4bc50da.json",
    )
    # Firebase Admin SDK credentials from env (preferred for deployments where JSON file is not committed).
    firebase_project_id: Optional[str] = None
    firebase_private_key_id: Optional[str] = None
    firebase_private_key: Optional[str] = None
    firebase_client_email: Optional[str] = None
    firebase_client_id: Optional[str] = None
    firebase_auth_uri: str = "https://accounts.google.com/o/oauth2/auth"
    firebase_token_uri: str = "https://oauth2.googleapis.com/token"
    firebase_auth_provider_x509_cert_url: str = "https://www.googleapis.com/oauth2/v1/certs"
    firebase_client_x509_cert_url: Optional[str] = None
    firebase_universe_domain: str = "googleapis.com"
    # If set, GET /debug/fcm?key=<secret> and POST /debug/fcm/test-send?key=<secret> work without DEBUG=true.
    fcm_debug_secret: Optional[str] = Field(default=None)


settings = Settings()
