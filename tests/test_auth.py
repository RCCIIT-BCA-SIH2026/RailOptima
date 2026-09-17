import pytest
import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models import User, Block

client = TestClient(app)

def test_login_json_success():
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "Admin@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "Admin"
    assert data["username"] == "admin"

def test_login_form_success():
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "Admin@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "Admin"

def test_login_invalid_password():
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "WrongPassword123"}
    )
    assert response.status_code == 401
    assert "detail" in response.json()

def test_login_missing_fields():
    response = client.post(
        "/api/auth/login",
        json={"username": "admin"}
    )
    assert response.status_code == 400

def test_register_and_login_new_user():
    import uuid
    uid = str(uuid.uuid4())[:8]
    new_username = f"user_{uid}"
    new_email = f"user_{uid}@railways.gov.in"
    
    # 1. Register
    reg_response = client.post(
        "/api/auth/register",
        json={
            "username": new_username,
            "email": new_email,
            "password": "SecurePassword@123",
            "full_name": f"Test Officer {uid}",
            "role_name": "Supervisor",
            "department_code": "ENG"
        }
    )
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert reg_data["username"] == new_username
    assert reg_data["role"] == "Supervisor"

    # Duplicate registration should fail
    dup_response = client.post(
        "/api/auth/register",
        json={
            "username": new_username,
            "email": new_email,
            "password": "SecurePassword@123",
            "full_name": f"Test Officer {uid}",
            "role_name": "Supervisor",
            "department_code": "ENG"
        }
    )
    assert dup_response.status_code == 400

    # 2. Login with new credentials
    login_response = client.post(
        "/api/auth/login",
        json={"username": new_username, "password": "SecurePassword@123"}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # 3. Verify /me profile
    me_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["username"] == new_username

def test_auth_me_unauthorized():
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_logout():
    # Login first
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    token = login_res.json()["access_token"]
    
    logout_res = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["status"] == "success"

@pytest.mark.parametrize("username,password,expected_role", [
    ("admin", "Admin@123", "Admin"),
    ("drm", "Drm@123", "DRM"),
    ("engineering_officer", "Eng@123", "Sr_DEN"),
    ("signal_officer", "Signal@123", "Sr_DSTE"),
    ("traction_officer", "Trd@123", "Sr_DEE"),
    ("control_office", "Opt@123", "Sr_DOM"),
    ("maintenance_supervisor", "Supervisor@123", "Supervisor"),
    ("supervisor", "Supervisor@123", "Supervisor"),
])
def test_all_demo_accounts_login(username, password, expected_role):
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": password}
    )
    assert response.status_code == 200, f"Failed login for {username}: {response.text}"
    data = response.json()
    assert data["role"] == expected_role
    assert "access_token" in data

def test_rbac_approval_action_permitted_for_drm():
    # DRM login
    drm_login = client.post("/api/auth/login", json={"username": "drm", "password": "Drm@123"})
    token = drm_login.json()["access_token"]

    db = SessionLocal()
    block = db.query(Block).first()
    db.close()
    assert block is not None

    res = client.post(
        f"/api/v1/approvals/{block.id}/action",
        json={"action": "Approved", "comments": "Approved by DRM Bhopal"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert res.json()["new_status"] == "Approved"

def test_rbac_approval_action_forbidden_for_supervisor():
    # Supervisor login
    sup_login = client.post("/api/auth/login", json={"username": "maintenance_supervisor", "password": "Supervisor@123"})
    token = sup_login.json()["access_token"]

    db = SessionLocal()
    block = db.query(Block).first()
    db.close()

    res = client.post(
        f"/api/v1/approvals/{block.id}/action",
        json={"action": "Approved", "comments": "Attempted approval by supervisor"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 403
    assert "Operation not permitted" in res.json()["detail"]

def test_rbac_audit_logs_protection():
    # Supervisor cannot read compliance audit logs
    sup_login = client.post("/api/auth/login", json={"username": "supervisor", "password": "Supervisor@123"})
    sup_token = sup_login.json()["access_token"]

    sup_res = client.get("/api/v1/audit", headers={"Authorization": f"Bearer {sup_token}"})
    assert sup_res.status_code == 403

    # Admin can read audit logs
    admin_login = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    admin_token = admin_login.json()["access_token"]

    admin_res = client.get("/api/v1/audit", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_res.status_code == 200
    assert "logs" in admin_res.json()

