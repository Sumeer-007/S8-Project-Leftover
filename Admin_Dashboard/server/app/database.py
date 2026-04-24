"""Database setup – same DB as main server when DATABASE_URL is shared."""
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
    pass


async def _migrate_users_verification_ai_json(conn) -> None:
    """Add verification_ai_json if missing (shared DB with main server)."""
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


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with engine.begin() as conn:
        try:
            await _migrate_users_verification_ai_json(conn)
        except Exception:
            pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
