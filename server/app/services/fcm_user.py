"""FCM helpers for authenticated user flows (debug + test push hints)."""
from __future__ import annotations

from pathlib import Path

from app.models.user import User
from app.services.fcm import firebase_admin_ready, resolve_firebase_credentials_path


def fcm_status_for_user(user: User) -> dict:
    tok = (user.fcm_token or "").strip()
    cred = resolve_firebase_credentials_path()
    return {
        "username": user.username,
        "role": user.role,
        "hasFcmToken": bool(tok),
        "tokenLength": len(tok),
        "firebaseAdminOk": firebase_admin_ready(),
        "credentialsFileExists": bool(cred and Path(cred).is_file()),
    }


def hint_for_test_push(detail: dict) -> str:
    if (detail.get("success_count") or 0) > 0:
        return "Check device notifications (tab in background)."
    errs = detail.get("fcm_errors") or []
    blob = " ".join(str(e) for e in errs).lower()
    if "not found" in blob or "unregistered" in blob:
        return (
            "Token invalid or expired — use “Save device token” on My Tasks, then test again."
        )
    return "See fcmDetail.fcm_errors. Keep tab in background when testing."
