"""API integration tests."""
import pytest


@pytest.mark.asyncio
async def test_root(client):
    """GET / returns health info."""
    r = await client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "message" in data
    assert "LeftoverLink" in data["message"]
    assert "docs" in data


@pytest.mark.asyncio
async def test_list_donations(client):
    """GET /donations returns seeded donations."""
    r = await client.get("/donations")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    d = data[0]
    assert "id" in d
    assert "donorName" in d
    assert "status" in d
    assert "category" in d
    assert "pickupLocation" in d


@pytest.mark.asyncio
async def test_get_donation(client):
    """GET /donations/{id} returns a single donation."""
    r = await client.get("/donations")
    assert r.status_code == 200
    donations = r.json()
    assert len(donations) > 0
    donation_id = donations[0]["id"]

    r2 = await client.get(f"/donations/{donation_id}")
    assert r2.status_code == 200
    d = r2.json()
    assert d["id"] == donation_id
    assert "donorName" in d
    assert "items" in d


@pytest.mark.asyncio
async def test_register_and_login_volunteer(client):
    """Register volunteer (pending), admin approves, then login and get /auth/me."""
    # Register -> pending, no token
    r = await client.post(
        "/auth/register/volunteer",
        json={
            "username": "testvol",
            "password": "test1234",
            "fullName": "Test Volunteer",
            "phone": "+44 123 456",
            "aadhaarConsent": True,
            "volunteerIdType": "NSS",
            "volunteerIdProofImage": "data:image/png;base64,AAA",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("pending") is True
    assert "user" in data
    assert data.get("token") is None
    user = data["user"]
    assert user["role"] == "VOLUNTEER"
    assert user["username"] == "testvol"
    assert user.get("status") == "PENDING"
    user_id = user["id"]

    # Login while pending -> 403
    r_login_pending = await client.post(
        "/auth/login",
        json={"username": "testvol", "password": "test1234"},
    )
    assert r_login_pending.status_code == 403
    assert r_login_pending.json().get("detail") == "pending"

    # Test-only: approve user (Admin API lives in Admin backend)
    r_approve = await client.post(f"/test/approve-user/{user_id}")
    assert r_approve.status_code == 200

    # Login after approval
    r2 = await client.post(
        "/auth/login",
        json={"username": "testvol", "password": "test1234"},
    )
    assert r2.status_code == 200
    data2 = r2.json()
    assert "token" in data2
    assert "user" in data2
    token = data2["token"]

    # Me (with token)
    r3 = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r3.status_code == 200
    me = r3.json()
    assert me["username"] == "testvol"
    assert me["role"] == "VOLUNTEER"


@pytest.mark.asyncio
async def test_register_donor(client):
    """Register donor with required fields; returns pending, no token."""
    r = await client.post(
        "/auth/register/donor",
        json={
            "username": "testdonor",
            "password": "donor1234",
            "fullName": "Test Donor",
            "phone": "+44 987 654",
            "aadhaarConsent": True,
            "idFrontImage": "data:image/png;base64,AAA",
            "idBackImage": "data:image/png;base64,BBB",
            "foodSafetyCertImage": "data:image/png;base64,CCC",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("pending") is True
    assert data.get("token") is None
    assert "user" in data
    assert data["user"]["role"] == "DONOR"
    assert data["user"]["username"] == "testdonor"
    assert data["user"].get("status") == "PENDING"


@pytest.mark.asyncio
async def test_login_invalid(client):
    """Login with wrong password returns 401."""
    r = await client.post(
        "/auth/login",
        json={"username": "nonexistent", "password": "wrong"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_create_donation(client):
    """POST /donations creates a donation."""
    r = await client.post(
        "/donations",
        json={
            "donorName": "Demo Donor",
            "donorPhoneMasked": "+44 *** *** 111",
            "pickupBy": "2026-03-01T14:00:00Z",
            "category": "Cooked Meals",
            "servingsEstimate": 20,
            "items": [{"name": "Biryani", "quantity": 10, "unit": "plates"}],
            "pickupLocation": {
                "label": "Test",
                "address": "1 Test St",
                "lat": 52.6,
                "lng": 1.3,
            },
        },
    )
    assert r.status_code == 200
    d = r.json()
    assert "id" in d
    assert d["donorName"] == "Demo Donor"
    assert d["status"] == "PENDING"
    assert d["category"] == "Cooked Meals"
    assert len(d["items"]) == 1
    assert d["items"][0]["name"] == "Biryani"


@pytest.mark.asyncio
async def test_accept_pickup(client):
    """Accept pickup creates task and updates donation status."""
    # Create donation
    r1 = await client.post(
        "/donations",
        json={
            "donorName": "Demo Donor",
            "donorPhoneMasked": "+44 *** *** 111",
            "pickupBy": "2026-03-01T14:00:00Z",
            "category": "Cooked Meals",
            "servingsEstimate": 20,
            "items": [{"name": "Biryani", "quantity": 10, "unit": "plates"}],
            "pickupLocation": {
                "label": "Test",
                "address": "1 Test St",
                "lat": 52.6,
                "lng": 1.3,
            },
        },
    )
    assert r1.status_code == 200
    donation_id = r1.json()["id"]

    # Accept pickup
    r2 = await client.post(
        f"/donations/{donation_id}/accept",
        json={
            "id": "V-TEST",
            "name": "Test Volunteer",
            "phoneMasked": "+44 *** *** 789",
        },
    )
    assert r2.status_code == 200
    data = r2.json()
    assert "donation" in data
    assert "task" in data
    assert data["donation"]["status"] == "ASSIGNED"
    assert data["donation"]["assignedVolunteer"]["id"] == "V-TEST"
    assert data["task"]["step"] == "READY"
    assert data["task"]["volunteerId"] == "V-TEST"


@pytest.mark.asyncio
async def test_list_tasks(client):
    """GET /tasks?volunteer_id=X returns tasks."""
    # Accept a pickup first
    r1 = await client.get("/donations")
    donations = [d for d in r1.json() if d["status"] == "PENDING"]
    if not donations:
        pytest.skip("No PENDING donations to accept")

    donation_id = donations[0]["id"]
    r2 = await client.post(
        f"/donations/{donation_id}/accept",
        json={
            "id": "V-TASKTEST",
            "name": "Task Test Volunteer",
            "phoneMasked": "+44 *** *** 999",
        },
    )
    assert r2.status_code == 200
    task = r2.json()["task"]

    r3 = await client.get("/tasks", params={"volunteer_id": "V-TASKTEST"})
    assert r3.status_code == 200
    tasks = r3.json()
    assert isinstance(tasks, list)
    assert any(t["id"] == task["id"] for t in tasks)


@pytest.mark.asyncio
async def test_advance_task(client):
    """PATCH /tasks/{id}/advance advances step."""
    # Accept pickup to create task
    r1 = await client.get("/donations")
    donations = [d for d in r1.json() if d["status"] == "PENDING"]
    if not donations:
        pytest.skip("No PENDING donations")

    r2 = await client.post(
        f"/donations/{donations[0]['id']}/accept",
        json={
            "id": "V-ADV",
            "name": "Advance Volunteer",
            "phoneMasked": "+44 *** *** 111",
        },
    )
    assert r2.status_code == 200
    task_id = r2.json()["task"]["id"]

    r3 = await client.patch(f"/tasks/{task_id}/advance")
    assert r3.status_code == 200
    t = r3.json()
    assert t["step"] == "STARTED"


@pytest.mark.asyncio
async def test_save_checklist(client):
    """PATCH /tasks/{id}/checklist updates checklist."""
    r1 = await client.get("/donations")
    donations = [d for d in r1.json() if d["status"] == "PENDING"]
    if not donations:
        pytest.skip("No PENDING donations")

    r2 = await client.post(
        f"/donations/{donations[0]['id']}/accept",
        json={
            "id": "V-CHK",
            "name": "Checklist Volunteer",
            "phoneMasked": "+44 *** *** 222",
        },
    )
    task_id = r2.json()["task"]["id"]

    r3 = await client.patch(
        f"/tasks/{task_id}/checklist",
        json={"sealed": True, "labelled": True},
    )
    assert r3.status_code == 200
    t = r3.json()
    assert t["checklist"]["sealed"] is True
    assert t["checklist"]["labelled"] is True


@pytest.mark.asyncio
async def test_demo_reset(client):
    """POST /demo/reset resets donations."""
    r = await client.post("/demo/reset")
    assert r.status_code == 200
    assert r.json().get("ok") is True

    r2 = await client.get("/donations")
    assert r2.status_code == 200
    # After reset, we should have seed data (3 donations)
    assert len(r2.json()) >= 1


@pytest.mark.asyncio
async def test_auth_logout(client):
    """POST /auth/logout returns ok and does not error."""
    r = await client.post("/auth/logout")
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True


@pytest.mark.asyncio
async def test_get_task(client):
    """GET /tasks/{id} returns a single task when it exists."""
    # Create a task by accepting a pickup
    r1 = await client.get("/donations")
    donations = [d for d in r1.json() if d["status"] == "PENDING"]
    if not donations:
        pytest.skip("No PENDING donations")
    r2 = await client.post(
        f"/donations/{donations[0]['id']}/accept",
        json={
            "id": "V-GETTASK",
            "name": "Get Task Volunteer",
            "phoneMasked": "+44 *** *** 333",
        },
    )
    assert r2.status_code == 200
    task_id = r2.json()["task"]["id"]

    r3 = await client.get(f"/tasks/{task_id}")
    assert r3.status_code == 200
    t = r3.json()
    assert t["id"] == task_id
    assert t["donationId"] == donations[0]["id"]
    assert t["volunteerId"] == "V-GETTASK"


@pytest.mark.asyncio
async def test_mark_delivered_and_feedback_flow(client, monkeypatch):
    """POST /tasks/{id}/deliver then GET/POST /feedback/by-token/{token}."""
    # Create task in PICKED_UP state
    r1 = await client.get("/donations")
    donations = [d for d in r1.json() if d["status"] == "PENDING"]
    if not donations:
        pytest.skip("No PENDING donations")
    r2 = await client.post(
        f"/donations/{donations[0]['id']}/accept",
        json={
            "id": "V-DELIVER",
            "name": "Deliver Volunteer",
            "phoneMasked": "+44 *** *** 444",
        },
    )
    assert r2.status_code == 200
    task = r2.json()["task"]

    # Advance to PICKED_UP
    r3 = await client.patch(f"/tasks/{task['id']}/advance")
    assert r3.status_code == 200
    r4 = await client.patch(f"/tasks/{task['id']}/advance")
    assert r4.status_code == 200
    assert r4.json()["step"] == "PICKED_UP"

    # Avoid actually sending email by monkeypatching notification service
    from app import services

    def _dummy_notify(to_email, volunteer_name, donor_name, feedback_url):
        return None

    monkeypatch.setattr(
        services.notification,
        "send_delivery_notification",
        _dummy_notify,
        raising=False,
    )

    # Mark delivered with end-user details (email so feedback link is sent)
    r5 = await client.post(
        f"/tasks/{task['id']}/deliver",
        json={
            "endUser": {
                "name": "Recipient One",
                "age": 30,
                "address": "Recipient Address",
                "email": "recipient@example.com",
            }
        },
    )
    assert r5.status_code == 200
    delivered_task = r5.json()
    assert delivered_task["step"] == "DELIVERED"
    assert "feedbackUrl" in delivered_task
    feedback_url = delivered_task["feedbackUrl"]
    token = feedback_url.rsplit("/", 1)[-1]

    # Public GET /feedback/by-token/{token}
    r6 = await client.get(f"/feedback/by-token/{token}")
    assert r6.status_code == 200
    info = r6.json()
    assert "donorName" in info
    assert "volunteerName" in info
    assert info["alreadySubmitted"] is False

    # Public POST /feedback/by-token/{token}
    r7 = await client.post(
        f"/feedback/by-token/{token}",
        json={"rating": 5, "comment": "Great service"},
    )
    assert r7.status_code == 200
    assert r7.json().get("ok") is True

    # Second submission should fail with 400
    r8 = await client.post(
        f"/feedback/by-token/{token}",
        json={"rating": 4},
    )
    assert r8.status_code == 400


@pytest.mark.asyncio
async def test_maps_geocode_and_reverse(monkeypatch, client):
    """GET /api/maps/geocode and /api/maps/reverse-geocode using mocked Google API."""
    # Ensure API key is considered configured
    from app import config

    monkeypatch.setattr(config.settings, "google_maps_api_key", "test-key", raising=False)

    import app.routers.maps as maps_router

    class DummyResponse:
        def __init__(self, json_data):
            self._json = json_data

        def raise_for_status(self):
            return None

        def json(self):
            return self._json

    async def _fake_get(self, url, params=None, timeout=None):
        if "geocode" in url and "address" in (params or {}):
            return DummyResponse(
                {
                    "status": "OK",
                    "results": [
                        {
                            "formatted_address": "Test Address",
                            "place_id": "PLACE1",
                            "geometry": {"location": {"lat": 10.0, "lng": 20.0}},
                        }
                    ],
                }
            )
        if "geocode" in url and "latlng" in (params or {}):
            return DummyResponse(
                {
                    "status": "OK",
                    "results": [
                        {
                            "formatted_address": "Reverse Address",
                            "place_id": "PLACE2",
                        }
                    ],
                }
            )
        return DummyResponse({"status": "ZERO_RESULTS", "results": []})

    class DummyAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        get = _fake_get

    monkeypatch.setattr(maps_router.httpx, "AsyncClient", DummyAsyncClient, raising=False)

    # Geocode
    r1 = await client.get("/api/maps/geocode", params={"address": "Somewhere"})
    assert r1.status_code == 200
    data1 = r1.json()
    assert data1["location"]["lat"] == 10.0
    assert data1["location"]["lng"] == 20.0
    assert len(data1["results"]) == 1

    # Reverse geocode
    r2 = await client.get("/api/maps/reverse-geocode", params={"lat": 10.0, "lng": 20.0})
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["address"] == "Reverse Address"


@pytest.mark.asyncio
async def test_maps_places_autocomplete_and_details(monkeypatch, client):
    """GET /api/maps/places/autocomplete and /api/maps/places/details using mocked Google API."""
    from app import config
    import app.routers.maps as maps_router

    monkeypatch.setattr(config.settings, "google_maps_api_key", "test-key", raising=False)

    class DummyResponse:
        def __init__(self, json_data):
            self._json = json_data

        def raise_for_status(self):
            return None

        def json(self):
            return self._json

    async def _fake_get(self, url, params=None, timeout=None):
        if "place/autocomplete" in url:
            return DummyResponse(
                {
                    "status": "OK",
                    "predictions": [
                        {
                            "place_id": "AUTOPLACE1",
                            "description": "Auto Place 1",
                            "structured_formatting": {},
                        }
                    ],
                }
            )
        if "place/details" in url:
            return DummyResponse(
                {
                    "status": "OK",
                    "result": {
                        "place_id": params.get("place_id"),
                        "formatted_address": "Details Address",
                        "geometry": {"location": {"lat": 11.0, "lng": 22.0}},
                    },
                }
            )
        return DummyResponse({"status": "ZERO_RESULTS", "predictions": []})

    class DummyAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        get = _fake_get

    monkeypatch.setattr(maps_router.httpx, "AsyncClient", DummyAsyncClient, raising=False)

    # Autocomplete
    r1 = await client.get("/api/maps/places/autocomplete", params={"input": "Col"})
    assert r1.status_code == 200
    auto = r1.json()
    assert len(auto["predictions"]) == 1
    place_id = auto["predictions"][0]["place_id"]

    # Details
    r2 = await client.get("/api/maps/places/details", params={"place_id": place_id})
    assert r2.status_code == 200
    details = r2.json()
    assert details["place_id"] == place_id
    assert details["formatted_address"] == "Details Address"
    assert details["location"]["lat"] == 11.0
    assert details["location"]["lng"] == 22.0


# Admin API tests live in Admin/server (separate build).
