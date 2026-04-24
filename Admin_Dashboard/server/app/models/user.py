"""User model – same schema as main server (shared DB)."""
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

USER_STATUS_PENDING = "PENDING"
USER_STATUS_APPROVED = "APPROVED"
USER_STATUS_REJECTED = "REJECTED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    username: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(256), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=USER_STATUS_PENDING)
    email: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    donor_full_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    donor_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    donor_organization: Mapped[str | None] = mapped_column(String(256), nullable=True)
    donor_aadhaar_last4: Mapped[str | None] = mapped_column(String(8), nullable=True)
    donor_aadhaar_consent: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    donor_id_front_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    donor_id_back_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    donor_food_safety_cert_image: Mapped[str | None] = mapped_column(Text, nullable=True)

    volunteer_full_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    volunteer_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    volunteer_city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    volunteer_has_vehicle: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    volunteer_aadhaar_last4: Mapped[str | None] = mapped_column(String(8), nullable=True)
    volunteer_aadhaar_consent: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    volunteer_id_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    volunteer_id_proof_image: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Step 1 AI pre-check; written by Admin API (this app), not the main PWA server
    verification_ai_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
