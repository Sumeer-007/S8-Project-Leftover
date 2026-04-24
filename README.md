# LeftoverLink PWA

Food donation and volunteer pickup coordination app.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: FastAPI, PostgreSQL, SQLAlchemy
- **Maps**: Google Maps API (Geocoding, Places)

## Quick Start (Full Stack Test)

### 1. Backend (Terminal 1)

```bash
cd server

# Start PostgreSQL (Docker)
docker compose up -d

# Or use SQLite (no Docker needed)
# Set in server/.env: DATABASE_URL=sqlite+aiosqlite:///./leftoverlink.db

# Setup & run
python -m venv venv
source venv/Scripts/activate   # Git Bash (Windows)
# venv\Scripts\activate       # CMD (Windows)

pip install -r requirements.txt
python run.py
```

Backend: **http://localhost:8000** | Docs: http://localhost:8000/docs

### 2. Frontend (Terminal 2)

```bash
cd client

# Ensure .env exists with VITE_API_BASE
echo "VITE_API_BASE=http://localhost:8000" > .env

npm install
npm run dev
```

Frontend: **http://localhost:5173**

### 3. Test Flow

1. Go to http://localhost:5173 → redirected to Login
2. **Sign up** (donor or volunteer)
3. **Login** → redirected to donor/volunteer home
4. **Donor**: Create donation, view donations
5. **Volunteer**: View pickups, accept pickup, advance task, checklist
6. Backend serves real data (PostgreSQL or SQLite)

## Project Structure

```
client/          # React + Vite frontend
server/          # FastAPI backend
  app/           # API routes, models, schemas
  tests/         # pytest integration tests
```

## Environment

- **server/.env**: `DATABASE_URL`, `GOOGLE_MAPS_API_KEY`, `SECRET_KEY`
- **client/.env**: `VITE_API_BASE` (required for real API)

See `server/.env.example` and `client/.env.example`.
