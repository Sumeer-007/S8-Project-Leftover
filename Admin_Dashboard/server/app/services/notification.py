"""Placeholder for approval/rejection notifications."""
from __future__ import annotations
import logging

_log = logging.getLogger(__name__)


async def notify_user_approved(user_id: str, email: str | None, username: str) -> None:
    if email:
        _log.info("Approval notification (would send email to %s for user %s)", email, username)


async def notify_user_rejected(user_id: str, email: str | None, username: str) -> None:
    if email:
        _log.info("Rejection notification (would send email to %s for user %s)", email, username)
