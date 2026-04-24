"""Donation models."""
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Float, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Donation(Base):
    __tablename__ = "donations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    donor_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("users.id"), nullable=True)
    donor_name: Mapped[str] = mapped_column(String(256), nullable=False)
    donor_phone_masked: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    pickup_by: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING")
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    servings_estimate: Mapped[int] = mapped_column(Integer, nullable=False)
    items: Mapped[dict] = mapped_column(JSON, nullable=False)  # list of {name, quantity, unit}
    pickup_location: Mapped[dict] = mapped_column(JSON, nullable=False)  # {label, address, lat, lng}
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    dietary_tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # list of strings
    assigned_volunteer_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    assigned_volunteer_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {id, name, phoneMasked}

    donor_user: Mapped["User | None"] = relationship("User", back_populates="donations", foreign_keys=[donor_id])
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="donation", foreign_keys="Task.donation_id")
