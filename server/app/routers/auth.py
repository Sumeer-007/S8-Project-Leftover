"""Auth API routes."""
import asyncio
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, get_current_volunteer
from app.auth.jwt import hash_password, verify_password, create_access_token
from app.database import get_db
from app.models.user import User, USER_STATUS_PENDING, USER_STATUS_APPROVED
from app.schemas.auth import (
    DonorRegisterRequest,
    VolunteerRegisterRequest,
    LoginRequest,
    TokenResponse,
    RegisterResponse,
    DonorProfile,
    VolunteerProfile,
    FcmTokenBody,
)


router = APIRouter(tags=["auth"])


def _user_to_response(u: User) -> dict:
    """Convert User model to frontend User shape."""
    base = {
        "id": u.id,
        "role": u.role,
        "username": u.username,
        "status": getattr(u, "status", "APPROVED"),
        "createdAt": u.created_at.isoformat() if u.created_at else datetime.utcnow().isoformat(),
    }
    if u.role == "DONOR":
        base["donor"] = DonorProfile(
            full_name=u.donor_full_name or "",
            phone=u.donor_phone or "",
            organization=u.donor_organization,
            aadhaar_last4=u.donor_aadhaar_last4,
            aadhaar_consent=u.donor_aadhaar_consent or False,
            id_front_image=u.donor_id_front_image,
            id_back_image=u.donor_id_back_image,
            food_safety_cert_image=getattr(u, "donor_food_safety_cert_image", None),
        ).model_dump()
        base["volunteer"] = None
    else:
        base["volunteer"] = VolunteerProfile(
            full_name=u.volunteer_full_name or "",
            phone=u.volunteer_phone or "",
            city=u.volunteer_city,
            has_vehicle=u.volunteer_has_vehicle or False,
            aadhaar_last4=getattr(u, "volunteer_aadhaar_last4", None),
            aadhaar_consent=getattr(u, "volunteer_aadhaar_consent", False) or False,
            volunteer_id_type=getattr(u, "volunteer_id_type", None),
            volunteer_id_proof_image=getattr(u, "volunteer_id_proof_image", None),
        ).model_dump()
        base["donor"] = None
    return base


def _generate_user_id(prefix: str = "U") -> str:
    import random
    return f"{prefix}-{random.randint(100000, 999999)}"


@router.post("/register/donor", response_model=RegisterResponse)
async def register_donor(
    req: DonorRegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new donor. Account is created as PENDING until admin approves."""
    uname = req.username.strip().lower()
    if not uname:
        raise HTTPException(400, "Username required")
    if not req.password or len(req.password) < 4:
        raise HTTPException(400, "Password must be at least 4 characters")
    if not req.full_name.strip():
        raise HTTPException(400, "Full name required")
    if not req.phone.strip():
        raise HTTPException(400, "Phone required")
    if not req.aadhaar_consent:
        raise HTTPException(400, "Aadhaar consent required for verification")
    if not req.id_front_image or not req.id_back_image:
        raise HTTPException(400, "Aadhaar front and back images are required (owner ID verification)")
    if not req.food_safety_cert_image:
        raise HTTPException(400, "Food safety / health certificate is required (upload image)")

    result = await db.execute(select(User).where(User.username == uname))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Username already exists")

    user = User(
        id=_generate_user_id(),
        role="DONOR",
        username=uname,
        hashed_password=hash_password(req.password),
        status=USER_STATUS_PENDING,
        email=(req.email or "").strip() or None,
        donor_full_name=req.full_name.strip(),
        donor_phone=req.phone.strip(),
        donor_organization=req.organization.strip() or None if req.organization else None,
        donor_aadhaar_last4=req.aadhaar_last4.strip() or None if req.aadhaar_last4 else None,
        donor_aadhaar_consent=req.aadhaar_consent,
        donor_id_front_image=req.id_front_image,
        donor_id_back_image=req.id_back_image,
        donor_food_safety_cert_image=req.food_safety_cert_image,
    )
    db.add(user)
    await db.flush()

    return RegisterResponse(user=_user_to_response(user), pending=True, token=None)


@router.post("/register/volunteer", response_model=RegisterResponse)
async def register_volunteer(
    req: VolunteerRegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new volunteer. Account is created as PENDING until admin approves."""
    uname = req.username.strip().lower()
    if not uname:
        raise HTTPException(400, "Username required")
    if not req.password or len(req.password) < 4:
        raise HTTPException(400, "Password must be at least 4 characters")
    if not req.full_name.strip():
        raise HTTPException(400, "Full name required")
    if not req.phone.strip():
        raise HTTPException(400, "Phone required")
    if not req.aadhaar_consent:
        raise HTTPException(400, "Aadhaar consent required for verification")
    if not req.volunteer_id_type or not req.volunteer_id_type.strip():
        raise HTTPException(400, "Volunteer ID type required (e.g. DYFI, NSS, NGO coordinator)")
    if not req.volunteer_id_proof_image:
        raise HTTPException(400, "Proof of volunteer ID is required (upload image of your ID card / membership)")

    result = await db.execute(select(User).where(User.username == uname))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Username already exists")

    user = User(
        id=_generate_user_id(),
        role="VOLUNTEER",
        username=uname,
        hashed_password=hash_password(req.password),
        status=USER_STATUS_PENDING,
        email=(req.email or "").strip() or None,
        volunteer_full_name=req.full_name.strip(),
        volunteer_phone=req.phone.strip(),
        volunteer_city=req.city.strip() or None if req.city else None,
        volunteer_has_vehicle=req.has_vehicle,
        volunteer_aadhaar_last4=req.aadhaar_last4.strip() or None if req.aadhaar_last4 else None,
        volunteer_aadhaar_consent=req.aadhaar_consent,
        volunteer_id_type=req.volunteer_id_type.strip(),
        volunteer_id_proof_image=req.volunteer_id_proof_image,
    )
    db.add(user)
    await db.flush()

    return RegisterResponse(user=_user_to_response(user), pending=True, token=None)


@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Login with username and password. Only APPROVED users can sign in."""
    uname = req.username.strip().lower()
    result = await db.execute(select(User).where(User.username == uname))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid username or password")
    status = getattr(user, "status", USER_STATUS_APPROVED)
    if status != USER_STATUS_APPROVED:
        raise HTTPException(
            403,
            detail="pending" if status == USER_STATUS_PENDING else "rejected",
        )

    # Only persist non-empty FCM tokens (empty string would wipe a valid token).
    if req.token and str(req.token).strip():
        user.fcm_token = str(req.token).strip()
    if req.location is not None and isinstance(req.location, dict):
        user.last_location = req.location
    user.is_logged_in = True
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(token=token, user=_user_to_response(user))


@router.get("/fcm-debug")
async def auth_fcm_debug(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Debug FCM setup for the logged-in user."""
    await db.refresh(user)
    from app.services.fcm_user import fcm_status_for_user

    return fcm_status_for_user(user)


@router.post("/fcm-token")
async def auth_update_fcm_token(
    body: FcmTokenBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Save this browser’s current FCM token (call after getToken()). Fixes “Requested entity was not found.”"""
    user.fcm_token = body.token.strip()
    await db.commit()
    return {"ok": True, "tokenLength": len(user.fcm_token)}


@router.post("/fcm-test-push")
async def auth_fcm_test_push(
    user: Annotated[User, Depends(get_current_volunteer)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Send a test push to this volunteer’s saved FCM token (same path as donation alerts)."""
    await db.refresh(user)
    tok = (user.fcm_token or "").strip()
    if not tok:
        raise HTTPException(
            status_code=400,
            detail="No FCM token saved. Allow notifications and log in again (or check VITE_FIREBASE_VAPID_KEY).",
        )
    from app.services.fcm import send_push_to_volunteers_sync
    from app.services.fcm_user import hint_for_test_push

    detail = await asyncio.to_thread(
        send_push_to_volunteers_sync,
        [tok],
        "Leftover Link — test",
        "If you see this, FCM from the server works.",
        {"testPush": "true"},
    )
    ok = (detail.get("success_count") or 0) > 0
    return {"ok": ok, "fcmDetail": detail, "hint": hint_for_test_push(detail)}


@router.get("/me")
async def me(
    user: Annotated[User, Depends(get_current_user)],
):
    """Get current authenticated user."""
    return _user_to_response(user)


@router.post("/logout")
async def logout(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Logout and mark user offline for push targeting."""
    user.is_logged_in = False
    await db.commit()
    return {"ok": True}

