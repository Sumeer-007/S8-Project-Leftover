"""Public feedback API (by token) for end users."""
import random
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.delivery import DeliveryRecipient, Feedback as FeedbackModel
from app.models.donation import Donation
from app.models.task import Task
from app.schemas.feedback import FeedbackSubmit

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("/by-token/{token}")
async def get_feedback_info(
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return donor and volunteer names for the feedback page. Public, no auth."""
    result = await db.execute(
        select(DeliveryRecipient, Donation)
        .join(Task, DeliveryRecipient.task_id == Task.id)
        .join(Donation, Task.donation_id == Donation.id)
        .where(DeliveryRecipient.feedback_token == token)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(404, "Invalid or expired feedback link")
    recipient, donation = row
    # Check if already submitted
    fb_result = await db.execute(select(FeedbackModel).where(FeedbackModel.task_id == recipient.task_id))
    existing = fb_result.scalar_one_or_none()
    volunteer_name = (donation.assigned_volunteer_data or {}).get("name", "Volunteer")
    return {
        "donorName": donation.donor_name,
        "volunteerName": volunteer_name,
        "alreadySubmitted": existing is not None,
    }


@router.post("/by-token/{token}")
async def submit_feedback(
    token: str,
    body: FeedbackSubmit,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Submit feedback for a delivery. Public, no auth. Idempotent: if already submitted, returns 400."""
    result = await db.execute(
        select(DeliveryRecipient).where(DeliveryRecipient.feedback_token == token)
    )
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(404, "Invalid or expired feedback link")

    existing = await db.execute(select(FeedbackModel).where(FeedbackModel.task_id == recipient.task_id))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Feedback already submitted for this delivery")

    feedback = FeedbackModel(
        id=f"FB-{random.randint(10000, 99999)}",
        task_id=recipient.task_id,
        rating=body.rating,
        comment=body.comment,
        submitted_at=datetime.utcnow(),
    )
    db.add(feedback)
    await db.flush()
    return {"ok": True, "message": "Thank you for your feedback!"}
