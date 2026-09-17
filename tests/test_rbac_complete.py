import pytest
import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models import User, Block, Defect, MaintenanceTask, Asset, Department

client = TestClient(app)

def get_token(username, password):
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]

# ---------------------------------------------------------------------------
# 1. Login & Token Canonical Role Verification for All 6 Canonical Roles
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("username,password,expected_canonical_role,expected_dept", [
    ("admin", "Admin@123", "ADMIN", "ALL"),
    ("engineering_officer", "Eng@123", "ENGINEERING", "ENG"),
    ("traction_officer", "Trd@123", "TRD", "TRD"),
    ("signal_officer", "Signal@123", "S&T", "SNT"),
    ("control_office", "Opt@123", "CONTROL_OFFICE", "OPT"),
    ("drm", "Drm@123", "DRM", "OPT"),
])
def test_all_six_canonical_roles_login_payload(username, password, expected_canonical_role, expected_dept):
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200
    data = res.json()
    assert data["canonical_role"] == expected_canonical_role
    assert data["department"] == expected_dept
    assert "user" in data
    assert data["user"]["canonical_role"] == expected_canonical_role


# ---------------------------------------------------------------------------
# 2. Engineering Department Isolation: ENG Access Only; TRD/SNT Blocked (403)
# ---------------------------------------------------------------------------
def test_engineering_user_access_and_isolation():
    token = get_token("engineering_officer", "Eng@123")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Access ENG defects -> 200
    res = client.get("/api/v1/defects?department=ENG", headers=headers)
    assert res.status_code == 200
    items = res.json().get("items", [])
    assert len(items) > 0
    for d in items:
        assert d["department_code"] == "ENG"

    # 2. Access foreign department (TRD) defects -> 403 Forbidden
    res_foreign = client.get("/api/v1/defects?department=TRD", headers=headers)
    assert res_foreign.status_code == 403
    assert "Department isolation violation" in res_foreign.json()["detail"]

    # 3. Access foreign department (SNT) defects -> 403 Forbidden
    res_snt = client.get("/api/v1/defects?department=SNT", headers=headers)
    assert res_snt.status_code == 403

    # 4. Access assets without department param -> automatically scoped to ONLY ENG assets
    res_assets_auto = client.get("/api/v1/assets", headers=headers)
    assert res_assets_auto.status_code == 200
    auto_assets = res_assets_auto.json().get("assets", [])
    assert len(auto_assets) > 0
    for a in auto_assets:
        assert a["department_code"] == "ENG", f"Security violation: Found foreign department {a['department_code']} in ENG assets response"
    assert not any(a["department_code"] in ["SNT", "TRD", "OPT"] for a in auto_assets)

    # 5. Access ENG assets with explicit ENG filter -> 200
    res_assets = client.get("/api/v1/assets?department_code=ENG", headers=headers)
    assert res_assets.status_code == 200

    # 6. Access foreign department (TRD) assets -> 403 Forbidden
    res_trd_assets = client.get("/api/v1/assets?department_code=TRD", headers=headers)
    assert res_trd_assets.status_code == 403

    # 7. Access foreign department (SNT) assets -> 403 Forbidden
    res_snt_assets = client.get("/api/v1/assets?department_code=SNT", headers=headers)
    assert res_snt_assets.status_code == 403

    # 8. Attempting to access ALL assets via query param -> 403 Forbidden
    res_all_assets = client.get("/api/v1/assets?department_code=ALL", headers=headers)
    assert res_all_assets.status_code == 403

    # 9. Direct department_id query using foreign department ID (2=SNT, 3=TRD) -> 403 Forbidden
    res_dept_id_snt = client.get("/api/v1/assets?department_id=2", headers=headers)
    assert res_dept_id_snt.status_code == 403
    res_dept_id_trd = client.get("/api/v1/assets?department_id=3", headers=headers)
    assert res_dept_id_trd.status_code == 403

    # 10. Direct single asset lookup by foreign ID -> 403 Forbidden
    db = SessionLocal()
    snt_dept = db.query(Department).filter(Department.code == "SNT").first()
    snt_asset = db.query(Asset).filter(Asset.department_id == snt_dept.id).first() if snt_dept else None
    db.close()
    if snt_asset:
        res_snt_asset_lookup = client.get(f"/api/v1/assets/{snt_asset.id}", headers=headers)
        assert res_snt_asset_lookup.status_code == 403

    # 11. Access train timetable -> 403 Forbidden
    res_trains = client.get("/api/v1/trains", headers=headers)
    assert res_trains.status_code == 403

    # 12. Approvals action -> 403 Forbidden
    db = SessionLocal()
    block = db.query(Block).first()
    db.close()
    if block:
        res_appr = client.post(
            f"/api/v1/approvals/{block.id}/action",
            json={"action": "Approved", "comments": "Unauthorized action"},
            headers=headers
        )
        assert res_appr.status_code == 403


# ---------------------------------------------------------------------------
# 3. TRD Department Isolation: TRD Access Only; ENG/SNT Blocked (403)
# ---------------------------------------------------------------------------
def test_trd_user_access_and_isolation():
    token = get_token("traction_officer", "Trd@123")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Access TRD defects -> 200
    res = client.get("/api/v1/defects?department=TRD", headers=headers)
    assert res.status_code == 200
    items = res.json().get("items", [])
    assert len(items) > 0
    for d in items:
        assert d["department_code"] == "TRD"

    # 2. Access foreign department (ENG) defects -> 403 Forbidden
    res_foreign = client.get("/api/v1/defects?department=ENG", headers=headers)
    assert res_foreign.status_code == 403
    assert "Department isolation violation" in res_foreign.json()["detail"]

    # 3. Access assets without department param -> automatically scoped to ONLY TRD assets
    res_assets_auto = client.get("/api/v1/assets", headers=headers)
    assert res_assets_auto.status_code == 200
    auto_assets = res_assets_auto.json().get("assets", [])
    assert len(auto_assets) > 0
    for a in auto_assets:
        assert a["department_code"] == "TRD"
    assert not any(a["department_code"] in ["ENG", "SNT", "OPT"] for a in auto_assets)

    # 4. Access foreign department (ENG) assets -> 403 Forbidden
    res_assets = client.get("/api/v1/assets?department_code=ENG", headers=headers)
    assert res_assets.status_code == 403

    # 5. Attempting to access ALL assets via query param -> 403 Forbidden
    res_all_assets = client.get("/api/v1/assets?department_code=ALL", headers=headers)
    assert res_all_assets.status_code == 403

    # 6. Foreign department_id query -> 403 Forbidden
    res_dept_id = client.get("/api/v1/assets?department_id=1", headers=headers)
    assert res_dept_id.status_code == 403

    # 7. Access train timetable -> 403 Forbidden
    res_trains = client.get("/api/v1/trains", headers=headers)
    assert res_trains.status_code == 403

    # 8. Approvals action -> 403 Forbidden
    db = SessionLocal()
    block = db.query(Block).first()
    db.close()
    if block:
        res_appr = client.post(
            f"/api/v1/approvals/{block.id}/action",
            json={"action": "Approved", "comments": "TRD officer unauthorized action"},
            headers=headers
        )
        assert res_appr.status_code == 403


# ---------------------------------------------------------------------------
# 4. S&T Department Isolation: SNT Access Only; ENG/TRD Blocked (403)
# ---------------------------------------------------------------------------
def test_snt_user_access_and_isolation():
    token = get_token("signal_officer", "Signal@123")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Access SNT defects -> 200
    res = client.get("/api/v1/defects?department=SNT", headers=headers)
    assert res.status_code == 200
    items = res.json().get("items", [])
    assert len(items) > 0
    for d in items:
        assert d["department_code"] == "SNT"

    # 2. Access foreign department (ENG) defects -> 403 Forbidden
    res_eng = client.get("/api/v1/defects?department=ENG", headers=headers)
    assert res_eng.status_code == 403

    # 3. Access foreign department (TRD) defects -> 403 Forbidden
    res_trd = client.get("/api/v1/defects?department=TRD", headers=headers)
    assert res_trd.status_code == 403

    # 4. Access assets without department param -> automatically scoped to ONLY SNT assets
    res_assets_auto = client.get("/api/v1/assets", headers=headers)
    assert res_assets_auto.status_code == 200
    auto_assets = res_assets_auto.json().get("assets", [])
    assert len(auto_assets) > 0
    for a in auto_assets:
        assert a["department_code"] == "SNT"
    assert not any(a["department_code"] in ["ENG", "TRD", "OPT"] for a in auto_assets)

    # 5. Access foreign department (ENG) assets -> 403 Forbidden
    res_eng_assets = client.get("/api/v1/assets?department_code=ENG", headers=headers)
    assert res_eng_assets.status_code == 403

    # 6. Attempting to access ALL assets via query param -> 403 Forbidden
    res_all_assets = client.get("/api/v1/assets?department_code=ALL", headers=headers)
    assert res_all_assets.status_code == 403

    # 7. Access train timetable -> 403 Forbidden
    res_trains = client.get("/api/v1/trains", headers=headers)
    assert res_trains.status_code == 403


# ---------------------------------------------------------------------------
# 5. Direct ID Lookup Isolation (GET /defects/{id} and /maintenance/tasks/{id})
# ---------------------------------------------------------------------------
def test_cross_department_direct_id_forbidden():
    db = SessionLocal()
    trd_dept = db.query(Department).filter(Department.code == "TRD").first()
    eng_dept = db.query(Department).filter(Department.code == "ENG").first()
    trd_defect = db.query(Defect).filter(Defect.department_id == trd_dept.id).first() if trd_dept else None
    eng_defect = db.query(Defect).filter(Defect.department_id == eng_dept.id).first() if eng_dept else None
    db.close()

    eng_token = get_token("engineering_officer", "Eng@123")
    eng_headers = {"Authorization": f"Bearer {eng_token}"}

    trd_token = get_token("traction_officer", "Trd@123")
    trd_headers = {"Authorization": f"Bearer {trd_token}"}

    # ENG officer trying to access specific TRD defect by ID -> 403 Forbidden
    if trd_defect:
        res = client.get(f"/api/v1/defects/{trd_defect.id}", headers=eng_headers)
        assert res.status_code == 403

    # TRD officer trying to access specific ENG defect by ID -> 403 Forbidden
    if eng_defect:
        res = client.get(f"/api/v1/defects/{eng_defect.id}", headers=trd_headers)
        assert res.status_code == 403


# ---------------------------------------------------------------------------
# 6. CONTROL_OFFICE: Train Movement, Timetable, Freight Forecast, Windows
# ---------------------------------------------------------------------------
def test_control_office_operational_access():
    token = get_token("control_office", "Opt@123")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Train timetable -> 200
    res_trains = client.get("/api/v1/trains", headers=headers)
    assert res_trains.status_code == 200

    # 2. Live tracking -> 200
    res_live = client.get("/api/v1/trains/live-tracking", headers=headers)
    assert res_live.status_code == 200

    # 3. Freight forecast -> 200
    res_freight = client.get("/api/v1/trains/freight-forecast", headers=headers)
    assert res_freight.status_code == 200

    # 4. Proposed blocks & possession schedules -> 200
    res_blocks = client.get("/api/v1/blocks", headers=headers)
    assert res_blocks.status_code == 200

    # 5. Operational block approval action -> 200
    db = SessionLocal()
    block = db.query(Block).first()
    db.close()
    if block:
        res_action = client.post(
            f"/api/v1/approvals/{block.id}/action",
            json={"action": "Approved", "comments": "Approved by Sr. DOM Control Office"},
            headers=headers
        )
        assert res_action.status_code == 200


# ---------------------------------------------------------------------------
# 7. DRM: Executive Approvals, Block Review, Punctuality & Reports
# ---------------------------------------------------------------------------
def test_drm_executive_authority():
    token = get_token("drm", "Drm@123")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Pending approvals -> 200
    res_appr = client.get("/api/v1/approvals/pending", headers=headers)
    assert res_appr.status_code == 200

    # 2. Executive report summary -> 200
    res_rep = client.get("/api/v1/reports/summary", headers=headers)
    assert res_rep.status_code == 200

    # 3. Executive approval action -> 200
    db = SessionLocal()
    block = db.query(Block).first()
    db.close()
    if block:
        res_action = client.post(
            f"/api/v1/approvals/{block.id}/action",
            json={"action": "Approved", "comments": "Sanctioned by Divisional Railway Manager Bhopal"},
            headers=headers
        )
        assert res_action.status_code == 200
        assert res_action.json()["new_status"] == "Approved"


# ---------------------------------------------------------------------------
# 8. ADMIN: Complete Cross-Department System Authority
# ---------------------------------------------------------------------------
def test_admin_full_system_access():
    token = get_token("admin", "Admin@123")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Admin can access all defects across all departments
    res_defects = client.get("/api/v1/defects", headers=headers)
    assert res_defects.status_code == 200

    # 2. Admin can access specific departments explicitly without 403
    for dept in ["ENG", "TRD", "SNT", "OPT"]:
        res_d = client.get(f"/api/v1/defects?department={dept}", headers=headers)
        assert res_d.status_code == 200

    # 3. Admin can access all assets
    res_assets = client.get("/api/v1/assets", headers=headers)
    assert res_assets.status_code == 200

    # 4. Admin can access trains
    res_trains = client.get("/api/v1/trains", headers=headers)
    assert res_trains.status_code == 200

    # 5. Admin can access blocks
    res_blocks = client.get("/api/v1/blocks", headers=headers)
    assert res_blocks.status_code == 200

    # 6. Admin can perform approvals
    db = SessionLocal()
    block = db.query(Block).first()
    db.close()
    if block:
        res_action = client.post(
            f"/api/v1/approvals/{block.id}/action",
            json={"action": "Approved", "comments": "Admin sanction override"},
            headers=headers
        )
        assert res_action.status_code == 200
