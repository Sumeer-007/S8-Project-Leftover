"""Tests for Admin document pre-check (OCR + heuristics) in document_verification.py."""

import base64
import io
from types import SimpleNamespace

import pytest

from app.services import document_verification as dv


def _pil_image():
    """Lazy import so test collection works when Pillow is not installed yet."""
    return pytest.importorskip("PIL.Image")


def _png_data_url(width: int = 120, height: int = 120) -> str:
    """Minimal valid PNG as data URL (large enough to avoid resolution_too_small)."""
    Image = _pil_image()
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=(240, 240, 240)).save(buf, format="PNG")
    raw = buf.getvalue()
    return "data:image/png;base64," + base64.b64encode(raw).decode("ascii")


# Verhoeff-valid 12-digit UID (first digit 2–9); verified against _verhoeff_valid_aadhaar
VALID_AADHAAR_12 = "200016999983"
# Same number with wrong check digit
INVALID_CHECKSUM_AADHAAR = "200016999984"


class TestVerhoeff:
    def test_valid_known_sample(self):
        assert dv._verhoeff_valid_aadhaar(VALID_AADHAAR_12) is True

    def test_invalid_checksum(self):
        assert dv._verhoeff_valid_aadhaar(INVALID_CHECKSUM_AADHAAR) is False

    def test_rejects_wrong_length(self):
        assert dv._verhoeff_valid_aadhaar("20001699998") is False
        assert dv._verhoeff_valid_aadhaar("2000169999831") is False

    def test_rejects_leading_0_or_1(self):
        assert dv._verhoeff_valid_aadhaar("100016999983") is False
        assert dv._verhoeff_valid_aadhaar("000016999983") is False


class TestDecodeDataUrl:
    def test_decodes_png(self):
        url = _png_data_url()
        raw, mime = dv._decode_data_url(url)
        assert raw is not None and len(raw) > 50
        assert mime == "image/png"

    def test_none_and_invalid(self):
        assert dv._decode_data_url(None) == (None, None)
        assert dv._decode_data_url("") == (None, None)
        assert dv._decode_data_url("not-a-data-url") == (None, None)


class TestOcrHelpers:
    def test_ocr_status_from_text_keyword_counts(self):
        kw = ["aadhaar", "uidai", "government"]
        st, found = dv._ocr_status_from_text("AADHAAR and UIDAI here", kw)
        assert st == "pass"
        assert len(found) >= 2

        st2, found2 = dv._ocr_status_from_text("only aadhaar", kw)
        assert st2 == "warn"
        assert len(found2) == 1

        st3, found3 = dv._ocr_status_from_text("nothing", kw)
        assert st3 == "fail"
        assert found3 == []

    def test_extract_12_digit_aadhaar_candidates(self):
        text = f"Some text {VALID_AADHAAR_12[:4]} {VALID_AADHAAR_12[4:]}"
        cands = dv._extract_12_digit_aadhaar_candidates(text)
        assert VALID_AADHAAR_12 in cands

    def test_extract_fssai_like_numbers(self):
        text = "License 12345678901234 FSSAI"
        nums = dv._extract_fssai_like_numbers(text)
        assert "12345678901234" in nums


class TestRollup:
    def test_rollup_fail_wins(self):
        assert dv._rollup_status(["pass", "warn", "fail"]) == "fail"

    def test_rollup_warn_second(self):
        assert dv._rollup_status(["pass", "warn", "pass"]) == "warn"

    def test_rollup_all_pass(self):
        assert dv._rollup_status(["pass", "pass"]) == "pass"


class TestScoreAadhaarNumberEntry:
    def test_pass_full_valid_number(self):
        r = dv._score_aadhaar_number_entry(VALID_AADHAAR_12)
        assert r["status"] == "pass"
        assert r.get("checksumValid") is True
        assert r.get("maskedHint") == "XXXX" + VALID_AADHAAR_12[-4:]

    def test_fail_invalid_checksum(self):
        r = dv._score_aadhaar_number_entry(INVALID_CHECKSUM_AADHAAR)
        assert r["status"] == "fail"
        assert "invalid_aadhaar_checksum" in r.get("issues", [])

    def test_fail_missing(self):
        r = dv._score_aadhaar_number_entry(None)
        assert r["status"] == "fail"
        r2 = dv._score_aadhaar_number_entry("   ")
        assert r2["status"] == "fail"

    def test_warn_partial_digits(self):
        r = dv._score_aadhaar_number_entry("9983")
        assert r["status"] == "warn"
        assert "expected_12_digits_for_full_check" in r.get("issues", [])


class TestImageMetrics:
    def test_metrics_on_valid_png(self):
        Image = _pil_image()
        buf = io.BytesIO()
        Image.new("RGB", (120, 120), color="white").save(buf, format="PNG")
        raw = buf.getvalue()
        m = dv._image_metrics_from_bytes(raw)
        assert m["width"] == 120
        assert m["height"] == 120
        assert m["blurScore"] is not None
        assert "resolution_too_small" not in m.get("issues", [])

    def test_tiny_resolution_flag(self):
        Image = _pil_image()
        buf = io.BytesIO()
        Image.new("RGB", (40, 40), color="white").save(buf, format="PNG")
        m = dv._image_metrics_from_bytes(buf.getvalue())
        assert "resolution_too_small" in m.get("issues", [])


class TestScoreDocBlockWithMockOcr:
    """OCR is mocked so tests do not require Tesseract on the host."""

    @pytest.fixture
    def png_bytes(self):
        Image = _pil_image()
        buf = io.BytesIO()
        Image.new("RGB", (120, 120), color="white").save(buf, format="PNG")
        return buf.getvalue()

    def test_missing_image_fails(self):
        r = dv._score_doc_block(
            "aadhaar_front",
            None,
            aadhaar_keywords=["aadhaar", "uidai"],
            user_aadhaar_digits=None,
        )
        assert r["status"] == "fail"
        assert r.get("issues") == ["missing_image"]

    def test_keywords_and_valid_aadhaar_passes(self, png_bytes, monkeypatch):
        text = f"aadhaar uidai government unique identification {VALID_AADHAAR_12}"

        def _fake_ocr(_raw):
            return text, "tesseract"

        monkeypatch.setattr(dv, "_ocr_text", _fake_ocr)
        r = dv._score_doc_block(
            "aadhaar_front",
            png_bytes,
            aadhaar_keywords=["aadhaar", "uidai", "government", "govt", "unique identification"],
            user_aadhaar_digits=VALID_AADHAAR_12,
        )
        assert r["status"] == "pass"
        assert r.get("aadhaarDigitsMatchUser") is True

    def test_last4_mismatch_warns(self, png_bytes, monkeypatch):
        text = f"aadhaar uidai government {VALID_AADHAAR_12}"

        def _fake_ocr(_raw):
            return text, "tesseract"

        monkeypatch.setattr(dv, "_ocr_text", _fake_ocr)
        r = dv._score_doc_block(
            "aadhaar_front",
            png_bytes,
            aadhaar_keywords=["aadhaar", "uidai", "government", "govt", "unique identification"],
            user_aadhaar_digits="1111",
        )
        assert r.get("aadhaarDigitsMatchUser") is False
        assert "aadhaar_number_mismatch_with_user_form" in r.get("issues", [])

    def test_weak_ocr_warns_not_fail(self, png_bytes, monkeypatch):
        """Real scans often yield no English keywords — Step 1 should WARN, not FAIL."""

        def _fake_ocr(_raw):
            return "zzz unreadable noise 123", "tesseract"

        monkeypatch.setattr(dv, "_ocr_text", _fake_ocr)
        r = dv._score_doc_block(
            "aadhaar_front",
            png_bytes,
            aadhaar_keywords=["aadhaar", "uidai"],
            user_aadhaar_digits="8852",
        )
        assert r["status"] == "warn"
        assert r.get("aadhaarDigitsMatchUser") is None

    def test_no_mismatch_flag_when_ocr_has_no_12_digit_candidates(self, png_bytes, monkeypatch):
        def _fake_ocr(_raw):
            return "only one keyword aadhaar here", "tesseract"

        monkeypatch.setattr(dv, "_ocr_text", _fake_ocr)
        r = dv._score_doc_block(
            "aadhaar_front",
            png_bytes,
            aadhaar_keywords=["aadhaar", "uidai", "government"],
            user_aadhaar_digits="8852",
        )
        assert r.get("aadhaarDigitsMatchUser") is None
        assert "aadhaar_number_mismatch_with_user_form" not in r.get("issues", [])


class TestScoreFssaiWithMockOcr:
    def test_fssai_keywords_pass(self, monkeypatch):
        Image = _pil_image()
        buf = io.BytesIO()
        Image.new("RGB", (120, 120), color="white").save(buf, format="PNG")
        raw = buf.getvalue()

        def _fake_ocr(_b):
            return "FSSAI food safety license FBO", "tesseract"

        monkeypatch.setattr(dv, "_ocr_text", _fake_ocr)
        r = dv._score_fssai_block(raw)
        assert r["status"] == "pass"
        assert r.get("keywordsFound")

    def test_missing_image_fails(self):
        r = dv._score_fssai_block(None)
        assert r["status"] == "fail"


class TestScoreVolunteerIdProofWithMockOcr:
    def test_keyword_pass(self, monkeypatch):
        Image = _pil_image()
        buf = io.BytesIO()
        Image.new("RGB", (120, 120), color="white").save(buf, format="PNG")
        raw = buf.getvalue()

        def _fake_ocr(_b):
            return "NSS volunteer coordinator registration society", "tesseract"

        monkeypatch.setattr(dv, "_ocr_text", _fake_ocr)
        r = dv._score_volunteer_id_proof(raw, volunteer_id_type="NSS")
        assert r["status"] == "pass"
        assert r.get("idTypeHint") == "NSS"


class TestBuildVerificationReport:
    def test_donor_report_shape_and_rollup(self, monkeypatch):
        url = _png_data_url()

        def _fake_ocr(_raw):
            return (
                f"aadhaar uidai government unique identification dob {VALID_AADHAAR_12} "
                f"address male female {VALID_AADHAAR_12} "
                f"fssai food safety license 12345678901234",
                "tesseract",
            )

        monkeypatch.setattr(dv, "_ocr_text", _fake_ocr)

        user = SimpleNamespace(
            role="DONOR",
            donor_id_front_image=url,
            donor_id_back_image=url,
            donor_food_safety_cert_image=url,
            donor_aadhaar_last4=VALID_AADHAAR_12,
        )
        report = dv.build_verification_report_for_user(user)
        assert report["version"] == 1
        assert report["role"] == "DONOR"
        assert report["volunteer"] is None
        assert report["donor"] is not None
        assert report["donor"]["aadhaarFront"]["label"] == "aadhaar_front"
        assert report["step1Overall"] in ("pass", "warn", "fail")
        assert report["donor"]["foodSafetyCert"]["label"] == "food_safety_cert"

    def test_volunteer_report_shape(self, monkeypatch):
        url = _png_data_url()

        def _fake_ocr(_raw):
            return "volunteer ngo trust certificate id proof", "tesseract"

        monkeypatch.setattr(dv, "_ocr_text", _fake_ocr)

        user = SimpleNamespace(
            role="VOLUNTEER",
            volunteer_id_proof_image=url,
            volunteer_aadhaar_last4=VALID_AADHAAR_12,
            volunteer_id_type="NGO",
        )
        report = dv.build_verification_report_for_user(user)
        assert report["role"] == "VOLUNTEER"
        assert report["donor"] is None
        assert report["volunteer"]["aadhaarNumber"]["status"] == "pass"
        assert report["volunteer"]["idProof"]["label"] == "volunteer_id_proof"

    def test_verify_user_documents_alias(self, monkeypatch):
        monkeypatch.setattr(dv, "_ocr_text", lambda _r: ("aadhaar uidai government test", "tesseract"))
        user = SimpleNamespace(
            role="DONOR",
            donor_id_front_image=_png_data_url(),
            donor_id_back_image=_png_data_url(),
            donor_food_safety_cert_image=_png_data_url(),
            donor_aadhaar_last4="1234",
        )
        r1 = dv.verify_user_documents(user)
        r2 = dv.build_verification_report_for_user(user)
        assert r1.keys() == r2.keys()


def test_pending_users_attaches_verification_json(client, admin_token, monkeypatch):
    """GET /pending-users calls verify_user_documents when verification_ai_json is unset."""
    import asyncio
    import uuid

    from app.database import AsyncSessionLocal
    from app.models.user import User, USER_STATUS_PENDING
    from app.routers import admin as admin_router
    from app.auth.jwt import hash_password

    uid = f"USR-TEST-AI-{uuid.uuid4().hex[:8]}"
    called: list[str] = []

    def fake_verify(u):
        called.append(getattr(u, "id", ""))
        return {"version": 1, "step1Overall": "pass"}

    monkeypatch.setattr(admin_router, "verify_user_documents", fake_verify)

    async def _seed():
        async with AsyncSessionLocal() as session:
            session.add(
                User(
                    id=uid,
                    role="VOLUNTEER",
                    username=f"testai_{uid}",
                    hashed_password=hash_password("x"),
                    status=USER_STATUS_PENDING,
                    email=None,
                    volunteer_full_name="AI Test",
                    volunteer_aadhaar_last4=VALID_AADHAAR_12,
                    volunteer_id_proof_image=None,
                    verification_ai_json=None,
                )
            )
            await session.commit()

    asyncio.run(_seed())

    try:
        r = client.get("/pending-users", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        pending = r.json()
        match = next((u for u in pending if u["id"] == uid), None)
        assert match is not None
        assert uid in called
        assert match.get("verificationAi") == {"version": 1, "step1Overall": "pass"}
    finally:
        async def _cleanup():
            async with AsyncSessionLocal() as session:
                u = await session.get(User, uid)
                if u:
                    await session.delete(u)
                    await session.commit()

        asyncio.run(_cleanup())
