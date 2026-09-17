import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_maintenance_statistics():
    """Verify GET /api/v1/maintenance/statistics returns valid aggregates."""
    res = client.get("/api/v1/maintenance/statistics")
    assert res.status_code == 200
    data = res.json()
    assert "total_tasks" in data
    assert data["total_tasks"] > 0
    assert "pending_count" in data
    assert "scheduled_count" in data
    assert "in_progress_count" in data
    assert "critical_count" in data
    assert "department_breakdown" in data

def test_maintenance_crud_lifecycle():
    """Test full CRUD lifecycle for Maintenance Tasks."""
    # 1. CREATE
    create_payload = {
        "title": "USFD Ultrasonic Flaw Verification and Clamping",
        "department_code": "ENG",
        "location": "KM 830/14 - 831/00, Wardha Line",
        "task_type": "Ultrasonic Testing",
        "description": "Critical flaw detected at weld joint #42. Install emergency clamp.",
        "criticality": "Critical",
        "urgency": "Immediate",
        "safety_impact": "Derailment Risk",
        "estimated_duration_minutes": 150,
        "required_resources": "1x USFD Trolley, 6 Trackmen",
        "status": "Pending",
        "required_track_possession": True,
        "required_power_block": False,
        "required_traffic_block": True
    }
    create_res = client.post("/api/v1/maintenance/tasks", json=create_payload)
    assert create_res.status_code == 201
    created_task = create_res.json()
    task_id = created_task["id"]
    assert created_task["title"] == create_payload["title"]
    assert created_task["criticality"] == "Critical"
    assert created_task["task_code"].startswith("TSK-ENG-")

    # 2. READ DETAILS
    detail_res = client.get(f"/api/v1/maintenance/tasks/{task_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == task_id
    assert detail_data["safety_impact"] == "Derailment Risk"
    assert detail_data["estimated_duration_minutes"] == 150

    # 3. SEARCH, FILTER, SORT, PAGINATE
    list_res = client.get("/api/v1/maintenance/tasks", params={
        "search": "Ultrasonic Flaw Verification",
        "criticality": "Critical",
        "page": 1,
        "page_size": 5
    })
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(item["id"] == task_id for item in list_data["items"])

    # 4. UPDATE
    update_payload = {
        "status": "In_Progress",
        "estimated_duration_minutes": 180,
        "description": "Supervising officer on site, clamp installed, tamping in progress."
    }
    update_res = client.put(f"/api/v1/maintenance/tasks/{task_id}", json=update_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["status"] == "In_Progress"
    assert updated_data["estimated_duration_minutes"] == 180

    # 5. DELETE
    del_res = client.delete(f"/api/v1/maintenance/tasks/{task_id}")
    assert del_res.status_code == 200

    # Verify deletion
    verify_res = client.get(f"/api/v1/maintenance/tasks/{task_id}")
    assert verify_res.status_code == 404

def test_defects_statistics():
    """Verify GET /api/v1/defects/statistics returns valid aggregates."""
    res = client.get("/api/v1/defects/statistics")
    assert res.status_code == 200
    data = res.json()
    assert "total_defects" in data
    assert data["total_defects"] > 0
    assert "open_count" in data
    assert "critical_p0_count" in data
    assert "speed_restrictions_count" in data
    assert "system_source_breakdown" in data

def test_defects_crud_lifecycle():
    """Test full CRUD lifecycle for Defects."""
    # 1. CREATE
    create_payload = {
        "defect_type": "Rail Fracture 45mm Gap",
        "department_code": "ENG",
        "location": "KM 844/20, Sevagram Down Line",
        "description": "Transverse fracture discovered on outer rail of 4-degree curve.",
        "severity": "Critical",
        "criticality": "P0 - Emergency",
        "estimated_repair_duration_minutes": 240,
        "speed_restriction_imposed": 20,
        "reported_by_system": "TMS",
        "status": "Open"
    }
    create_res = client.post("/api/v1/defects", json=create_payload)
    assert create_res.status_code == 201
    created_defect = create_res.json()
    defect_id = created_defect["id"]
    assert created_defect["defect_type"] == create_payload["defect_type"]
    assert created_defect["speed_restriction_imposed"] == 20
    assert created_defect["defect_code"].startswith("DEF-ENG-")
    assert created_defect["calculated_priority_score"] >= 80.0  # Critical + 20km/h speed restriction triggers high AI priority

    # 2. READ DETAILS
    detail_res = client.get(f"/api/v1/defects/{defect_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == defect_id
    assert detail_data["criticality"] == "P0 - Emergency"
    assert detail_data["estimated_repair_duration_minutes"] == 240

    # 3. SEARCH, FILTER, SORT, PAGINATE
    list_res = client.get("/api/v1/defects", params={
        "search": "Rail Fracture 45mm Gap",
        "severity": "Critical",
        "page": 1,
        "page_size": 5
    })
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(item["id"] == defect_id for item in list_data["items"])

    # 4. UPDATE
    update_payload = {
        "status": "Investigating",
        "speed_restriction_imposed": 30,
        "description": "Fishplate secured. Speed restriction relaxed from 20 to 30 km/h."
    }
    update_res = client.put(f"/api/v1/defects/{defect_id}", json=update_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["status"] == "Investigating"
    assert updated_data["speed_restriction_imposed"] == 30

    # 5. DELETE
    del_res = client.delete(f"/api/v1/defects/{defect_id}")
    assert del_res.status_code == 200

    # Verify deletion
    verify_res = client.get(f"/api/v1/defects/{defect_id}")
    assert verify_res.status_code == 404

def test_defects_recalculate_priorities():
    """Verify POST /api/v1/defects/recalculate-priorities recalculates all open defects."""
    res = client.post("/api/v1/defects/recalculate-priorities")
    assert res.status_code == 200
    data = res.json()
    assert "defects_evaluated" in data
    assert data["defects_evaluated"] > 0

