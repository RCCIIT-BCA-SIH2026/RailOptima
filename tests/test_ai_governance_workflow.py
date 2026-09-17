import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.block import AIRecommendation
from backend.app.models.defect import MaintenanceTask
from backend.app.models.asset import Asset
from backend.app.models.user import Department

client = TestClient(app)

def get_token(username: str, password: str = "Admin@123") -> str:
    """Helper to authenticate and fetch JWT token for specified user."""
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    if response.status_code != 200:
        raise ValueError(f"Failed to authenticate user {username}: {response.text}")
    return response.json()["access_token"]


# ---------------------------------------------------------------------------
# Test Suite: AI Governance & Approval Workflow Security Tests (18 Tests)
# ---------------------------------------------------------------------------

def test_01_admin_can_execute_predictive_maintenance():
    """1. Admin can execute predictive maintenance (200 OK) and creates PENDING_REVIEW recommendation."""
    admin_token = get_token("admin", "Admin@123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    payload = {
        "department_code": "ENG",
        "rail_wear_mm": 10.5,
        "sensor_health_index": 55.0,
        "track_vibration_level": 2.4
    }
    res = client.post("/api/v1/ai/predictive-maintenance", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["maintenance_required"], bool)
    assert data["recommendation_status"] == "PENDING_REVIEW"
    assert data["is_official_update"] is False
    assert "recommendation_id" in data


def test_02_engineering_cannot_execute_predictive_maintenance():
    """2. Engineering user cannot execute predictive maintenance (returns HTTP 403 Forbidden)."""
    eng_token = get_token("engineering_officer", "Eng@123")
    headers = {"Authorization": f"Bearer {eng_token}"}

    payload = {
        "department_code": "ENG",
        "rail_wear_mm": 10.5
    }
    res = client.post("/api/v1/ai/predictive-maintenance", json=payload, headers=headers)
    assert res.status_code == 403
    assert "restricted to Admin only" in res.json()["detail"]


def test_03_trd_cannot_execute_predictive_maintenance():
    """3. TRD user cannot execute predictive maintenance (returns HTTP 403 Forbidden)."""
    trd_token = get_token("traction_officer", "Trd@123")
    headers = {"Authorization": f"Bearer {trd_token}"}

    payload = {
        "department_code": "TRD",
        "brake_pad_wear_percent": 80.0
    }
    res = client.post("/api/v1/ai/predictive-maintenance", json=payload, headers=headers)
    assert res.status_code == 403
    assert "restricted to Admin only" in res.json()["detail"]


def test_04_snt_cannot_execute_predictive_maintenance():
    """4. S&T user cannot execute predictive maintenance (returns HTTP 403 Forbidden)."""
    snt_token = get_token("signal_officer", "Signal@123")
    headers = {"Authorization": f"Bearer {snt_token}"}

    payload = {
        "department_code": "SNT",
        "battery_voltage": 20.0
    }
    res = client.post("/api/v1/ai/predictive-maintenance", json=payload, headers=headers)
    assert res.status_code == 403
    assert "restricted to Admin only" in res.json()["detail"]


def test_05_admin_can_get_pending_recommendations():
    """5. Admin can get pending recommendations (returns HTTP 200 OK)."""
    admin_token = get_token("admin", "Admin@123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/v1/ai/recommendations/pending", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "recommendations" in data
    assert data["pending_count"] >= 0
    # Every item in the list must have status PENDING_REVIEW
    for rec in data["recommendations"]:
        assert rec["status"] == "PENDING_REVIEW"


def test_06_engineering_cannot_get_pending_recommendations():
    """6. Engineering cannot get pending recommendations (returns HTTP 403 Forbidden)."""
    eng_token = get_token("engineering_officer", "Eng@123")
    headers = {"Authorization": f"Bearer {eng_token}"}

    res = client.get("/api/v1/ai/recommendations/pending", headers=headers)
    assert res.status_code == 403
    assert "restricted to Admin only" in res.json()["detail"]


def test_07_trd_cannot_get_pending_recommendations():
    """7. TRD cannot get pending recommendations (returns HTTP 403 Forbidden)."""
    trd_token = get_token("traction_officer", "Trd@123")
    headers = {"Authorization": f"Bearer {trd_token}"}

    res = client.get("/api/v1/ai/recommendations/pending", headers=headers)
    assert res.status_code == 403
    assert "restricted to Admin only" in res.json()["detail"]


def test_08_snt_cannot_get_pending_recommendations():
    """8. S&T cannot get pending recommendations (returns HTTP 403 Forbidden)."""
    snt_token = get_token("signal_officer", "Signal@123")
    headers = {"Authorization": f"Bearer {snt_token}"}

    res = client.get("/api/v1/ai/recommendations/pending", headers=headers)
    assert res.status_code == 403
    assert "restricted to Admin only" in res.json()["detail"]


def test_09_admin_can_approve_recommendation_and_create_task():
    """9. Admin can approve a recommendation (200 OK, transitions to APPROVED, creates MaintenanceTask)."""
    admin_token = get_token("admin", "Admin@123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Step A: Admin generates a predictive maintenance recommendation
    gen_res = client.post("/api/v1/ai/predictive-maintenance", json={
        "department_code": "ENG",
        "rail_wear_mm": 12.0,
        "sensor_health_index": 50.0
    }, headers=headers)
    assert gen_res.status_code == 200
    rec_id = gen_res.json()["recommendation_id"]

    # Ensure maintenance_required is True to trigger official task creation
    db = SessionLocal()
    rec_obj = db.query(AIRecommendation).filter(AIRecommendation.id == rec_id).first()
    rec_obj.maintenance_required = True
    db.commit()
    db.close()

    # Step B: Admin approves it with remarks
    appr_res = client.post(
        f"/api/v1/ai/recommendations/{rec_id}/approve",
        json={"approval_comment": "Approved for emergency P-Way block possession."},
        headers=headers
    )
    assert appr_res.status_code == 200
    data = appr_res.json()
    assert data["status"] == "APPROVED"
    assert data["task_id"] is not None
    assert data["approval_comment"] == "Approved for emergency P-Way block possession."

    # Verify official task exists in database
    db = SessionLocal()
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == data["task_id"]).first()
    assert task is not None
    assert "Approved AI Maintenance" in task.title
    db.close()


def test_10_admin_can_reject_recommendation():
    """10. Admin can reject a recommendation (200 OK, transitions to REJECTED, no task created)."""
    admin_token = get_token("admin", "Admin@123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Step A: Generate recommendation
    gen_res = client.post("/api/v1/ai/predictive-maintenance", json={
        "department_code": "ENG",
        "rail_wear_mm": 6.0,
        "sensor_health_index": 80.0
    }, headers=headers)
    rec_id = gen_res.json()["recommendation_id"]

    # Step B: Admin rejects with mandatory reason
    rej_res = client.post(
        f"/api/v1/ai/recommendations/{rec_id}/reject",
        json={"rejection_reason": "Asset health is within acceptable safety tolerances."},
        headers=headers
    )
    assert rej_res.status_code == 200
    data = rej_res.json()
    assert data["status"] == "REJECTED"
    assert data["task_id"] is None
    assert data["rejection_reason"] == "Asset health is within acceptable safety tolerances."


def test_11_engineering_cannot_approve_recommendation():
    """11. Engineering cannot approve an AI recommendation (returns HTTP 403 Forbidden)."""
    eng_token = get_token("engineering_officer", "Eng@123")
    headers = {"Authorization": f"Bearer {eng_token}"}

    res = client.post("/api/v1/ai/recommendations/1/approve", json={"approval_comment": "test"}, headers=headers)
    assert res.status_code == 403
    assert "restricted to Admin only" in res.json()["detail"]


def test_12_trd_cannot_approve_recommendation():
    """12. TRD cannot approve an AI recommendation (returns HTTP 403 Forbidden)."""
    trd_token = get_token("traction_officer", "Trd@123")
    headers = {"Authorization": f"Bearer {trd_token}"}

    res = client.post("/api/v1/ai/recommendations/1/approve", json={"approval_comment": "test"}, headers=headers)
    assert res.status_code == 403
    assert "restricted to Admin only" in res.json()["detail"]


def test_13_snt_cannot_approve_recommendation():
    """13. S&T cannot approve an AI recommendation (returns HTTP 403 Forbidden)."""
    snt_token = get_token("signal_officer", "Signal@123")
    headers = {"Authorization": f"Bearer {snt_token}"}

    res = client.post("/api/v1/ai/recommendations/1/approve", json={"approval_comment": "test"}, headers=headers)
    assert res.status_code == 403
    assert "restricted to Admin only" in res.json()["detail"]


def test_14_approved_recommendation_becomes_official():
    """14. Approved recommendation becomes official and is visible in approved list."""
    admin_token = get_token("admin", "Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Generate and approve an ENG recommendation
    gen_res = client.post("/api/v1/ai/predictive-maintenance", json={
        "department_code": "ENG",
        "rail_wear_mm": 11.0,
        "sensor_health_index": 45.0
    }, headers=admin_headers)
    rec_id = gen_res.json()["recommendation_id"]
    client.post(f"/api/v1/ai/recommendations/{rec_id}/approve", json={"approval_comment": "Sanctioned official."}, headers=admin_headers)

    # Engineering user checks approved updates
    eng_token = get_token("engineering_officer", "Eng@123")
    eng_headers = {"Authorization": f"Bearer {eng_token}"}
    appr_res = client.get("/api/v1/ai/recommendations/approved", headers=eng_headers)
    assert appr_res.status_code == 200
    ids = [r["id"] for r in appr_res.json()["recommendations"]]
    assert rec_id in ids


def test_15_rejected_recommendation_does_not_become_official():
    """15. Rejected recommendation does NOT become official and is not in approved list."""
    admin_token = get_token("admin", "Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Generate and reject
    gen_res = client.post("/api/v1/ai/predictive-maintenance", json={
        "department_code": "ENG",
        "rail_wear_mm": 5.0
    }, headers=admin_headers)
    rec_id = gen_res.json()["recommendation_id"]
    client.post(f"/api/v1/ai/recommendations/{rec_id}/reject", json={"rejection_reason": "Not critical."}, headers=admin_headers)

    # Engineering checks approved
    eng_token = get_token("engineering_officer", "Eng@123")
    eng_headers = {"Authorization": f"Bearer {eng_token}"}
    appr_res = client.get("/api/v1/ai/recommendations/approved", headers=eng_headers)
    assert appr_res.status_code == 200
    ids = [r["id"] for r in appr_res.json()["recommendations"]]
    assert rec_id not in ids


def test_16_department_isolation_on_approved_recommendations():
    """16. Engineering sees only ENG; TRD sees only TRD; S&T sees only SNT."""
    eng_token = get_token("engineering_officer", "Eng@123")
    trd_token = get_token("traction_officer", "Trd@123")
    snt_token = get_token("signal_officer", "Signal@123")

    # Engineering checks approved: all must be ENG
    eng_res = client.get("/api/v1/ai/recommendations/approved", headers={"Authorization": f"Bearer {eng_token}"})
    assert eng_res.status_code == 200
    for r in eng_res.json()["recommendations"]:
        assert r["department_code"] == "ENG"

    # TRD checks approved: all must be TRD
    trd_res = client.get("/api/v1/ai/recommendations/approved", headers={"Authorization": f"Bearer {trd_token}"})
    assert trd_res.status_code == 200
    for r in trd_res.json()["recommendations"]:
        assert r["department_code"] == "TRD"

    # S&T checks approved: all must be SNT
    snt_res = client.get("/api/v1/ai/recommendations/approved", headers={"Authorization": f"Bearer {snt_token}"})
    assert snt_res.status_code == 200
    for r in snt_res.json()["recommendations"]:
        assert r["department_code"] == "SNT"


def test_17_cross_department_query_blocked():
    """17. Non-admin attempting to query foreign department approved recommendations receives HTTP 403."""
    eng_token = get_token("engineering_officer", "Eng@123")
    headers = {"Authorization": f"Bearer {eng_token}"}

    res = client.get("/api/v1/ai/recommendations/approved?department_code=TRD", headers=headers)
    assert res.status_code == 403
    assert "Department isolation violation" in res.json()["detail"]


def test_18_direct_id_tampering_blocked():
    """18. Department user attempting direct GET /recommendations/{id} on foreign department or unapproved receives HTTP 403."""
    # Find a TRD recommendation
    db = SessionLocal()
    trd_rec = db.query(AIRecommendation).filter(AIRecommendation.department_code == "TRD").first()
    db.close()
    assert trd_rec is not None

    # Engineering user attempts to fetch TRD recommendation by ID
    eng_token = get_token("engineering_officer", "Eng@123")
    headers = {"Authorization": f"Bearer {eng_token}"}

    res = client.get(f"/api/v1/ai/recommendations/{trd_rec.id}", headers=headers)
    assert res.status_code == 403
    assert "Department isolation violation" in res.json()["detail"]
