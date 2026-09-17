import pytest
import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from data.seed_data import seed_database

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_database()

def test_health_and_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["sih_problem_statement"] == "SIH26027"

    res_h = client.get("/health")
    assert res_h.status_code == 200
    assert res_h.json()["status"] == "healthy"

def test_auth_login_and_me():
    # Login as DRM
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "drm_bhopal", "password": "Drm@123"}
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["role"] == "DRM"
    token = data["access_token"]

    # Access /me
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "drm_bhopal"
    assert me_res.json()["role"] == "DRM"

def test_dashboard_summary():
    res = client.get("/api/v1/analytics/dashboard-summary")
    assert res.status_code == 200
    d = res.json()
    assert d["total_assets"] >= 150
    assert d["active_defects"] > 0
    assert d["system_punctuality_pct"] > 80.0
    assert d["data_mode"] == "SIMULATED DEMO DATA"

def test_corridors_and_sections():
    c_res = client.get("/api/v1/corridors")
    assert c_res.status_code == 200
    assert len(c_res.json()) >= 8

    s_res = client.get("/api/v1/corridors/sections")
    assert s_res.status_code == 200
    assert len(s_res.json()) >= 30

def test_defects_and_priority_recalc():
    d_res = client.get("/api/v1/defects?limit=10")
    assert d_res.status_code == 200
    assert len(d_res.json()) == 10

    recalc_res = client.post("/api/v1/defects/recalculate-priority")
    assert recalc_res.status_code == 200
    assert recalc_res.json()["defects_evaluated"] > 0

def test_trains_and_live_tracking():
    t_res = client.get("/api/v1/trains?limit=10")
    assert t_res.status_code == 200
    assert len(t_res.json()) == 10

    live_res = client.get("/api/v1/trains/live-tracking")
    assert live_res.status_code == 200
    assert len(live_res.json()) > 0

def test_full_optimization_and_approval_workflow():
    # 1. Login as Sr. DOM
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "sr_dom_opt", "password": "Opt@123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Run Optimization
    opt_res = client.post(
        "/api/v1/optimization/run",
        json={"horizon_hours": 24, "strategy_code": "BALANCED"},
        headers=headers
    )
    assert opt_res.status_code == 200
    opt_data = opt_res.json()
    assert opt_data["status"] == "Success"
    assert opt_data["alternatives_count"] == 3

    # 3. Select Alternative 1
    sel_res = client.post(
        "/api/v1/optimization/select-alternative/1",
        headers=headers
    )
    assert sel_res.status_code == 200
    sel_data = sel_res.json()
    assert sel_data["status"] == "Under_Review"
    assert sel_data["blocks_count"] > 0

    # 4. Get Pending Approvals
    pending_res = client.get("/api/v1/approvals/pending")
    assert pending_res.status_code == 200
    pending_blocks = pending_res.json()["blocks"]
    assert len(pending_blocks) > 0
    target_block_id = pending_blocks[0]["block_id"]

    # 5. Officer approves the block
    appr_res = client.post(
        f"/api/v1/approvals/{target_block_id}/action",
        json={"action": "Approved", "comments": "Approved for execution by DRM"},
        headers=headers
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["new_status"] == "Approved"

def test_what_if_simulation():
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "Admin@123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sim_res = client.post(
        "/api/v1/simulation/run",
        json={"name": "Freight Surge 25%", "freight_surge_pct": 25, "emergency_defects_count": 2, "speed_restriction_pct": 10},
        headers=headers
    )
    assert sim_res.status_code == 200
    assert "metrics" in sim_res.json()
    assert sim_res.json()["metrics"]["projected_total_delay_minutes"] > 0

def test_integrations_sync():
    stat_res = client.get("/api/v1/integrations/status")
    assert stat_res.status_code == 200
    assert len(stat_res.json()["systems"]) == 4

    sync_res = client.post("/api/v1/integrations/sync/TMS")
    assert sync_res.status_code == 200
    assert sync_res.json()["status"] == "Success"
    assert sync_res.json()["records_ingested"] > 0

def test_audit_logs():
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "Admin@123"})
    token = login_res.json()["access_token"]
    audit_res = client.get("/api/v1/audit", headers={"Authorization": f"Bearer {token}"})
    assert audit_res.status_code == 200
    assert audit_res.json()["total_records"] > 0


