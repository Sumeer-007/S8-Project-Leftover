"""Seed demo data for development."""
from datetime import datetime, timedelta
from app.models import Donation, Task, User
from app.auth.jwt import hash_password


async def seed_demo_data(session):
    """Seed donations and tasks with demo data."""
    now = datetime.utcnow()
    pickup_later = now + timedelta(hours=4)
    pickup_tomorrow = now + timedelta(days=1, hours=2)

    donations = [
        Donation(
            id="D-1001",
            donor_name="Asha Menon",
            donor_phone_masked="+44 *** *** 128",
            pickup_by=pickup_later,
            status="PENDING",
            category="Cooked Meals",
            servings_estimate=25,
            items=[
                {"name": "Veg biryani", "quantity": 15, "unit": "plates"},
                {"name": "Raita packs", "quantity": 10, "unit": "packs"},
            ],
            pickup_location={
                "label": "Norwich City Centre",
                "address": "23 Market St, Norwich NR2 1XX",
                "lat": 52.6287,
                "lng": 1.2923,
            },
            notes="Packed & kept warm. Please bring an insulated bag.",
            dietary_tags=["Vegetarian"],
        ),
        Donation(
            id="D-1002",
            donor_name="GreenGrocer Ltd",
            donor_phone_masked="+44 *** *** 554",
            pickup_by=pickup_later + timedelta(hours=2),
            status="ASSIGNED",
            category="Fruits",
            servings_estimate=40,
            items=[
                {"name": "Bananas", "quantity": 8, "unit": "kg"},
                {"name": "Apples", "quantity": 6, "unit": "kg"},
            ],
            pickup_location={
                "label": "Warehouse",
                "address": "10 Riverside Rd, Norwich NR1 2AB",
                "lat": 52.624,
                "lng": 1.305,
            },
            assigned_volunteer_id="V-22",
            assigned_volunteer_data={
                "id": "V-22",
                "name": "Sam Thomas",
                "phoneMasked": "+44 *** *** 909",
            },
        ),
        Donation(
            id="D-1003",
            donor_name="Priya K",
            donor_phone_masked="+44 *** *** 771",
            pickup_by=now - timedelta(hours=2),
            status="DELIVERED",
            category="Bakery",
            servings_estimate=18,
            items=[{"name": "Bread loaves", "quantity": 12, "unit": "packs"}],
            pickup_location={
                "label": "Eaton",
                "address": "5 Church Ln, Norwich NR4 6NP",
                "lat": 52.607,
                "lng": 1.275,
            },
            assigned_volunteer_id="V-07",
            assigned_volunteer_data={
                "id": "V-07",
                "name": "Nina Patel",
                "phoneMasked": "+44 *** *** 404",
            },
        ),
    ]

    for d in donations:
        session.add(d)

    tasks = [
        Task(
            id="T-9001",
            donation_id="D-1002",
            volunteer_id="V-22",
            step="STARTED",
            checklist_sealed=True,
            checklist_labelled=True,
            checklist_no_leak=True,
            checklist_on_time=True,
            checklist_note="",
        ),
    ]

    for t in tasks:
        session.add(t)
