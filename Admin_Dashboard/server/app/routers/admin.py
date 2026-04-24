"""Admin API routes – no /admin prefix; this app is the admin API."""
import asyncio
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.deps import get_current_admin
from app.auth.jwt import hash_password, verify_password, create_access_token
from app.database import get_db
from app.models.admin import Admin
from app.models.user import User, USER_STATUS_PENDING, USER_STATUS_APPROVED, USER_STATUS_REJECTED
from app.schemas.admin import AdminLoginRequest, AdminTokenResponse, AdminRegisterRequest
from app.services.notification import notify_user_approved, notify_user_rejected
from app.services.document_verification import verify_user_documents

router = APIRouter(tags=["admin"])


def _admin_to_response(a: Admin) -> dict:
    return {
        "id": a.id,
        "username": a.username,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
    }


def _user_to_admin_response(u: User) -> dict:
    out = {
        "id": u.id,
        "role": u.role,
        "username": u.username,
        "status": getattr(u, "status", "APPROVED"),
        "email": getattr(u, "email", None),
        "createdAt": u.created_at.isoformat() if u.created_at else None,
        "fullName": u.donor_full_name or u.volunteer_full_name or "",
        "phone": u.donor_phone or u.volunteer_phone or "",
        "organization": u.donor_organization if u.role == "DONOR" else None,
        "city": u.volunteer_city if u.role == "VOLUNTEER" else None,
    }
    if u.role == "DONOR":
        out["aadhaarLast4"] = u.donor_aadhaar_last4
        out["idFrontImage"] = getattr(u, "donor_id_front_image", None)
        out["idBackImage"] = getattr(u, "donor_id_back_image", None)
        out["foodSafetyCertImage"] = getattr(u, "donor_food_safety_cert_image", None)
    else:
        out["aadhaarLast4"] = getattr(u, "volunteer_aadhaar_last4", None)
        out["volunteerIdType"] = getattr(u, "volunteer_id_type", None)
        out["volunteerIdProofImage"] = getattr(u, "volunteer_id_proof_image", None)
    out["verificationAi"] = getattr(u, "verification_ai_json", None)
    return out


def _generate_id(prefix: str = "ADM") -> str:
    import random
    return f"{prefix}-{random.randint(10000, 99999)}"


@router.post("/login", response_model=AdminTokenResponse)
async def admin_login(req: AdminLoginRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    uname = req.username.strip().lower()
    if not uname or not req.password:
        raise HTTPException(400, "Username and password required")
    result = await db.execute(select(Admin).where(Admin.username == uname))
    admin = result.scalar_one_or_none()
    if not admin or not verify_password(req.password, admin.hashed_password):
        raise HTTPException(401, "Invalid username or password")
    token = create_access_token({"sub": f"admin:{admin.id}"})
    return AdminTokenResponse(token=token, admin=_admin_to_response(admin))


@router.post("/signup", response_model=AdminTokenResponse)
async def admin_signup(req: AdminRegisterRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    uname = req.username.strip().lower()
    if not uname or not req.password or len(req.password) < 4:
        raise HTTPException(400, "Username and password (min 4 chars) required")
    result = await db.execute(select(Admin).where(Admin.username == uname))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Username already exists")
    admin = Admin(
        id=_generate_id(),
        username=uname,
        hashed_password=hash_password(req.password),
    )
    db.add(admin)
    await db.flush()
    token = create_access_token({"sub": f"admin:{admin.id}"})
    return AdminTokenResponse(token=token, admin=_admin_to_response(admin))


@router.get("/me")
async def admin_me(admin: Annotated[Admin, Depends(get_current_admin)]):
    return _admin_to_response(admin)


@router.get("/pending-users")
async def list_pending_users(
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(User).where(User.status == USER_STATUS_PENDING).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    for u in users:
        if getattr(u, "verification_ai_json", None) is None:
            try:
                u.verification_ai_json = await asyncio.to_thread(verify_user_documents, u)
            except Exception:
                pass
    await db.flush()
    return [_user_to_admin_response(u) for u in users]


@router.get("/users")
async def list_all_users(
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [_user_to_admin_response(u) for u in users]


@router.post("/users/{user_id}/approve")
async def approve_user(
    user_id: str,
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    if user.status != USER_STATUS_PENDING:
        raise HTTPException(400, f"User is not pending (status={user.status})")
    user.status = USER_STATUS_APPROVED
    await db.flush()
    await notify_user_approved(user.id, getattr(user, "email", None), user.username)
    return {"ok": True, "user": _user_to_admin_response(user)}


@router.post("/users/{user_id}/reject")
async def reject_user(
    user_id: str,
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    if user.status != USER_STATUS_PENDING:
        raise HTTPException(400, f"User is not pending (status={user.status})")
    user.status = USER_STATUS_REJECTED
    await db.flush()
    await notify_user_rejected(user.id, getattr(user, "email", None), user.username)
    return {"ok": True, "user": _user_to_admin_response(user)}
