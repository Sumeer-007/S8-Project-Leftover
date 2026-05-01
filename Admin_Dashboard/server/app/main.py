"""Admin backend – separate build; shares DB with main server via DATABASE_URL."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.models import Admin
from app.auth.jwt import hash_password
from app.routers import admin as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with AsyncSessionLocal() as session:
        admin_count = await session.execute(select(func.count()).select_from(Admin))
        if (admin_count.scalar_one() or 0) == 0:
            session.add(Admin(
                id="ADM-00001",
                username="admin",
                hashed_password=hash_password("admin123"),
            ))
            await session.commit()
    yield


app = FastAPI(
    title=settings.app_name,
    description="LeftoverLink Admin API – user approval, etc.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router.router)


@app.get("/")
async def root():
    return {"message": "LeftoverLink Admin API", "docs": "/docs", "openapi": "/openapi.json"}
