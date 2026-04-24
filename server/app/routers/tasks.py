"""Tasks API routes for volunteer pickup workflow."""
import random
import uuid
from datetime import datetime
from email.utils import parseaddr
from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user_optional
from app.config import settings
from app.database import get_db
from app.models.donation import Donation
from app.models.delivery import DeliveryRecipient, Feedback as FeedbackModel
from app.models.task import Task
from app.schemas.task import TaskChecklistPatch, DeliverRequest
from app.services.notification import (
    send_delivery_notification,
    send_delivery_notification_detailed,
)


router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_to_response(t: Task) -> dict:
    """Convert Task model to frontend Task shape."""
    return {
        "id": t.id,
        "donationId": t.donation_id,
        "volunteerId": t.volunteer_id,
        "step": t.step,
        "checklist": {
            "sealed": t.checklist_sealed,
            "labelled": t.checklist_labelled,
            "noLeak": t.checklist_no_leak,
            "onTime": t.checklist_on_time,
            "note": t.checklist_note or "",
        },
        "updatedAt": t.updated_at.isoformat() if t.updated_at else datetime.utcnow().isoformat(),
    }


@router.get("", response_model=list)
async def list_tasks(
    db: Annotated[AsyncSession, Depends(get_db)],
    volunteer_id: str = Query(..., description="Volunteer ID to list tasks for"),
):
    """List tasks for a volunteer."""
    result = await db.execute(
        select(Task)
        .where(Task.volunteer_id == volunteer_id)
        .order_by(Task.updated_at.desc())
    )
    tasks = list(result.scalars().all())
    return [_task_to_response(t) for t in tasks]


@router.get("/{task_id}")
async def get_task(
    task_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a single task by ID."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    t = result.scalar_one_or_none()
    if not t:
        return None
    return _task_to_response(t)


@router.patch("/{task_id}/advance")
async def advance_task(
    task_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Advance task step: READY -> STARTED -> PICKED_UP. Use POST /tasks/{id}/deliver to mark DELIVERED with end-user details."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    if task.step == "PICKED_UP":
        raise HTTPException(
            400,
            "Use POST /tasks/{task_id}/deliver with endUser (name, address, email, phone) to mark as delivered.",
        )

    next_step = {
        "READY": "STARTED",
        "STARTED": "PICKED_UP",
    }.get(task.step)
    if not next_step:
        raise HTTPException(400, "Task already completed")

    task.step = next_step
    task.updated_at = datetime.utcnow()

    donation_result = await db.execute(select(Donation).where(Donation.id == task.donation_id))
    donation = donation_result.scalar_one_or_none()
    if donation:
        donation.status = {
            "STARTED": "ASSIGNED",
            "PICKED_UP": "PICKED_UP",
        }.get(next_step, donation.status)

    await db.flush()
    return _task_to_response(task)


@router.post("/{task_id}/deliver")
async def mark_delivered(
    task_id: str,
    body: DeliverRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Mark task as delivered and record end-user details. Sends email with feedback link to recipient."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    if task.step != "PICKED_UP":
        raise HTTPException(400, "Task must be in PICKED_UP step before marking delivered")

    eu = body.endUser
    if eu.email:
        _, parsed_email = parseaddr(eu.email.strip())
        if not parsed_email or "@" not in parsed_email:
            raise HTTPException(400, "End user email is invalid")
    if not eu.email and not eu.phone:
        raise HTTPException(400, "End user email or phone is required to send feedback link")

    feedback_token = str(uuid.uuid4()).replace("-", "")[:32]
    recipient = DeliveryRecipient(
        id=f"DR-{random.randint(1000, 9999)}",
        task_id=task.id,
        name=eu.name,
        age=eu.age,
        address=eu.address,
        email=eu.email or None,
        phone=eu.phone or None,
        feedback_token=feedback_token,
    )
    db.add(recipient)
    task.step = "DELIVERED"
    task.updated_at = datetime.utcnow()

    donation_result = await db.execute(select(Donation).where(Donation.id == task.donation_id))
    donation = donation_result.scalar_one_or_none()
    if donation:
        donation.status = "DELIVERED"

    await db.flush()

    volunteer_name = (donation.assigned_volunteer_data or {}).get("name", "Volunteer") if donation else "Volunteer"
    donor_name = donation.donor_name if donation else "Donor"
    if settings.feedback_public_url:
        feedback_url = settings.feedback_public_url.strip()
    else:
        feedback_url = f"{settings.client_base_url.rstrip('/')}/feedback/{feedback_token}"

    email_attempted = False
    email_sent = False
    email_error = ""
    if eu.email:
        if settings.delivery_email_debug:
            email_result = await send_delivery_notification_detailed(
                eu.email,
                volunteer_name,
                donor_name,
                feedback_url,
            )
            email_attempted = bool(email_result.get("attempted"))
            email_sent = bool(email_result.get("sent"))
            email_error = str(email_result.get("error") or "")
        else:
            background_tasks.add_task(
                send_delivery_notification,
                eu.email,
                volunteer_name,
                donor_name,
                feedback_url,
            )
            email_attempted = True

    response = _task_to_response(task)
    response["feedbackUrl"] = feedback_url
    if settings.delivery_email_debug:
        response["emailAttempted"] = email_attempted
        response["emailSent"] = email_sent
        response["emailError"] = email_error
    return response


@router.patch("/{task_id}/checklist")
async def save_checklist(
    task_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    patch: TaskChecklistPatch,
):
    """Update task checklist fields."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    if patch.sealed is not None:
        task.checklist_sealed = patch.sealed
    if patch.labelled is not None:
        task.checklist_labelled = patch.labelled
    if patch.noLeak is not None:
        task.checklist_no_leak = patch.noLeak
    if patch.onTime is not None:
        task.checklist_on_time = patch.onTime
    if patch.note is not None:
        task.checklist_note = patch.note

    task.updated_at = datetime.utcnow()
    await db.flush()
    return _task_to_response(task)
