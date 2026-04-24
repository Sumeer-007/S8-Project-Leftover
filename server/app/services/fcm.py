"""Firebase Cloud Messaging — Admin SDK init and multicast send (FCM HTTP v1 via send_each_for_multicast)."""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any, Iterable, Mapping

from app.config import settings

_log = logging.getLogger(__name__)

CHUNK_SIZE = 500

_firebase_app = None
_firebase_available = True


def resolve_firebase_credentials_path() -> str | None:
    p = settings.firebase_credentials_path
    if not p or not str(p).strip():
        return None
    path = Path(p)
    if path.is_file():
        return str(path.resolve())
    server_dir = Path(__file__).resolve().parent.parent.parent
    alt = server_dir / path.name
    if alt.is_file():
        return str(alt.resolve())
    return str(path)


def resolve_firebase_credentials_dict() -> dict[str, str] | None:
    private_key = (settings.firebase_private_key or "").strip()
    if not private_key:
        return None

    required = {
        "project_id": (settings.firebase_project_id or "").strip(),
        "private_key_id": (settings.firebase_private_key_id or "").strip(),
        "private_key": private_key.replace("\\n", "\n"),
        "client_email": (settings.firebase_client_email or "").strip(),
        "client_id": (settings.firebase_client_id or "").strip(),
        "client_x509_cert_url": (settings.firebase_client_x509_cert_url or "").strip(),
    }
    if not all(required.values()):
        return None

    return {
        "type": "service_account",
        "project_id": required["project_id"],
        "private_key_id": required["private_key_id"],
        "private_key": required["private_key"],
        "client_email": required["client_email"],
        "client_id": required["client_id"],
        "auth_uri": settings.firebase_auth_uri,
        "token_uri": settings.firebase_token_uri,
        "auth_provider_x509_cert_url": settings.firebase_auth_provider_x509_cert_url,
        "client_x509_cert_url": required["client_x509_cert_url"],
        "universe_domain": settings.firebase_universe_domain,
    }


def firebase_admin_ready() -> bool:
    return _init_firebase() is not None


def _init_firebase():
    global _firebase_app, _firebase_available
    if not _firebase_available:
        return None
    if _firebase_app is not None:
        return _firebase_app
    cred_dict = resolve_firebase_credentials_dict()
    cred_path = resolve_firebase_credentials_path()
    if not cred_dict and not cred_path:
        _log.info("Firebase credentials not configured; push disabled.")
        _firebase_available = False
        return None
    if not cred_dict and cred_path and not Path(cred_path).is_file():
        _log.error(
            "Firebase JSON missing at %s — set FIREBASE_* env vars or FIREBASE_CREDENTIALS_PATH",
            cred_path,
        )
        _firebase_available = False
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials

        cert_source = cred_dict if cred_dict is not None else cred_path
        _firebase_app = firebase_admin.initialize_app(credentials.Certificate(cert_source))
        _log.info("Firebase Admin initialized.")
        return _firebase_app
    except ImportError:
        _log.warning("Install firebase-admin for push.")
        _firebase_available = False
        return None
    except Exception:
        _log.exception("Firebase Admin init failed")
        _firebase_available = False
        return None


def _dedupe_tokens(tokens: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for t in tokens:
        s = str(t).strip() if t else ""
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out


def _webpush_config(title: str, body: str, messaging) -> Any | None:
    client = settings.client_base_url.rstrip("/")
    link = (getattr(settings, "fcm_web_push_link", None) or "").strip()
    if not link.startswith("https://") and client.lower().startswith("https://"):
        link = client + "/"
    if not link.startswith("https://"):
        return None
    try:
        icon = None
        cand = f"{client}/pwa-192x192.png"
        if cand.lower().startswith("https://"):
            icon = cand
        return messaging.WebpushConfig(
            notification=messaging.WebpushNotification(title=title, body=body, icon=icon),
            fcm_options=messaging.WebpushFCMOptions(link=link),
        )
    except Exception as e:
        _log.debug("webpush config skipped: %s", e)
        return None


def send_push_to_volunteers_sync(
    tokens: Iterable[str],
    title: str,
    body: str,
    data: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Send to many FCM tokens. Returns diagnostic dict for APIs."""
    cred_dict = resolve_firebase_credentials_dict()
    cred = resolve_firebase_credentials_path()
    cred_ok = bool(cred_dict) or bool(cred and Path(cred).is_file())
    token_list = _dedupe_tokens(tokens)
    report: dict[str, Any] = {
        "firebase_admin_ok": False,
        "credentials_path": cred if not cred_dict else None,
        "credentials_source": "env" if cred_dict else "file",
        "credentials_file_exists": cred_ok,
        "tokens_requested": len(token_list),
        "success_count": 0,
        "failure_count": 0,
        "fcm_errors": [],
        "batch_errors": [],
        "skipped_reason": None,
    }

    if not token_list:
        report["skipped_reason"] = "no_tokens"
        return report

    app = _init_firebase()
    if not app:
        report["skipped_reason"] = (
            "firebase_admin_not_initialized" if cred_ok else "missing_or_invalid_credentials_file"
        )
        return report

    report["firebase_admin_ok"] = True
    try:
        from firebase_admin import messaging

        data_dict = {k: str(v) for k, v in (data or {}).items()}
        use_each = hasattr(messaging, "send_each_for_multicast")
        if not use_each:
            _log.warning("Upgrade firebase-admin>=6.2 for send_each_for_multicast.")

        webpush = _webpush_config(title, body, messaging)
        err_samples: list[str] = []
        batch_errs: list[str] = []
        total_ok = total_fail = 0

        for i in range(0, len(token_list), CHUNK_SIZE):
            chunk = token_list[i : i + CHUNK_SIZE]
            kw: dict[str, Any] = {
                "notification": messaging.Notification(title=title, body=body),
                "tokens": chunk,
                "data": data_dict,
            }
            if webpush is not None:
                kw["webpush"] = webpush
            try:
                msg = messaging.MulticastMessage(**kw)
                resp = (
                    messaging.send_each_for_multicast(msg, app=app)
                    if use_each
                    else messaging.send_multicast(msg, app=app)
                )
            except Exception as e:
                batch_errs.append(str(e)[:400])
                _log.warning("FCM send error: %s", e)
                total_fail += len(chunk)
                continue

            total_ok += resp.success_count
            total_fail += resp.failure_count
            _log.info("FCM chunk %s-%s ok=%s fail=%s", i, i + len(chunk) - 1, resp.success_count, resp.failure_count)
            for idx, sr in enumerate(resp.responses):
                if not sr.success:
                    ex = str(sr.exception) if sr.exception else "unknown"
                    if ex not in err_samples and len(err_samples) < 8:
                        err_samples.append(ex)
                    prev = chunk[idx][:24] + "…" if len(chunk[idx]) > 24 else chunk[idx]
                    _log.warning("FCM fail %s: %s", prev, sr.exception)

        report.update(
            success_count=total_ok,
            failure_count=total_fail,
            fcm_errors=err_samples,
            batch_errors=batch_errs,
            skipped_reason=None if total_ok else "fcm_all_failed_or_no_success",
        )
        return report
    except Exception as e:
        _log.exception("FCM exception")
        report["batch_errors"].append(str(e)[:500])
        report["skipped_reason"] = "exception"
        return report


async def send_push_to_volunteers(
    tokens: Iterable[str],
    title: str,
    body: str,
    data: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    return await asyncio.to_thread(send_push_to_volunteers_sync, tokens, title, body, data)
