import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_train_statistics():
    """Verify GET /api/v1/trains/statistics returns valid aggregates."""
    res = client.get("/api/v1/trains/statistics")
    assert res.status_code == 200
    data = res.json()
    assert "total_trains" in data
    assert data["total_trains"] > 0
    assert "on_time_count" in data
    assert "delayed_count" in data
    assert "punctuality_rate_pct" in data

def test_train_crud_lifecycle():
    """Test full CRUD lifecycle for Train Operations."""
    unique_no = f"TR-{int(datetime.utcnow().timestamp()) % 100000}"
    # 1. CREATE
    create_payload = {
        "train_no": unique_no,
        "train_name": "Nagpur Vande Bharat Special",
        "train_type": "Vande_Bharat",
        "priority_level": 1,
        "max_speed": 160,
        "is_freight": False,
        "origin": "Nagpur Junction (NGP)",
        "destination": "Bilaspur Junction (BSP)",
        "route": "NGP - Gondia - Durg - Raipur - BSP",
        "delay_minutes": 0,
        "status": "On Time"
    }
    create_res = client.post("/api/v1/trains", json=create_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    train_id = created["id"]
    assert created["train_no"] == unique_no
    assert created["origin"] == "Nagpur Junction (NGP)"

    # 2. READ DETAILS
    detail_res = client.get(f"/api/v1/trains/{train_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["destination"] == "Bilaspur Junction (BSP)"

    # 3. SEARCH, FILTER, SORT, PAGINATION
    list_res = client.get("/api/v1/trains", params={
        "search": unique_no,
        "train_type": "Vande_Bharat",
        "page": 1,
        "page_size": 5
    })
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(item["id"] == train_id for item in list_data["items"])

    # 4. UPDATE
    update_res = client.put(f"/api/v1/trains/{train_id}", json={
        "delay_minutes": 25,
        "status": "Delayed"
    })
    assert update_res.status_code == 200
    assert update_res.json()["delay_minutes"] == 25
    assert update_res.json()["status"] == "Delayed"

    # 5. DELETE
    del_res = client.delete(f"/api/v1/trains/{train_id}")
    assert del_res.status_code == 200

    # Verify 404
    v_res = client.get(f"/api/v1/trains/{train_id}")
    assert v_res.status_code == 404

def test_block_statistics():
    """Verify GET /api/v1/blocks/statistics returns valid aggregates."""
    res = client.get("/api/v1/blocks/statistics")
    assert res.status_code == 200
    data = res.json()
    assert "total_blocks" in data
    assert data["total_blocks"] > 0
    assert "upcoming_count" in data
    assert "active_count" in data
    assert "completed_count" in data
    assert "approved_count" in data

def test_block_crud_lifecycle():
    """Test full CRUD lifecycle for Block Management."""
    now = datetime.utcnow()
    s_time = now + timedelta(hours=6)
    e_time = s_time + timedelta(hours=3)

    # 1. CREATE
    create_payload = {
        "lead_department_code": "ENG",
        "block_type": "Traffic",
        "work_type": "Deep Ballast Screening (BCM Machine)",
        "requested_start_time": s_time.isoformat(),
        "requested_end_time": e_time.isoformat(),
        "duration_minutes": 180,
        "affected_assets": "TRK-60KG-842, SLP-PSC-120",
        "affected_trains": "12002 (Shatabdi), 22436 (Vande Bharat)",
        "status": "Upcoming",
        "approval_status": "Approved"
    }
    create_res = client.post("/api/v1/blocks", json=create_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    block_id = created["id"]
    assert created["block_code"].startswith("BLK-ENG-")
    assert created["duration_minutes"] == 180

    # 2. READ DETAILS
    detail_res = client.get(f"/api/v1/blocks/{block_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["work_type"] == "Deep Ballast Screening (BCM Machine)"

    # 3. TABS: UPCOMING, ACTIVE, COMPLETED
    up_res = client.get("/api/v1/blocks", params={"tab": "upcoming", "page": 1, "page_size": 10})
    assert up_res.status_code == 200
    assert up_res.json()["total"] > 0

    act_res = client.get("/api/v1/blocks", params={"tab": "active", "page": 1, "page_size": 10})
    assert act_res.status_code == 200

    comp_res = client.get("/api/v1/blocks", params={"tab": "completed", "page": 1, "page_size": 10})
    assert comp_res.status_code == 200

    # 4. UPDATE
    update_res = client.put(f"/api/v1/blocks/{block_id}", json={
        "status": "Active",
        "work_type": "BCM Screening & Ultrasonic Follow-up"
    })
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "Active"

    # 5. DELETE
    del_res = client.delete(f"/api/v1/blocks/{block_id}")
    assert del_res.status_code == 200

    # Verify 404
    v_res = client.get(f"/api/v1/blocks/{block_id}")
    assert v_res.status_code == 404

