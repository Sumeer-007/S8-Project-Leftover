"""Select volunteers for donation alerts and run FCM send."""
from __future__ import annotations

import asyncio
import logging
import math
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.donation import Donation
from app.models.user import User
from app.services.fcm import firebase_admin_ready, send_push_to_volunteers_sync

_log = logging.getLogger(__name__)

_RADIUS_KM = 5.0
_MAX_DEVICES = 20


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a)))


def _volunteers_with_tokens(rows: list[User]) -> list[User]:
    return [v for v in rows if (v.fcm_token or "").strip()]


async def _tokens_for_donation(db: AsyncSession, donation: Donation) -> tuple[list[str], int]:
    result = await db.execute(
        select(User).where(
            User.role == "VOLUNTEER",
            User.fcm_token.isnot(None),
            User.is_logged_in.is_(True),
        )
    )
    volunteers = _volunteers_with_tokens(list(result.scalars().all()))
    n_vol = len(volunteers)
    pickup = donation.pickup_location if isinstance(donation.pickup_location, dict) else {}
    lat, lng = pickup.get("lat"), pickup.get("lng")

    # Strict geofence rule: only notify volunteers within 5km of pickup.
    if lat is None or lng is None:
        return [], n_vol

    ranked: list[tuple[float, str]] = []
    for v in volunteers:
        loc = v.last_location or {}
        if loc.get("lat") is None or loc.get("lng") is None:
            continue
        try:
            d = _haversine_km(float(lat), float(lng), float(loc["lat"]), float(loc["lng"]))
        except (TypeError, ValueError):
            continue
        ranked.append((d, v.fcm_token.strip()))

    ranked.sort(key=lambda x: x[0])
    tokens = [t for d_km, t in ranked if d_km <= _RADIUS_KM][:_MAX_DEVICES]
    return tokens, n_vol


def volunteer_push_payload(
    *,
    volunteers_with_fcm: int,
    devices_targeted: int,
    fcm_detail: dict[str, Any],
    delivered: bool,
) -> dict[str, Any]:
    admin = fcm_detail.get("firebase_admin_ok")
    if admin is None:
        admin = firebase_admin_ready()
    return {
        "volunteersWithFcmToken": volunteers_with_fcm,
        "devicesTargeted": devices_targeted,
        "fcmDelivered": delivered,
        "fcmSuccessCount": fcm_detail.get("success_count", 0),
        "fcmFailureCount": fcm_detail.get("failure_count", 0),
        "fcmErrors": fcm_detail.get("fcm_errors", []),
        "skippedReason": fcm_detail.get("skipped_reason"),
        "firebaseAdminOk": admin,
        "credentialsFileExists": fcm_detail.get("credentials_file_exists"),
        "fcmDetail": fcm_detail,
    }


async def notify_volunteers_new_donation(db: AsyncSession, donation: Donation) -> dict[str, Any]:
    """Build volunteerPush object after creating a donation."""
    fcm_detail: dict[str, Any] = {}
    vol_count = devices = 0
    delivered = False

    try:
        tokens, vol_count = await _tokens_for_donation(db, donation)
        devices = len(tokens)

        if not tokens:
            _log.warning("No volunteer FCM tokens for donation %s", donation.id)
            fcm_detail = {
                "firebase_admin_ok": firebase_admin_ready(),
                "skipped_reason": "no_volunteer_fcm_tokens_in_database",
                "tokens_requested": 0,
                "hint": "Volunteer login with notifications + VITE_FIREBASE_VAPID_KEY",
            }
        else:
            title = "New food donation created"
            body = f"{donation.category} donation from {donation.donor_name}"
            data = {"donationId": donation.id, "category": donation.category, "pickupBy": str(donation.pickup_by)}
            _log.info("FCM donation %s → %s device(s)", donation.id, len(tokens))
            fcm_detail = await asyncio.to_thread(
                send_push_to_volunteers_sync, list(tokens), title, body, dict(data)
            )
            delivered = (fcm_detail.get("success_count") or 0) > 0
            if not delivered:
                _log.warning(
                    "FCM donation %s: ok=%s fail=%s %s",
                    donation.id,
                    fcm_detail.get("success_count"),
                    fcm_detail.get("failure_count"),
                    fcm_detail.get("fcm_errors"),
                )
    except Exception:
        _log.exception("Volunteer push failed for %s", donation.id)
        if not fcm_detail:
            fcm_detail = {
                "skipped_reason": "exception_during_push_setup",
                "hint": "See server logs",
                "firebase_admin_ok": firebase_admin_ready(),
            }

    return volunteer_push_payload(
        volunteers_with_fcm=vol_count,
        devices_targeted=devices,
        fcm_detail=fcm_detail,
        delivered=delivered,
    )
