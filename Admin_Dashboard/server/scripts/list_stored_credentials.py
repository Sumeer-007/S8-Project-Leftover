"""
List usernames (and roles) stored in the DB. Passwords are hashed and cannot be retrieved.
Run from Admin/server: python scripts/list_stored_credentials.py
Uses DATABASE_URL from .env or config default (same DB as main server).
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal, init_db
from app.models.user import User
from app.models.admin import Admin
from sqlalchemy import select


async def main():
    await init_db()
    async with AsyncSessionLocal() as session:
        # Admins
        r = await session.execute(select(Admin).order_by(Admin.username))
        admins = r.scalars().all()
        print("=== ADMINS ===")
        if not admins:
            print("  (none)")
        for a in admins:
            print(f"  id: {a.id}, username: {a.username}")
        print()

        # Users (donors + volunteers)
        r = await session.execute(select(User).order_by(User.created_at.desc()))
        users = r.scalars().all()
        print("=== USERS (Donors & Volunteers) ===")
        if not users:
            print("  (none)")
        for u in users:
            name = (u.donor_full_name or u.volunteer_full_name or "").strip() or "-"
            print(f"  id: {u.id}, username: {u.username}, role: {u.role}, status: {getattr(u, 'status', 'N/A')}, name: {name}")
        print()
        print("NOTE: Passwords are stored as bcrypt hashes and cannot be shown.")
        print("Default admin (if auto-created): username 'admin', password 'admin123'.")
        print("Donors/Volunteers: use the password they set when registering.")


if __name__ == "__main__":
    asyncio.run(main())
