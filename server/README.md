# LeftoverLink API (FastAPI Backend)

Backend API for the LeftoverLink PWA, implemented with FastAPI, SQLAlchemy (async), PostgreSQL, and Google Maps.

## Prerequisites

- Python 3.11 or 3.12
- PostgreSQL 14+ (or use Docker)
- Google Maps API key (for Geocoding & Places)

## Setup

```bash
cd server
python -m venv venv
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate   # Windows CMD
# source venv/Scripts/activate  # Windows Git Bash
pip install -r requirements.txt
```

### PostgreSQL

**Option A – Docker (recommended):**

```bash
# From server folder
docker compose up -d

# Database is ready at localhost:5432
```

**Option B – Local PostgreSQL:**

```bash
createdb leftoverlink
# Or: psql -c "CREATE DATABASE leftoverlink;"
```

**Option C – SQLite (no PostgreSQL):**

Set in `.env`:

```
DATABASE_URL=sqlite+aiosqlite:///./leftoverlink.db
```

### Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL` – PostgreSQL: `postgresql+asyncpg://user:password@host:5432/leftoverlink`
- `GOOGLE_MAPS_API_KEY` – For Geocoding & Places (get from [Google Cloud Console](https://console.cloud.google.com/apis/credentials))
- `RESEND_API_KEY` – For delivery feedback emails (get from [Resend API keys](https://resend.com/api-keys))

Recommended for production email trust:

- `EMAIL_FROM` – Verified sender identity, e.g. `Leftover Link <noreply@yourdomain.com>`

### FCM (push) code layout

| Module | Role |
|--------|------|
| `app/services/fcm.py` | Firebase Admin, multicast send |
| `app/services/volunteer_push.py` | Donation → volunteer tokens + push |
| `app/services/fcm_user.py` | Auth FCM debug / test-push hints |

## Run

```bash
python run.py

# Or (on Windows, if `uvicorn` is not recognized, use:)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API runs at **http://localhost:8000**

- Swagger docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Auth

| Method | Path                       | Description                     |
| ------ | -------------------------- | ------------------------------- |
| POST   | `/auth/register/donor`     | Register donor (JSON body)      |
| POST   | `/auth/register/volunteer` | Register volunteer              |
| POST   | `/auth/login`              | Login (returns token + user)    |
| GET    | `/auth/fcm-debug`          | FCM debug status (Bearer)       |
| POST   | `/auth/fcm-token`          | Save current device FCM token (Bearer) |
| POST   | `/auth/fcm-test-push`      | Volunteer: test push (Bearer)   |
| GET    | `/auth/me`                 | Get current user (Bearer token) |
| POST   | `/auth/logout`             | Logout (client discards token)  |

### Donations

| Method | Path                     | Description                                 |
| ------ | ------------------------ | ------------------------------------------- |
| GET    | `/donations`             | List donations (query: q, category, status) |
| GET    | `/donations/{id}`        | Get single donation                         |
| POST   | `/donations`             | Create donation                             |
| POST   | `/donations/{id}/accept` | Accept pickup (volunteer body)              |

### Tasks

| Method | Path                    | Description              |
| ------ | ----------------------- | ------------------------ |
| GET    | `/tasks?volunteer_id=X` | List tasks for volunteer |
| GET    | `/tasks/{id}`           | Get single task          |
| PATCH  | `/tasks/{id}/advance`   | Advance task step        |
| PATCH  | `/tasks/{id}/checklist` | Update checklist         |

### Google Maps

| Method | Path                                   | Description                      |
| ------ | -------------------------------------- | -------------------------------- |
| GET    | `/api/maps/geocode?address=`           | Address → lat/lng                |
| GET    | `/api/maps/reverse-geocode?lat=&lng=`  | lat/lng → address                |
| GET    | `/api/maps/places/autocomplete?input=` | Address suggestions              |
| GET    | `/api/maps/places/details?place_id=`   | Place details (address, lat/lng) |

Requires `GOOGLE_MAPS_API_KEY` in env. Enable Geocoding API and Places API in Google Cloud.

### Demo

| Method | Path               | Description             |
| ------ | ------------------ | ----------------------- |
| POST   | `/demo/reset`      | Reset donations + tasks |
| POST   | `/auth/reset-demo` | Reset users             |

## Request/Response Format

The API expects **camelCase** in JSON bodies for compatibility with the frontend:

- **Donor register**: `{ username, password, fullName, phone, organization?, aadhaarLast4?, aadhaarConsent, idFrontImage?, idBackImage? }`
- **Volunteer register**: `{ username, password, fullName, phone, city?, hasVehicle? }`
- **Login**: `{ username, password }`
- **Create donation**: `{ donorName, donorPhoneMasked, pickupBy, category, servingsEstimate, items, pickupLocation, notes?, dietaryTags? }`
- **Accept pickup**: `{ volunteerId, volunteerName, volunteerPhoneMasked }` or `{ id, name, phoneMasked }`

Responses use camelCase as well (e.g. `donorName`, `createdAt`, `pickupBy`).

## Run tests

```bash
# From the project root
cd server

# Tests use SQLite (DATABASE_URL overridden in conftest) - no PostgreSQL needed
pytest          # normal run
pytest -v       # verbose with individual test names
```

### Test coverage

The `server/tests/test_api.py` module contains async tests that exercise all public API groups:

- **Auth**: `/auth/register/donor`, `/auth/register/volunteer`, `/auth/login`, `/auth/me`, `/auth/logout`, `/auth/reset-demo`
- **Donations**: `/donations`, `/donations/{id}`, `/donations` (create), `/donations/{id}/accept`
- **Tasks**: `/tasks?volunteer_id=`, `/tasks/{id}`, `/tasks/{id}/advance`, `/tasks/{id}/checklist`, `/tasks/{id}/deliver`
- **Feedback**: `/feedback/by-token/{token}` (GET and POST, including duplicate‑submission handling)
- **Google Maps**: `/api/maps/geocode`, `/api/maps/reverse-geocode`, `/api/maps/places/autocomplete`, `/api/maps/places/details` (external Google calls are mocked in tests)
- **Demo utilities**: `/demo/reset`

Tests run against a temporary SQLite database file (`server/test.db`) configured in `conftest.py`, so they are fast and do not require PostgreSQL.
