import pytest

"""Admin API tests for all endpoints in Admin_Dashboard/server."""

def test_root(client):
    """GET / returns admin API health info."""
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("message") == "LeftoverLink Admin API"
    assert "docs" in data
    assert "openapi" in data


def test_admin_signup_and_login(client):
    """Signup a new admin (unique username) and then login."""
    import random

    uname = f"newadmin{random.randint(1000, 9999)}"

    # Signup
    r_signup = client.post(
        "/signup",
        json={"username": uname, "password": "newpass"},
    )
    assert r_signup.status_code == 200
    data_signup = r_signup.json()
    assert "token" in data_signup
    assert "admin" in data_signup
    assert data_signup["admin"]["username"] == uname

    # Login with same credentials
    r_login = client.post(
        "/login",
        json={"username": uname, "password": "newpass"},
    )
    assert r_login.status_code == 200
    data_login = r_login.json()
    assert "token" in data_login
    assert "admin" in data_login
    assert data_login["admin"]["username"] == uname


def test_admin_login_invalid(client):
    """Login with wrong credentials should return 401."""
    r = client.post(
        "/login",
        json={"username": "doesnotexist", "password": "wrong"},
    )
    assert r.status_code == 401


def test_admin_me(client, admin_token):
    """GET /me with valid admin token returns admin details."""
    r = client.get("/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert "username" in data


def test_list_pending_and_approve_user(client, admin_token, monkeypatch):
    """List pending users, approve one, and ensure status changes."""
    # This test assumes there may already be pending users created by the main server tests.
    # If none are present, we skip.
    headers = {"Authorization": f"Bearer {admin_token}"}

    # List pending users
    r_pending = client.get("/pending-users", headers=headers)
    assert r_pending.status_code == 200
    pending = r_pending.json()
    if not pending:
        pytest.skip("No pending users available to approve")

    user = pending[0]
    user_id = user["id"]

    # Avoid sending real notifications
    from app import services

    async def _noop_notify(*args, **kwargs):
        return None

    monkeypatch.setattr(services.notification, "notify_user_approved", _noop_notify, raising=False)

    # Approve user
    r_approve = client.post(f"/users/{user_id}/approve", headers=headers)
    assert r_approve.status_code == 200
    data = r_approve.json()
    assert data.get("ok") is True
    assert data["user"]["id"] == user_id
    assert data["user"]["status"] == "APPROVED"


def test_list_all_users(client, admin_token):
    """GET /users returns a list of all users."""
    r = client.get("/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list)
    # Users may be empty if no users exist, but type should be list


def test_reject_pending_user(client, admin_token, monkeypatch):
    """Reject a pending user and ensure status becomes REJECTED."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch pending users
    r_pending = client.get("/pending-users", headers=headers)
    assert r_pending.status_code == 200
    pending = r_pending.json()
    if not pending:
        pytest.skip("No pending users available to reject")

    user = pending[-1]
    user_id = user["id"]

    # Avoid sending real notifications
    from app import services

    async def _noop_notify(*args, **kwargs):
        return None

    monkeypatch.setattr(services.notification, "notify_user_rejected", _noop_notify, raising=False)

    # Reject user
    r_reject = client.post(f"/users/{user_id}/reject", headers=headers)
    assert r_reject.status_code == 200
    data = r_reject.json()
    assert data.get("ok") is True
    assert data["user"]["id"] == user_id
    assert data["user"]["status"] == "REJECTED"

