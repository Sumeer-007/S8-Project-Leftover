# Leftover Link – Admin (separate build)

Admin panel for approving/rejecting donor and volunteer signups. **Separate build**: own frontend and backend in this folder.

- **Frontend**: port **5174**
- **Backend**: port **8001** (in `server/`)

The Admin backend shares the same database as the main app (client+server) so it can list and approve users.

**Convention:** Admin-only APIs, routes, and services (including document AI pre-check / `document_verification.py`) are maintained under this folder (`Admin_Dashboard/server/` and `Admin_Dashboard/src/`), not under the main `Leftover/server` app.

## Frontend

```bash
cd Admin
npm install
npm run dev
```

Open http://localhost:5174. Set `VITE_ADMIN_API_BASE=http://localhost:8001` in `.env` if the Admin API is not on 8001.

## Backend (Admin API)

```bash
cd Admin/server
python -m venv venv
# Windows: venv\Scripts\activate
# Unix: source venv/bin/activate
pip install -r requirements.txt
```

**Important:** `Admin/server/.env` must use the **same** `DATABASE_URL` as the main server, or pending signups won’t show in the Admin portal. If the main app uses SQLite (`server/.env`), a shared DB is already set in `Admin/server/.env`. If you use PostgreSQL, set the same connection string in both `.env` files.

Run:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Or: `python run.py` (runs on 8001).

First run seeds default admin `admin` / `admin123` if no admin exists.

## API (no `/admin` prefix)

- `POST /login` – admin login  
- `POST /signup` – create first admin  
- `GET /me` – current admin  
- `GET /pending-users` – list PENDING users  
- `GET /users` – list all users  
- `POST /users/{id}/approve` – approve  
- `POST /users/{id}/reject` – reject  

## Builds

- **Client + Server** (repo root): `client/` + `server/` – main app.
- **Admin**: `Admin/` (this folder) – frontend + `Admin/server/` backend.
