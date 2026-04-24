"""Pytest configuration and fixtures."""
import asyncio
import os

# Use a temp file DB so all connections share the same database
_test_db = os.path.join(os.path.dirname(__file__), "test.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_test_db}"
os.environ["TESTING"] = "1"

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.database import init_db, AsyncSessionLocal
from app.seed import seed_demo_data
from app.models import Donation
from sqlalchemy import select, func


async def _ensure_db():
    """Create tables and seed data."""
    await init_db()
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count()).select_from(Donation))
        count = result.scalar_one() or 0
        if count == 0:
            await seed_demo_data(session)
            await session.commit()


@pytest.fixture(scope="session", autouse=True)
def init_test_db():
    """Create tables and seed data before any test runs."""
    asyncio.run(_ensure_db())


@pytest.fixture
async def client(init_test_db):
    """Async HTTP client for testing the API."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def pytest_sessionfinish(session, exitstatus):
    """Remove test DB file after tests."""
    if os.path.exists(_test_db):
        try:
            os.remove(_test_db)
        except OSError:
            pass
