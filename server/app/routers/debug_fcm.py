"""FCM / push debugging — enable with DEBUG=true or FCM_DEBUG_SECRET in .env."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.fcm import (
    firebase_admin_ready,
    resolve_firebase_credentials_path,
    send_push_to_volunteers_sync,
)

router = APIRouter(prefix="/debug", tags=["debug"])


def _allow_debug(key: Optional[str]) -> bool:
    if settings.debug:
        return True
    if settings.fcm_debug_secret and key == settings.fcm_debug_secret:
        return True
    return False


@router.get("/fcm")
async def debug_fcm_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    key: Optional[str] = None,
):
    """
    Inspect Firebase + volunteer FCM setup.

    **Access:** set `DEBUG=true` in server `.env`, **or** set `FCM_DEBUG_SECRET=some-long-random`
    and call: `GET /debug/fcm?key=some-long-random`
    """
    if not _allow_debug(key):
        raise HTTPException(404, "Not found")

    from pathlib import Path

    cred = resolve_firebase_credentials_path()
    cred_exists = bool(cred and Path(cred).is_file())
    admin_ok = firebase_admin_ready()

    result = await db.execute(
        select(User).where(User.role == "VOLUNTEER", User.fcm_token.isnot(None))
    )
    vols = list(result.scalars().all())
    with_token = [v for v in vols if v.fcm_token and str(v.fcm_token).strip()]

    return {
        "firebaseCredentialsPath": cred,
        "credentialsFileExists": cred_exists,
        "firebaseAdminInitialized": admin_ok,
        "volunteerAccountsWithFcmToken": len(with_token),
        "volunteers": [
            {
                "username": v.username,
                "userId": v.id,
                "tokenLength": len(v.fcm_token) if v.fcm_token else 0,
                "hasLastLocation": bool(getattr(v, "last_location", None)),
            }
            for v in with_token
        ],
        "checklist": [
            "1. credentialsFileExists + firebaseAdminInitialized → backend can call FCM.",
            "2. volunteerAccountsWithFcmToken > 0 → someone logged in as VOLUNTEER with notifications + VITE_FIREBASE_VAPID_KEY.",
            "3. Create a donation; JSON includes volunteerPush with fcmSuccessCount / fcmErrors.",
            "4. Run server with visible logs: uvicorn app.main:app --reload --log-level debug",
        ],
    }


class FcmTestBody(BaseModel):
    token: str = Field(..., min_length=20, description="FCM registration token from browser")


@router.post("/fcm/test-send")
async def debug_fcm_test_send(
    body: FcmTestBody,
    key: Optional[str] = None,
):
    """
    Send one test notification to a single FCM token (same as donation push path).
    Same access as GET /debug/fcm.
    """
    if not _allow_debug(key):
        raise HTTPException(404, "Not found")

    detail = send_push_to_volunteers_sync(
        [body.token.strip()],
        title="Leftover Link test",
        body="If you see this, backend → FCM → your device works.",
        data={"test": "true"},
    )
    return {
        "ok": detail.get("success_count", 0) > 0,
        "detail": detail,
    }
