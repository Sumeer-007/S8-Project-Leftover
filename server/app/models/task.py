"""Task model for volunteer pickup workflow."""
from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    donation_id: Mapped[str] = mapped_column(String(64), ForeignKey("donations.id", ondelete="CASCADE"), nullable=False)
    volunteer_id: Mapped[str] = mapped_column(String(64), nullable=False)  # May reference users.id or demo id
    step: Mapped[str] = mapped_column(String(32), default="READY")  # READY | STARTED | PICKED_UP | DELIVERED
    checklist_sealed: Mapped[bool] = mapped_column(Boolean, default=False)
    checklist_labelled: Mapped[bool] = mapped_column(Boolean, default=False)
    checklist_no_leak: Mapped[bool] = mapped_column(Boolean, default=False)
    checklist_on_time: Mapped[bool] = mapped_column(Boolean, default=False)
    checklist_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    donation: Mapped["Donation"] = relationship("Donation", back_populates="tasks", foreign_keys=[donation_id])
    delivery_recipient: Mapped["DeliveryRecipient | None"] = relationship(
        "DeliveryRecipient", back_populates="task", uselist=False
    )
    feedback: Mapped["Feedback | None"] = relationship(
        "Feedback", back_populates="task", uselist=False
    )
