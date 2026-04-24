# Admin Dashboard — Step 1 document pre-check (“AI”)

Technical reference for how automated verification is implemented in **Admin_Dashboard**. Last aligned with codebase: April 2026.

## What “AI” means here

The feature is an **AI-style Step 1 document pre-check**: it is **not** a large language model or a trained neural classifier. Implementation uses:

- **Optional Tesseract OCR** (via `pytesseract`), languages `eng+hin`
- **Classical image heuristics** (blur proxy, size, entropy) with **Pillow** and **NumPy**
- **Rule-based text checks** (keywords, regex)
- **Deterministic validation** — **Verhoeff checksum** for 12-digit Aadhaar numbers

Source of truth: `Admin_Dashboard/server/app/services/document_verification.py` (module docstring describes “without ML”).

## Architecture overview

| Layer | Role |
|--------|------|
| **Admin API** (`Admin_Dashboard/server`) | Runs verification when listing pending users; writes results to the database. |
| **Shared database** | Same DB as the main app; column `users.verification_ai_json` stores the cached JSON report. |
| **Admin UI** (`Admin_Dashboard/src`) | Calls `GET /pending-users` and renders `verificationAi` in the **Step 1 — AI pre-check** panel. |

Admin-only APIs and this service live under **`Admin_Dashboard/`**, not under the main `server/` app (see `Admin_Dashboard/README.md`).

## End-to-end flow

1. Users sign up via the main app; document images are stored as **data URLs** (base64) on `User` columns (e.g. donor ID front/back, FSSAI cert; volunteer ID proof).
2. An authenticated admin opens the dashboard; the client requests **`GET /pending-users`**.
3. For each **PENDING** user with **`verification_ai_json` null**, the server runs `verify_user_documents(user)` inside **`asyncio.to_thread(...)`** so blocking OCR/image work does not stall the async event loop.
4. The session assigns `verification_ai_json` and **commits** (see `get_db` in `database.py`), so the report is **cached** for subsequent loads.
5. Each user in the JSON response includes **`verificationAi`**; the React **`AiPrecheckPanel`** displays summary and per-section statuses.

**Important:**

- Only **`GET /pending-users`** backfills missing reports. **`GET /users`** returns stored JSON only; it does not regenerate analysis.
- If `verify_user_documents` raises, the handler **swallows** the exception for that user, so **`verificationAi` may stay null** and the UI shows no pre-check panel.

## Report schema (conceptual)

`build_verification_report_for_user` returns JSON (currently **`version`: 1**) including:

| Field | Meaning |
|--------|---------|
| `generatedAt` | UTC ISO timestamp |
| `ocrEngine` | `"tesseract"` if `pytesseract` is available, else `"none"` |
| `role` | `DONOR` or `VOLUNTEER` |
| `step1Overall` | Rolled up from sub-blocks: **fail** if any sub-block fails; else **warn** if any warns; else **pass** |
| `step1Summary` | Short human-readable description of what was checked |
| `donor` / `volunteer` | Nested objects with per-image or per-field detail (`status`, `issues`, OCR samples, etc.) |

The TypeScript type `VerificationAiReport` in `Admin_Dashboard/src/lib/api.ts` types the top level; nested blocks are flexible records.

## Image pipeline (server)

### Decoding

`_decode_data_url` parses `data:<mime>;base64,...` strings from the ORM into raw bytes.

### Quality heuristics (`_image_metrics_from_bytes`)

- Opens images with **Pillow**; records dimensions and byte length.
- Flags very small resolution and very small files.
- **Blur proxy**: variance of a **discrete Laplacian** on a downscaled grayscale image → `blurScore`; low values flag `possibly_blurry_or_flat`.
- **Entropy** from `ImageStat` on luminance when available.

### OCR (`_ocr_text`)

If Tesseract and Pillow are available: `image_to_string` with `lang="eng+hin"`. Otherwise OCR text is empty and checks fall back to warnings with explicit issue strings.

## Donor-specific logic

**Inputs:** `donor_id_front_image`, `donor_id_back_image`, `donor_food_safety_cert_image`, `donor_aadhaar_last4`.

### Aadhaar front/back (`_score_doc_block`)

1. Image metrics + OCR.
2. **Keyword lists** (e.g. `aadhaar`, `uidai`, `government`; back adds `address`, `male`, `female`). Count drives pass/warn/fail for the keyword stage, combined with other rules.
3. Extract **12-digit** sequences with first digit **2–9** from digit-stripped OCR text.
4. **Verhoeff** validation on candidates (`_verhoeff_valid_aadhaar`).
5. **Form cross-check**: if the user entered enough digits, compare **last 4** to OCR-derived candidates; mismatch adds `aadhaar_number_mismatch_with_user_form`.
6. Per-block `status` merges keyword outcome, checksum findings, image issues, and mismatches.

### Food safety / FSSAI (`_score_fssai_block`)

OCR plus keywords (`fssai`, `food safety`, `license`, `fbo`, …) and **heuristic 14-digit**-style number extraction (`_extract_fssai_like_numbers`). Not a live registry lookup.

**Donor overall:** `_rollup_status` over front, back, and cert (worst of the three wins).

## Volunteer-specific logic

Volunteers do not upload Aadhaar card images in this app; the report text states that only **typed Aadhaar number + ID scan** are used.

1. **`_score_aadhaar_number_entry`**: validates **`volunteer_aadhaar_last4`** as digit string — full **12-digit Verhoeff** when 12 digits present; otherwise warn/fail as coded.
2. **`_score_volunteer_id_proof`**: OCR on **`volunteer_id_proof_image`** with NGO/volunteer-ish keywords (`ngo`, `trust`, `nss`, `volunteer`, …).

**Volunteer overall:** rollup over the number block and the ID proof block.

## Frontend (`Admin_Dashboard/src/pages/Dashboard.tsx`)

- **`AiPrecheckPanel`** is **read-only**: it displays `step1Overall`, `ocrEngine`, `step1Summary`, and per-line statuses. It does not run models in the browser.
- Manual “verify before approve” checkboxes are **separate local React state** — **Step 2** remains **human** approval/rejection.

## Dependencies and operations

- **Python:** see `Admin_Dashboard/server/requirements.txt` — includes **Pillow**, **NumPy**, **pytesseract**.
- **OS:** **Tesseract** must be installed on the host for OCR; without it, text-based checks degrade with explicit issue messages in the JSON.

## Testing

This section is written for **testing documentation** (test plan / evidence): scope, levels, automation, and gaps.

### Objectives

| Objective | How it is addressed |
|-----------|----------------------|
| **Correctness of deterministic rules** | Unit tests for Verhoeff, regex extraction, keyword thresholds, rollup ordering, and form-vs-OCR last-4 logic. |
| **Stable behavior without external OCR** | `_ocr_text` is **monkeypatched** in tests so results do not depend on Tesseract version, fonts, or host OS. |
| **Regression safety for report shape** | `build_verification_report_for_user` / `verify_user_documents` exercised for DONOR and VOLUNTEER with realistic field wiring (`SimpleNamespace` + data URLs). |
| **API contract** | One HTTP test ensures `GET /pending-users` invokes verification when `verification_ai_json` is null and returns `verificationAi` on the JSON user object. |

### Test levels

| Level | Location | Role |
|-------|-----------|------|
| **Unit** | `test_document_verification.py` (classes `TestVerhoeff`, `TestDecodeDataUrl`, `TestOcrHelpers`, `TestRollup`, `TestScoreAadhaarNumberEntry`, `TestImageMetrics`, `TestScoreDocBlockWithMockOcr`, …) | Isolated behavior of helpers and scoring functions; OCR simulated. |
| **Integration (service)** | `TestBuildVerificationReport` | End-to-end report dict for a synthetic user object without HTTP. |
| **Integration (API)** | `test_pending_users_attaches_verification_json` | FastAPI + DB: pending user row, authenticated `GET /pending-users`, stubbed `verify_user_documents`, cleanup. |

### Prerequisites

- **pytest** (install if needed: `pip install pytest`)
- **Pillow** and **NumPy** — same stack as `Admin_Dashboard/server/requirements.txt` (tests use `pytest.importorskip("PIL.Image")` so collection can proceed; image-based tests skip if Pillow is missing).
- **Tesseract is not required** for the automated suite: OCR is **monkeypatched** (`_ocr_text`) wherever deterministic text output is needed, so CI and local runs do not depend on the OS Tesseract binary.

### How to run

From the Admin server directory:

```bash
cd Admin_Dashboard/server
python -m pytest tests/test_document_verification.py -v
```

Run the full Admin backend test suite (includes `test_admin_api.py`):

```bash
python -m pytest tests/ -v
```

### Traceability (feature → tests)

| Implementation area | Test anchor (conceptual) |
|---------------------|---------------------------|
| Aadhaar Verhoeff | `TestVerhoeff` — valid UID `200016999983`, invalid check digit, length, leading digit `0`/`1`. |
| Data URL → bytes | `TestDecodeDataUrl` — PNG data URL; null / non-data URL. |
| Keyword tiers for OCR text | `TestOcrHelpers.test_ocr_status_from_text_keyword_counts` |
| 12-digit & FSSAI-like extraction | `TestOcrHelpers` — `_extract_12_digit_aadhaar_candidates`, `_extract_fssai_like_numbers` |
| Overall Step 1 rollup | `TestRollup` — `_rollup_status` precedence fail → warn → pass. |
| Volunteer typed Aadhaar field | `TestScoreAadhaarNumberEntry` |
| Image quality flags | `TestImageMetrics` — `_image_metrics_from_bytes` on 120×120 vs 40×40 PNG. |
| Donor / FSSAI / volunteer ID blocks with controlled “OCR” | `TestScoreDocBlockWithMockOcr`, `TestScoreFssaiWithMockOcr`, `TestScoreVolunteerIdProofWithMockOcr` |
| Full JSON report | `TestBuildVerificationReport` |
| Admin API exposes `verificationAi` | `test_pending_users_attaches_verification_json` |

### What is **not** covered by automation (manual / future)

Use this list in formal test plans to document **explicit gaps**:

- **Real Tesseract** on real scanned ID images (quality, skew, Hindi vs English mix) — not asserted in CI; optional **manual** or **snapshot** tests in a controlled environment with Tesseract installed.
- **Frontend** `AiPrecheckPanel` rendering — no component/E2E tests in `Admin_Dashboard/server/tests`; consider Playwright/Cypress against the Vite app if required by release policy.
- **Performance / load** — time to verify many pending users in one request.
- **Failure swallowing** in `list_pending_users` when `verify_user_documents` raises — behavior is “no `verificationAi`”; no dedicated test for silent failure today.

### Notes for maintainers

- **No LLM or cloud APIs** are involved; tests remain offline and deterministic once OCR is mocked.
- The HTTP integration test proves the **router wires** `verify_user_documents` and exposes **`verificationAi`** on the JSON payload; it does **not** assert real Tesseract output.
- If you change rollup rules, keyword lists, or Verhoeff usage, update **`test_document_verification.py`** and the traceability table above together.

## One-line summary

**The Admin Dashboard “AI” is a server-side, cached JSON report from OCR (Tesseract, EN+HI), image heuristics, keyword/regex rules, and Aadhaar Verhoeff validation; it assists admins as Step 1 before manual Step 2 approve/reject, and is not an LLM or ML classifier.**
