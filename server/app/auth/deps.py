"""Auth dependencies for FastAPI."""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import decode_access_token
from app.database import get_db
from app.models.user import User

http_bearer = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(http_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    """Get current user from Bearer token, or None if no/invalid token."""
    if not credentials or not credentials.credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None
    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    return user


async def get_current_user(
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    """Require authenticated user."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user


async def get_current_donor(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role != "DONOR":
        raise HTTPException(status_code=403, detail="Donor role required")
    return user


async def get_current_volunteer(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role != "VOLUNTEER":
        raise HTTPException(status_code=403, detail="Volunteer role required")
    return user
