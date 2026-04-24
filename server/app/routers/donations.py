"""Donations API routes."""
import random
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user, get_current_user_optional, get_current_donor
from app.database import get_db
from app.models.donation import Donation
from app.models.task import Task
from app.models.user import User
from app.schemas.donation import (
    DonationCreate,
    DonationResponse,
    DonationItem,
    Location,
    AssignedVolunteer,
    DeliveryRecipientResponse,
    FeedbackResponse,
)
from app.schemas.task import AcceptPickupRequest
from app.services.volunteer_push import notify_volunteers_new_donation


router = APIRouter(prefix="/donations", tags=["donations"])


def _donation_to_response(
    d: Donation,
    delivery_recipient=None,
    feedback=None,
) -> dict:
    """Convert Donation model to frontend Donation shape. Optionally include delivery recipient and feedback."""
    pickup_location = d.pickup_location if isinstance(d.pickup_location, dict) else {}
    items = d.items if isinstance(d.items, list) else []
    dietary_tags = d.dietary_tags if isinstance(d.dietary_tags, list) else (d.dietary_tags or [])
    pickup_by_val = d.pickup_by
    pickup_by_str = pickup_by_val.isoformat() if hasattr(pickup_by_val, "isoformat") else str(pickup_by_val)
    dr = None
    if delivery_recipient:
        dr = DeliveryRecipientResponse(
            name=delivery_recipient.name,
            age=delivery_recipient.age,
            address=delivery_recipient.address,
            email=delivery_recipient.email,
            phone=delivery_recipient.phone,
        )
    fb = None
    if feedback:
        fb = FeedbackResponse(
            rating=feedback.rating,
            comment=feedback.comment,
            submittedAt=feedback.submitted_at.isoformat() if feedback.submitted_at else "",
        )
    return DonationResponse(
        id=d.id,
        donorName=d.donor_name,
        donorPhoneMasked=d.donor_phone_masked,
        createdAt=d.created_at.isoformat() if d.created_at else datetime.utcnow().isoformat(),
        pickupBy=pickup_by_str,
        status=d.status,
        category=d.category,
        servingsEstimate=d.servings_estimate,
        items=[DonationItem(**x) if isinstance(x, dict) else x for x in items],
        pickupLocation=Location(**pickup_location) if isinstance(pickup_location, dict) else pickup_location,
        notes=d.notes,
        dietaryTags=dietary_tags,
        assignedVolunteer=AssignedVolunteer(**d.assigned_volunteer_data) if d.assigned_volunteer_data else None,
        deliveryRecipient=dr,
        feedback=fb,
    ).model_dump()


def _generate_donation_id() -> str:
    return f"D-{random.randint(1000, 9999)}"


def _get_delivery_and_feedback(donation: Donation):
    """Get first delivery recipient and feedback from donation's tasks."""
    for t in getattr(donation, "tasks", []) or []:
        if getattr(t, "delivery_recipient", None):
            return t.delivery_recipient, getattr(t, "feedback", None)
    return None, None


@router.get("", response_model=list)
async def list_donations(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """List donations with optional filters. Includes delivery recipient and feedback when present."""
    stmt = (
        select(Donation)
        .options(
            selectinload(Donation.tasks).selectinload(Task.delivery_recipient),
            selectinload(Donation.tasks).selectinload(Task.feedback),
        )
        .order_by(Donation.pickup_by.asc())
    )
    result = await db.execute(stmt)
    donations = list(result.scalars().all())

    if category and category != "All":
        donations = [d for d in donations if d.category == category]
    if status and status != "All":
        donations = [d for d in donations if d.status == status]
    if q:
        ql = q.lower()
        donations = [
            d
            for d in donations
            if ql in f"{d.category} {d.pickup_location.get('label','')} {d.pickup_location.get('address','')} {d.status}".lower()
        ]

    return [_donation_to_response(d, *_get_delivery_and_feedback(d)) for d in donations]


@router.get("/{donation_id}")
async def get_donation(
    donation_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a single donation by ID. Includes delivery recipient and feedback when present."""
    stmt = (
        select(Donation)
        .where(Donation.id == donation_id)
        .options(
            selectinload(Donation.tasks).selectinload(Task.delivery_recipient),
            selectinload(Donation.tasks).selectinload(Task.feedback),
        )
    )
    result = await db.execute(stmt)
    d = result.scalar_one_or_none()
    if not d:
        return None
    return _donation_to_response(d, *_get_delivery_and_feedback(d))


@router.post("", response_model=dict)
async def create_donation(
    payload: DonationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)],
    ):
    """Create a new donation. Optionally associate with authenticated donor.

    After creation, a push notification is sent to nearby volunteers (based on last known location).
    """
    donation = Donation(
        id=_generate_donation_id(),
        donor_id=user.id if user and user.role == "DONOR" else None,
        donor_name=payload.donorName,
        donor_phone_masked=payload.donorPhoneMasked,
        pickup_by=datetime.fromisoformat(payload.pickupBy.replace("Z", "+00:00"))
        if "T" in payload.pickupBy
        else datetime.fromisoformat(payload.pickupBy),
        status="PENDING",
        category=payload.category,
        servings_estimate=payload.servingsEstimate,
        items=[x.model_dump() if hasattr(x, "model_dump") else x for x in payload.items],
        pickup_location=payload.pickupLocation.model_dump() if hasattr(payload.pickupLocation, "model_dump") else payload.pickupLocation,
        notes=payload.notes,
        dietary_tags=payload.dietaryTags or [],
    )
    db.add(donation)
    await db.flush()

    volunteer_push = await notify_volunteers_new_donation(db, donation)
    out = _donation_to_response(donation)
    out["volunteerPush"] = volunteer_push
    return out


@router.post("/{donation_id}/accept")
async def accept_pickup(
    donation_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    volunteer: AcceptPickupRequest = Body(...),
):
    """Accept a pickup for a donation."""
    volunteer_id = volunteer.volunteerId or volunteer.id
    volunteer_name = volunteer.volunteerName or volunteer.name
    volunteer_phone_masked = volunteer.volunteerPhoneMasked or volunteer.phoneMasked
    if not all([volunteer_id, volunteer_name, volunteer_phone_masked]):
        raise HTTPException(400, "volunteerId, volunteerName, volunteerPhoneMasked required")

    result = await db.execute(select(Donation).where(Donation.id == donation_id))
    donation = result.scalar_one_or_none()
    if not donation:
        raise HTTPException(404, "Donation not found")
    if donation.status != "PENDING":
        raise HTTPException(400, "Donation is not available")

    donation.status = "ASSIGNED"
    donation.assigned_volunteer_id = volunteer_id
    donation.assigned_volunteer_data = {
        "id": volunteer_id,
        "name": volunteer_name,
        "phoneMasked": volunteer_phone_masked,
    }

    task_id = f"T-{random.randint(1000, 9999)}"
    from app.models.task import Task

    task = Task(
        id=task_id,
        donation_id=donation.id,
        volunteer_id=volunteer_id,
        step="READY",
        checklist_sealed=False,
        checklist_labelled=False,
        checklist_no_leak=False,
        checklist_on_time=False,
        checklist_note="",
    )
    db.add(task)
    await db.flush()

    return {
        "donation": _donation_to_response(donation),
        "task": {
            "id": task.id,
            "donationId": task.donation_id,
            "volunteerId": task.volunteer_id,
            "step": task.step,
            "checklist": {
                "sealed": task.checklist_sealed,
                "labelled": task.checklist_labelled,
                "noLeak": task.checklist_no_leak,
                "onTime": task.checklist_on_time,
                "note": task.checklist_note or "",
            },
            "updatedAt": task.updated_at.isoformat() if task.updated_at else datetime.utcnow().isoformat(),
        },
    }
