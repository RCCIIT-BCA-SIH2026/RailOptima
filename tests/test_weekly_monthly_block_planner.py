import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

from backend.app.main import app
from backend.app.models import Block, RailwaySection, Department
from backend.app.core.database import SessionLocal

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_get_weekly_schedule():
    """Verify Weekly Planner returns 7-day timeline with 24-hour time coordinates and department color coding."""
    response = client.get("/api/blocks/weekly-schedule")
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()

    assert "start_date" in data
    assert "end_date" in data
    assert "days" in data
    assert len(data["days"]) == 7
    expected_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for i, d in enumerate(data["days"]):
        assert d["day_name"] == expected_days[i]
        assert d["day_index"] == i

    assert "blocks" in data
    assert len(data["blocks"]) > 0

    first_block = data["blocks"][0]
    assert "id" in first_block
    assert "block_code" in first_block
    assert "section_code" in first_block
    assert "department" in first_block
    assert "color_theme" in first_block
    assert "start_hour" in first_block
    assert "end_hour" in first_block
    assert "duration_minutes" in first_block
    assert "status" in first_block

    # Check department breakdowns
    assert "department_breakdown" in data
    dept_breakdown = data["department_breakdown"]
    assert "ENG" in dept_breakdown
    assert "SNT" in dept_breakdown
    assert "TRD" in dept_breakdown
    assert "INT" in dept_breakdown

def test_get_monthly_summary():
    """Verify Monthly Planner returns calendar grid, critical & overdue task counts, and asset availability."""
    response = client.get("/api/blocks/monthly-summary?month=2026-09")
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()

    assert data["month"] == "2026-09"
    assert data["total_blocks"] > 0
    assert data["critical_tasks_count"] > 0
    assert data["overdue_tasks_count"] > 0
    assert data["asset_availability_pct"] >= 90.0

    assert "department_workload_hours" in data
    wl = data["department_workload_hours"]
    assert "ENG" in wl and wl["ENG"] > 0
    assert "SNT" in wl and wl["SNT"] > 0
    assert "TRD" in wl and wl["TRD"] > 0

    assert "calendar_days" in data
    assert len(data["calendar_days"]) == 30  # September has 30 days
    first_day = data["calendar_days"][0]
    assert first_day["day_number"] == 1
    assert "total_blocks" in first_day
    assert "critical_tasks_count" in first_day
    assert "overdue_tasks_count" in first_day
    assert "departments_involved" in first_day

def test_block_reschedule_conflict_and_alternatives(db_session):
    """
    Moving a block into peak daytime traffic automatically triggers conflict detection
    and provides intelligent alternative safe time slots.
    """
    # Pick or ensure a block exists
    block = db_session.query(Block).first()
    block_id = block.id if block else 1

    # Reschedule into daytime peak (e.g. 08:30)
    reschedule_payload = {
        "target_date": "2026-09-20",
        "target_hour": 8.5,
        "new_start_time": "2026-09-20T08:30:00",
        "force": False
    }

    response = client.post(f"/api/blocks/{block_id}/reschedule", json=reschedule_payload)
    assert response.status_code == 200
    data = response.json()

    # Confirmed conflict detection triggered
    assert data["conflict_detected"] is True
    assert data["conflict_count"] > 0
    assert len(data["conflicts"]) > 0
    assert len(data["alternative_time_slots"]) >= 1

    # Recommended alternative slot should be night off-peak window
    night_slot = next((s for s in data["alternative_time_slots"] if s["slot_id"] == "SLOT-NIGHT-01"), None)
    assert night_slot is not None
    assert night_slot["recommended"] is True
    assert night_slot["passenger_delay_minutes"] == 0

def test_block_reschedule_clean_or_force(db_session):
    """
    Moving a block into an off-peak night window or using force=True allows clean rescheduling.
    """
    block = db_session.query(Block).first()
    block_id = block.id if block else 1

    # Reschedule into night off-peak window (02:00)
    reschedule_payload = {
        "target_date": "2026-09-21",
        "target_hour": 2.0,
        "new_start_time": "2026-09-21T02:00:00",
        "force": False
    }

    response = client.post(f"/api/blocks/{block_id}/reschedule", json=reschedule_payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["conflict_detected"] is False
    assert data["block"]["status"] == "Rescheduled"

