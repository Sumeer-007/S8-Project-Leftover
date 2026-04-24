"""Email notifications (Resend). FCM lives in app.services.fcm."""
from __future__ import annotations

import asyncio
import logging
from email.utils import parseaddr

from app.config import settings

# Re-export for routers that still import from notification
from app.services.fcm import (  # noqa: F401
    firebase_admin_ready,
    resolve_firebase_credentials_path,
    send_push_to_volunteers,
    send_push_to_volunteers_sync,
)

_log = logging.getLogger(__name__)


def _normalize_email(value: str | None) -> str:
    return (value or "").strip()


def _resolve_from_addr() -> str:
    configured = _normalize_email(getattr(settings, "email_from", None))
    fallback = "Leftover Link <onboarding@resend.dev>"
    if not configured:
        return fallback
    _, addr = parseaddr(configured)
    # Keep a safe sender if the configured value is not a valid mailbox.
    return configured if addr and "@" in addr else fallback


def _send_email_sync(to_email: str, volunteer_name: str, donor_name: str, feedback_url: str) -> bool:
    import resend

    resend.api_key = settings.resend_api_key
    to_addr = _normalize_email(to_email)
    from_addr = _resolve_from_addr()
    html = (
        f"<p>Hello,</p>"
        f"<p><strong>{volunteer_name}</strong> has successfully delivered the food from <strong>{donor_name}</strong>.</p>"
        f"<p>Hope you are happy with the service.</p>"
        f"<p>Please take a moment to share your feedback (food quality, any issues, etc.):</p>"
        f'<p><a href="{feedback_url}" style="background:#0f766e;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;">Give feedback</a></p>'
        f"<p>Thank you!</p>"
    )
    payload = {
        "from": from_addr,
        "to": [to_addr],
        "subject": "Food delivered – please share your feedback",
        "html": html,
    }
    try:
        resend.Emails.send(payload)
    except Exception:
        # Fallback for common misconfiguration: custom FROM not verified in Resend.
        if from_addr != "Leftover Link <onboarding@resend.dev>":
            payload["from"] = "Leftover Link <onboarding@resend.dev>"
            resend.Emails.send(payload)
        else:
            raise
    return True


async def send_delivery_notification_detailed(
    to_email: str,
    volunteer_name: str,
    donor_name: str,
    feedback_url: str,
) -> dict[str, str | bool]:
    if not settings.resend_api_key:
        return {"attempted": False, "sent": False, "error": "RESEND_API_KEY is not configured"}
    try:
        await asyncio.to_thread(_send_email_sync, to_email, volunteer_name, donor_name, feedback_url)
        _log.info("Delivery email sent to %s", to_email)
        return {"attempted": True, "sent": True, "error": ""}
    except Exception as e:
        _log.exception("Delivery email failed %s: %s", to_email, e)
        return {"attempted": True, "sent": False, "error": str(e)}


async def send_delivery_notification(
    to_email: str,
    volunteer_name: str,
    donor_name: str,
    feedback_url: str,
) -> bool:
    result = await send_delivery_notification_detailed(
        to_email, volunteer_name, donor_name, feedback_url
    )
    return bool(result["sent"])


async def notify_user_approved(user_id: str, email: str | None, username: str) -> None:
    if email:
        _log.info("Approval notification (placeholder) → %s user=%s", email, username)


async def notify_user_rejected(user_id: str, email: str | None, username: str) -> None:
    if email:
        _log.info("Rejection notification (placeholder) → %s user=%s", email, username)
