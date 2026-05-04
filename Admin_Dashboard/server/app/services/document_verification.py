"""
AI-style document pre-check (Step 1) for admin verification — Admin_Dashboard server only.

Uses Pillow + optional Tesseract OCR; blur / size heuristics without ML.
Install Tesseract (https://github.com/tesseract-ocr/tesseract) and pytesseract for OCR.
"""

from __future__ import annotations

import base64
import io
import re
from datetime import datetime, timezone
from typing import Any

# Pillow / numpy required for image analysis
try:
    from PIL import Image, ImageStat
except ImportError:
    Image = None  # type: ignore
    ImageStat = None  # type: ignore

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore

try:
    import pytesseract
except ImportError:
    pytesseract = None  # type: ignore

# Verhoeff checksum for Aadhaar (12 digits, first digit 2-9)
_VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
_VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]


def _digits_in_text(text: str) -> int:
    return sum(1 for c in text if c.isdigit())


def _ocr_substantial_aadhaar_heuristic(text: str) -> bool:
    """True when OCR has enough readable text+digits typical of an ID/Aadhaar scan (helps PASS when only 1 English keyword matched)."""
    t = text.strip()
    if len(t) < 48:
        return False
    return _digits_in_text(t) >= 10


def _verhoeff_valid_aadhaar(digits: str) -> bool:
    if not re.match(r"^[2-9]\d{11}$", digits):
        return False
    c = 0
    inverted = [int(x) for x in digits[::-1]]
    for i, n in enumerate(inverted):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][n]]
    return c == 0


def _decode_data_url(data_url: str | None) -> tuple[bytes | None, str | None]:
    if not data_url or not isinstance(data_url, str):
        return None, None
    if not data_url.startswith("data:"):
        return None, None
    try:
        head, b64 = data_url.split(",", 1)
        mime = head.split(";")[0].replace("data:", "").strip() or "image/jpeg"
        raw = base64.b64decode(b64)
        if len(raw) < 200:
            return raw, mime
        return raw, mime
    except Exception:
        return None, None


def _laplacian_variance_gray(gray: Any) -> float:
    """Higher = sharper; very low suggests blur or flat image."""
    if np is None:
        return 50.0
    arr = np.asarray(gray, dtype=np.float64)
    if arr.size < 4:
        return 0.0
    h, w = arr.shape
    if h < 3 or w < 3:
        return float(np.var(arr))
    lap = (
        -4.0 * arr[1:-1, 1:-1]
        + arr[:-2, 1:-1]
        + arr[2:, 1:-1]
        + arr[1:-1, :-2]
        + arr[1:-1, 2:]
    )
    return float(np.var(lap))


def _image_metrics_from_bytes(raw: bytes) -> dict[str, Any]:
    out: dict[str, Any] = {
        "bytes": len(raw),
        "width": None,
        "height": None,
        "blurScore": None,
        "entropy": None,
        "issues": [],
    }
    if Image is None or not raw:
        out["issues"].append("Pillow not installed")
        return out
    try:
        im = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        out["issues"].append(f"invalid_image:{e!s}")
        return out
    w, h = im.size
    out["width"], out["height"] = w, h
    if w < 80 or h < 80:
        out["issues"].append("resolution_too_small")
    gray = im.convert("L")
    small = gray.resize((max(32, w // 4), max(32, h // 4)))
    out["blurScore"] = round(_laplacian_variance_gray(small), 2)
    if ImageStat is not None:
        try:
            st = ImageStat.Stat(gray)
            ent = getattr(st, "entropy", None)
            if ent is not None:
                out["entropy"] = round(ent[0] if isinstance(ent, (list, tuple)) else float(ent), 2)
        except Exception:
            pass
    if out["blurScore"] is not None and out["blurScore"] < 8:
        out["issues"].append("possibly_blurry_or_flat")
    if out["bytes"] is not None and out["bytes"] < 2500:
        out["issues"].append("file_very_small")
    return out


def _ocr_text(raw: bytes) -> tuple[str, str]:
    if pytesseract is None or Image is None:
        return "", "none"
    try:
        im = Image.open(io.BytesIO(raw))
        # Phone photo IDs are often small in pixels — upscale before OCR for better reads.
        w, h = im.size
        if w > 0 and w < 1400:
            scale = min(2.5, 1400 / w)
            nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
            try:
                resample = Image.Resampling.LANCZOS
            except AttributeError:
                resample = Image.LANCZOS  # Pillow < 9
            im = im.resize((nw, nh), resample)
        gray = im.convert("L")
        # PSM 6 = uniform block of text; typical for card scans (better than default).
        text = pytesseract.image_to_string(
            gray,
            lang="eng+hin",
            config="--oem 3 --psm 6",
        )
        return text or "", "tesseract"
    except Exception:
        return "", "tesseract_error"


def _ocr_status_from_text(text: str, keywords: list[str]) -> tuple[str, list[str]]:
    found = [k for k in keywords if k.lower() in text.lower()]
    if len(found) >= 2:
        return "pass", found
    if len(found) == 1:
        return "warn", found
    return "fail", found


def _extract_12_digit_aadhaar_candidates(text: str) -> list[str]:
    digits = re.sub(r"\D", "", text)
    cands: list[str] = []
    for m in re.finditer(r"[2-9]\d{11}", digits):
        cands.append(m.group(0))
    return cands


def _extract_fssai_like_numbers(text: str) -> list[str]:
    """FSSAI license is often 14 digits."""
    out: list[str] = []
    for m in re.finditer(r"\b1\d{13}\b", re.sub(r"\s+", " ", text)):
        out.append(m.group(0))
    for m in re.finditer(r"\b\d{14}\b", text):
        digits = m.group(0)
        if digits not in out:
            out.append(digits)
    return out[:5]


def _score_doc_block(
    label: str,
    raw: bytes | None,
    *,
    aadhaar_keywords: list[str],
    user_aadhaar_digits: str | None,
) -> dict[str, Any]:
    block: dict[str, Any] = {"label": label, "status": "warn", "ocrEngine": "none", "ocrSample": ""}
    if not raw:
        block["status"] = "fail"
        block["issues"] = ["missing_image"]
        return block
    metrics = _image_metrics_from_bytes(raw)
    block["image"] = metrics
    text, engine = _ocr_text(raw)
    block["ocrEngine"] = engine
    block["ocrSample"] = (text[:400] + "…") if len(text) > 400 else text
    if engine == "none" and not text.strip():
        block["status"] = "warn"
        block["issues"] = list(metrics.get("issues") or []) + [
            "ocr_unavailable_install_tesseract_and_pytesseract_for_text_checks",
        ]
        return block
    st, kw = _ocr_status_from_text(text, aadhaar_keywords)
    block["keywordMatch"] = kw

    aadhaar_cands = _extract_12_digit_aadhaar_candidates(text)
    valid_aadhaar = [x for x in aadhaar_cands if _verhoeff_valid_aadhaar(x)]
    block["aadhaarCandidatesFound"] = len(valid_aadhaar) > 0
    match_user = None
    if user_aadhaar_digits and user_aadhaar_digits.strip():
        u = re.sub(r"\D", "", user_aadhaar_digits.strip())
        if len(u) >= 4:
            last4 = u[-4:]
            cands = valid_aadhaar + aadhaar_cands
            # Only score mismatch when OCR actually produced a 12-digit candidate; otherwise unknown (OCR miss).
            if cands:
                for cand in cands:
                    if cand.endswith(last4):
                        match_user = True
                        break
                if match_user is None:
                    match_user = False
    block["aadhaarDigitsMatchUser"] = match_user

    issues = list(metrics.get("issues") or [])
    if st == "fail" and not valid_aadhaar:
        issues.append("no_aadhaar_keywords_or_checksum")
    if match_user is False:
        issues.append("aadhaar_number_mismatch_with_user_form")

    stripped = text.strip()
    severe_image = "resolution_too_small" in issues or any(str(i).startswith("invalid_image") for i in issues)

    keyword_or_uid_strong = st == "pass" or (
        st == "warn" and (_ocr_substantial_aadhaar_heuristic(text) or _digits_in_text(stripped) >= 18)
    )
    positive_evidence = bool(valid_aadhaar or match_user is True or keyword_or_uid_strong)

    # Definite FAIL: unreadable thumbnail, OCR number disagrees with form, or OCR looks unrelated to UID.
    if severe_image:
        block["status"] = "fail"
    elif match_user is False:
        block["status"] = "fail"
    elif positive_evidence:
        block["status"] = "pass"
    elif st == "fail" and stripped and len(stripped) >= 100 and not aadhaar_cands and _digits_in_text(stripped) < 14:
        # Long text blocks with almost no digits rarely look like card scans → likely wrong upload.
        block["status"] = "fail"
        issues.append("likely_not_an_id_document_by_ocr_shape")
    elif st == "fail" and len(stripped) <= 26:
        # Too little OCR to judge authenticity — keep ambiguous.
        block["status"] = "warn"
    else:
        block["status"] = "warn"

    if issues:
        block["issues"] = issues
    return block


def _score_fssai_block(raw: bytes | None) -> dict[str, Any]:
    block: dict[str, Any] = {"label": "food_safety_cert", "status": "warn", "ocrEngine": "none", "ocrSample": ""}
    fssai_kw = ["fssai", "food safety", "license", "fbo", "fssai license", "food safety and standards"]
    if not raw:
        block["status"] = "fail"
        block["issues"] = ["missing_image"]
        return block
    metrics = _image_metrics_from_bytes(raw)
    block["image"] = metrics
    text, engine = _ocr_text(raw)
    block["ocrEngine"] = engine
    block["ocrSample"] = (text[:500] + "…") if len(text) > 500 else text
    if engine == "none" and not text.strip():
        block["status"] = "warn"
        block["issues"] = list(metrics.get("issues") or []) + [
            "ocr_unavailable_install_tesseract_and_pytesseract_for_text_checks",
        ]
        return block
    low = text.lower()
    kw_found = [k for k in fssai_kw if k in low]
    nums = _extract_fssai_like_numbers(text)
    block["keywordsFound"] = kw_found
    block["fssaiLikeNumbers"] = nums
    issues = list(metrics.get("issues") or [])
    stripped = text.strip()
    digitish = _digits_in_text(stripped)

    severe_image = "resolution_too_small" in issues or any(str(i).startswith("invalid_image") for i in issues)
    if severe_image:
        block["status"] = "fail"
    elif kw_found or nums:
        block["status"] = "pass"
    elif len(stripped) >= 52 and digitish >= 12:
        # Dense numbers + prose typical of licences even when OCR misses "FSSAI".
        block["status"] = "pass"
        issues.append("license_like_text_without_fssai_keyword_match")
    elif len(stripped) < 14:
        block["status"] = "fail"
        issues.append("insufficient_certificate_text_detected")
    elif len(stripped) >= 100 and digitish < 8:
        block["status"] = "fail"
        issues.append("likely_not_a_food_safety_license_by_ocr_shape")
    else:
        block["status"] = "warn"
        issues.append("no_fssai_keywords_or_license_pattern_in_ocr")
    if issues:
        block["issues"] = issues
    return block


def _score_volunteer_id_proof(
    raw: bytes | None,
    *,
    volunteer_id_type: str | None,
) -> dict[str, Any]:
    block: dict[str, Any] = {"label": "volunteer_id_proof", "status": "warn", "ocrEngine": "none", "ocrSample": ""}
    ngo_kw = ["ngo", "trust", "society", "registration", "coordinator", "nss", "dyfi", "volunteer", "member", "id"]
    if not raw:
        block["status"] = "fail"
        block["issues"] = ["missing_image"]
        return block
    metrics = _image_metrics_from_bytes(raw)
    block["image"] = metrics
    text, engine = _ocr_text(raw)
    block["ocrEngine"] = engine
    block["ocrSample"] = (text[:500] + "…") if len(text) > 500 else text
    if engine == "none" and not text.strip():
        block["status"] = "warn"
        block["issues"] = list(metrics.get("issues") or []) + [
            "ocr_unavailable_install_tesseract_and_pytesseract_for_text_checks",
        ]
        return block
    low = text.lower()
    kw_found = [k for k in ngo_kw if k in low]
    block["keywordsFound"] = kw_found
    block["idTypeHint"] = volunteer_id_type
    issues = list(metrics.get("issues") or [])
    stripped = text.strip()

    severe_image = "resolution_too_small" in issues or any(str(i).startswith("invalid_image") for i in issues)
    if severe_image:
        block["status"] = "fail"
        if issues:
            block["issues"] = issues
        return block

    if len(stripped) < 14 and not kw_found:
        issues.append("little_ocr_text")
        block["status"] = "fail"
    elif len(kw_found) >= 1:
        block["status"] = "pass"
    elif len(stripped) >= 52:
        # Regional-language ID cards often omit English NGO keywords — long OCR still suggests a document scan.
        block["status"] = "pass"
        issues.append("id_proof_keyword_miss_rely_on_manual_review")
    elif len(stripped) >= 100 and _digits_in_text(stripped) < 6:
        block["status"] = "fail"
        issues.append("unlikely_id_proof_by_ocr_shape")
    else:
        block["status"] = "warn"
    if issues:
        block["issues"] = issues
    return block


def _score_aadhaar_number_entry(user_digits: str | None) -> dict[str, Any]:
    block: dict[str, Any] = {"label": "aadhaar_number_form", "status": "warn"}
    if not user_digits or not str(user_digits).strip():
        block["status"] = "fail"
        block["issues"] = ["missing"]
        return block
    d = re.sub(r"\D", "", user_digits.strip())
    if len(d) == 12 and _verhoeff_valid_aadhaar(d):
        block["status"] = "pass"
        block["checksumValid"] = True
        block["maskedHint"] = "XXXX" + d[-4:]
    elif len(d) == 12:
        block["status"] = "fail"
        block["issues"] = ["invalid_aadhaar_checksum"]
        block["checksumValid"] = False
    else:
        block["status"] = "warn"
        block["issues"] = ["expected_12_digits_for_full_check"]
    return block


def _rollup_status(parts: list[str]) -> str:
    if any(x == "fail" for x in parts):
        return "fail"
    if any(x == "warn" for x in parts):
        return "warn"
    return "pass"


def build_verification_report_for_user(user: Any) -> dict[str, Any]:
    """Build Step 1 AI report dict for a User ORM (main server model)."""
    now = datetime.now(timezone.utc).isoformat()
    ocr_engine = "tesseract" if pytesseract is not None else "none"

    if getattr(user, "role", None) == "DONOR":
        front_raw, _ = _decode_data_url(getattr(user, "donor_id_front_image", None))
        back_raw, _ = _decode_data_url(getattr(user, "donor_id_back_image", None))
        cert_raw, _ = _decode_data_url(getattr(user, "donor_food_safety_cert_image", None))
        user_aadhaar = getattr(user, "donor_aadhaar_last4", None)

        aadhaar_kw = [
            "aadhaar",
            "uidai",
            "government",
            "govt",
            "unique identification",
            "dob",
            "year of birth",
            "enrolment",
            "enrollment",
            "male",
            "female",
            "address",
            "india",
            "identification",
            "authority",
            "virtual id",
            "vid",
            "help",
            "resident",
            "भारत",
        ]
        front = _score_doc_block(
            "aadhaar_front",
            front_raw,
            aadhaar_keywords=aadhaar_kw,
            user_aadhaar_digits=user_aadhaar,
        )
        back = _score_doc_block(
            "aadhaar_back",
            back_raw,
            aadhaar_keywords=aadhaar_kw + ["address", "male", "female"],
            user_aadhaar_digits=user_aadhaar,
        )
        cert = _score_fssai_block(cert_raw)

        step1 = _rollup_status([front.get("status", "warn"), back.get("status", "warn"), cert.get("status", "warn")])
        summary = (
            "Donor: Aadhaar (front/back) + food-safety/FSSAI certificate pre-check. "
            "PASS/FAIL reflects OCR consistency (not cryptographic proof). "
            "Review samples in Step 2 before approval."
        )
        return {
            "version": 1,
            "generatedAt": now,
            "ocrEngine": ocr_engine,
            "role": "DONOR",
            "step1Overall": step1,
            "step1Summary": summary,
            "donor": {
                "aadhaarFront": front,
                "aadhaarBack": back,
                "foodSafetyCert": cert,
            },
            "volunteer": None,
        }

    # VOLUNTEER
    id_raw, _ = _decode_data_url(getattr(user, "volunteer_id_proof_image", None))
    user_aadhaar = getattr(user, "volunteer_aadhaar_last4", None)
    id_type = getattr(user, "volunteer_id_type", None)
    num_block = _score_aadhaar_number_entry(user_aadhaar)
    id_block = _score_volunteer_id_proof(id_raw, volunteer_id_type=id_type)

    step1 = _rollup_status([num_block.get("status", "warn"), id_block.get("status", "warn")])
    summary = (
        "Volunteer: typed Aadhaar checksum + NGO / NSS / ID scan pre-check using OCR rules. "
        "PASS/FAIL reflects form and scan consistency—not proof against forged images."
    )
    return {
        "version": 1,
        "generatedAt": now,
        "ocrEngine": ocr_engine,
        "role": "VOLUNTEER",
        "step1Overall": step1,
        "step1Summary": summary,
        "donor": None,
        "volunteer": {
            "aadhaarNumber": num_block,
            "idProof": id_block,
        },
    }


def verify_user_documents(user: Any) -> dict[str, Any]:
    """Public entry: run analysis and return JSON-serializable report."""
    return build_verification_report_for_user(user)
 