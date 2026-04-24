"""FastAPI application entrypoint."""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routers import auth, donations, tasks, maps, feedback
from app.routers import test_routes, debug_fcm

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed demo data on startup."""
    await init_db()
    from app.database import AsyncSessionLocal
    from app.models import Donation
    from sqlalchemy import select, func
    from app.seed import seed_demo_data

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count()).select_from(Donation))
        count = result.scalar_one() or 0
        if count == 0:
            await seed_demo_data(session)
            await session.commit()

    # One-time Firebase check so push issues show in logs at startup.
    from app.services.fcm import firebase_admin_ready

    fb = firebase_admin_ready()
    if fb:
        logger.info("Firebase Admin OK — donation-created pushes can be sent.")
    else:
        logger.warning(
            "Firebase Admin not initialized — set FIREBASE_* env vars or FIREBASE_CREDENTIALS_PATH "
            "and install firebase-admin. Volunteer pushes will be skipped."
        )

    yield


app = FastAPI(
    title=settings.app_name,
    description="LeftoverLink API - Food donation and volunteer pickup coordination",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Log 500s and return a safe message (detail only when debug)."""
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc) if settings.debug else "Internal server error. Check server logs.",
        },
    )


# CORS: main app origins + Admin app (built/deployed separately; set ADMIN_CORS_ORIGINS in production)
_cors_list = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
# Local dev: allow Admin on 5174; production: add ADMIN_CORS_ORIGINS e.g. https://admin.yourdomain.com
_admin_origins = ["http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5175", "http://127.0.0.1:5175"]
if settings.admin_cors_origins:
    _admin_origins.extend(o.strip() for o in settings.admin_cors_origins.split(",") if o.strip())
for origin in _admin_origins:
    if origin and origin not in _cors_list:
        _cors_list.append(origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth")
app.include_router(donations.router)
app.include_router(tasks.router)
app.include_router(feedback.router)
app.include_router(maps.router)
app.include_router(debug_fcm.router)
if os.getenv("TESTING"):
    app.include_router(test_routes.router)


@app.get("/")
async def root():
    """Health/root endpoint."""
    return {"message": "LeftoverLink API", "docs": "/docs", "openapi": "/openapi.json"}


@app.post("/demo/reset")
async def reset_demo():
    """Reset demo data. In development only; clears and reseeds donations and tasks."""
    from app.models import Donation, Task
    from app.models.delivery import Feedback, DeliveryRecipient
    from sqlalchemy import delete
    from app.database import AsyncSessionLocal
    from app.seed import seed_demo_data

    async with AsyncSessionLocal() as session:
        await session.execute(delete(Feedback))
        await session.execute(delete(DeliveryRecipient))
        await session.execute(delete(Task))
        await session.execute(delete(Donation))
        await session.commit()

    async with AsyncSessionLocal() as session:
        await seed_demo_data(session)
        await session.commit()

    return {"ok": True, "message": "Demo data reset"}


@app.post("/auth/reset-demo")
async def reset_auth_demo():
    """Reset auth demo - clears users. Development only."""
    from app.models import User
    from app.database import AsyncSessionLocal
    from sqlalchemy import delete

    async with AsyncSessionLocal() as session:
        await session.execute(delete(User))
        await session.commit()

    return {"ok": True, "message": "Auth demo reset"}
