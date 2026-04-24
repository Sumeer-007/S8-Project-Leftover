"""Database setup and session management."""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

_engine_kw = {"echo": settings.debug}
if "postgresql" in settings.database_url:
    _engine_kw.update(pool_pre_ping=True, pool_size=5, max_overflow=10)

engine = create_async_engine(settings.database_url, **_engine_kw)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base for SQLAlchemy models."""
    pass


async def _migrate_users_table(conn) -> None:
    """Add status and email columns to users table if missing (for existing DBs)."""
    from sqlalchemy import text
    dialect = conn.dialect.name
    try:
        if dialect == "sqlite":
            for col, sql in [
                ("status", "ALTER TABLE users ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'PENDING'"),
                ("email", "ALTER TABLE users ADD COLUMN email VARCHAR(256)"),
            ]:
                try:
                    await conn.execute(text(sql))
                except Exception:
                    pass
        else:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'PENDING'"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(256)"))
    except Exception:
        pass


async def _migrate_users_verification_columns(conn) -> None:
    """Add donor food-safety cert and volunteer Aadhaar/ID type columns if missing."""
    from sqlalchemy import text
    dialect = conn.dialect.name
    new_columns = [
        ("donor_food_safety_cert_image", "TEXT"),
        ("volunteer_aadhaar_last4", "VARCHAR(8)"),
        ("volunteer_aadhaar_consent", "BOOLEAN"),
        ("volunteer_id_type", "VARCHAR(64)"),
        ("volunteer_id_proof_image", "TEXT"),
    ]
    try:
        if dialect == "sqlite":
            for col, typ in new_columns:
                try:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {typ}"))
                except Exception:
                    pass
        else:
            for col, typ in new_columns:
                try:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {typ}"))
                except Exception:
                    pass
    except Exception:
        pass


async def _migrate_users_push_columns(conn) -> None:
    """Add FCM push notification and location columns if missing."""
    from sqlalchemy import text
    dialect = conn.dialect.name
    new_columns = [
        ("fcm_token", "TEXT"),
        ("last_location", "JSON"),
        ("is_logged_in", "BOOLEAN NOT NULL DEFAULT 0"),
    ]
    try:
        if dialect == "sqlite":
            for col, typ in new_columns:
                try:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {typ}"))
                except Exception:
                    pass
        else:
            for col, typ in new_columns:
                try:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {typ}"))
                except Exception:
                    pass
    except Exception:
        pass


async def init_db() -> None:
    """Create all tables and run migrations for existing DBs."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with engine.begin() as conn:
        try:
            await _migrate_users_table(conn)
        except Exception:
            pass
    async with engine.begin() as conn:
        try:
            await _migrate_users_verification_columns(conn)
        except Exception:
            pass
    async with engine.begin() as conn:
        try:
            await _migrate_users_push_columns(conn)
        except Exception:
            pass
    async with engine.begin() as conn:
        try:
            await _migrate_users_verification_ai_json(conn)
        except Exception:
            pass


async def _migrate_users_verification_ai_json(conn) -> None:
    """Add verification_ai_json column for AI document pre-check results."""
    from sqlalchemy import text
    dialect = conn.dialect.name
    try:
        if dialect == "sqlite":
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN verification_ai_json JSON"))
            except Exception:
                try:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN verification_ai_json TEXT"))
                except Exception:
                    pass
        else:
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_ai_json JSONB"))
            except Exception:
                pass
    except Exception:
        pass


async def get_db() -> AsyncSession:
    """Dependency for FastAPI to get a DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
