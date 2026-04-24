"""Test-only routes (included only when TESTING=1). Used so main server tests can approve users without Admin backend."""
import os
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User, USER_STATUS_APPROVED, USER_STATUS_PENDING

router = APIRouter(prefix="/test", tags=["test"])


@router.post("/approve-user/{user_id}")
async def test_approve_user(user_id: str, db: Annotated[AsyncSession, Depends(get_db)]):
    if not os.getenv("TESTING"):
        raise HTTPException(404, "Not found")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    if user.status != USER_STATUS_PENDING:
        raise HTTPException(400, f"User not pending (status={user.status})")
    user.status = USER_STATUS_APPROVED
    await db.flush()
    return {"ok": True, "userId": user_id}
