"""User and auth models."""
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


# User account status: PENDING = awaiting admin approval, APPROVED = can login, REJECTED = denied
USER_STATUS_PENDING = "PENDING"
USER_STATUS_APPROVED = "APPROVED"
USER_STATUS_REJECTED = "REJECTED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # DONOR | VOLUNTEER
    username: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(256), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=USER_STATUS_PENDING)  # PENDING | APPROVED | REJECTED
    email: Mapped[str | None] = mapped_column(String(256), nullable=True)  # for approval/rejection notifications
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    fcm_token: Mapped[str | None] = mapped_column(Text, nullable=True)  # Firebase Cloud Messaging token for push
    last_location: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # { "lat": float, "lng": float }
    is_logged_in: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Donor profile fields
    donor_full_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    donor_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    donor_organization: Mapped[str | None] = mapped_column(String(256), nullable=True)
    donor_aadhaar_last4: Mapped[str | None] = mapped_column(String(8), nullable=True)
    donor_aadhaar_consent: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    donor_id_front_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    donor_id_back_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    donor_food_safety_cert_image: Mapped[str | None] = mapped_column(Text, nullable=True)  # Health/food safety certificate (mandatory)

    # Volunteer profile fields
    volunteer_full_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    volunteer_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    volunteer_city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    volunteer_has_vehicle: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    volunteer_aadhaar_last4: Mapped[str | None] = mapped_column(String(8), nullable=True)
    volunteer_aadhaar_consent: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    volunteer_id_type: Mapped[str | None] = mapped_column(String(64), nullable=True)  # DYFI_MEMBER, NSS_VOLUNTEER, NGO_COORDINATOR, etc.
    volunteer_id_proof_image: Mapped[str | None] = mapped_column(Text, nullable=True)  # Proof of volunteer ID (mandatory)

    # AI pre-check JSON written by Admin API (Admin_Dashboard/server) when reviewing pending users
    verification_ai_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    donations: Mapped[list["Donation"]] = relationship("Donation", back_populates="donor_user", foreign_keys="Donation.donor_id")
