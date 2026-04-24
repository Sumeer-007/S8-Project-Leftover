"""Pytest configuration and fixtures for Admin backend."""
import asyncio
import os

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import init_db, AsyncSessionLocal
from app.models import Admin
from app.auth.jwt import hash_password, create_access_token
from sqlalchemy import select


@pytest.fixture(scope="session", autouse=True)
def configure_test_db():
    """Ensure DATABASE_URL is set and DB schema is initialized."""
    if "DATABASE_URL" not in os.environ:
        test_db = os.path.join(os.path.dirname(__file__), "admin_test.db")
        os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{test_db}"
    asyncio.run(init_db())


@pytest.fixture
def client(configure_test_db):
    """Synchronous HTTP client for testing the Admin API."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin_token(configure_test_db):
    """Ensure there is at least one admin and return a JWT for it."""

    async def _ensure_admin():
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Admin).order_by(Admin.created_at.asc()))
            # Use first() semantics instead of scalar_one_or_none() to avoid MultipleResultsFound
            admin = result.scalars().first()
            if not admin:
                admin = Admin(
                    id="ADM-TEST",
                    username="admintest",
                    hashed_password=hash_password("admin123"),
                )
                session.add(admin)
                await session.commit()
            return admin

    admin = asyncio.run(_ensure_admin())
    token = create_access_token({"sub": f"admin:{admin.id}"})
    return token

