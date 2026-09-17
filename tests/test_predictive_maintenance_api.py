import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from ml.predictive_maintenance import predictive_engine

client = TestClient(app)

def get_token(username, password):
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]

# ---------------------------------------------------------------------------
# 1. Functional ML Prediction Tests
# ---------------------------------------------------------------------------

def test_predictive_maintenance_valid_prediction():
    """Verify endpoint returns complete schema for a valid full-feature payload."""
    payload = {
        "rail_wear_mm": 6.5,
        "track_vibration_level": 3.2,
        "wheel_wear_percent": 45.0,
        "brake_pad_wear_percent": 50.0,
        "brake_pressure_psi": 84.0,
        "axle_temperature_c": 65.0,
        "bearing_temperature_c": 70.0,
        "battery_voltage": 24.0,
        "sensor_health_index": 70.0,
        "inspection_score": 75.0,
        "train_age_years": 12.0,
        "distance_travelled_km": 600000.0,
        "average_speed_kmph": 75.0,
        "delay_minutes": 15.0,
        "last_maintenance_days": 150.0,
        "ambient_temperature_c": 30.0,
        "humidity_percent": 60.0,
        "rainfall_mm": 15.0,
        "region": "Northern Railway",
        "season": "Summer",
        "train_type": "Express"
    }
    response = client.post("/api/v1/ai/predictive-maintenance", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "maintenance_required" in data
    assert isinstance(data["maintenance_required"], bool)
    assert "maintenance_probability" in data
    assert 0.0 <= data["maintenance_probability"] <= 1.0
    assert data["risk_level"] in ["Low", "Medium", "High", "Critical"]
    assert "top_risk_factors" in data
    assert len(data["top_risk_factors"]) > 0
    assert data["model_type"] == "RandomForestClassifier"
    assert "model_version" in data
    assert data["status"] == "success"

def test_predictive_maintenance_high_risk_asset():
    """Verify high wear and high age trigger maintenance_required=True with elevated probability."""
    payload = {
        "rail_wear_mm": 16.8,
        "train_age_years": 32.0,
        "brake_pad_wear_percent": 92.0,
        "brake_pressure_psi": 48.0,
        "wheel_wear_percent": 88.0,
        "track_vibration_level": 7.5,
        "bearing_temperature_c": 95.0,
        "sensor_health_index": 30.0,
        "inspection_score": 35.0,
        "last_maintenance_days": 340.0
    }
    response = client.post("/api/v1/ai/predictive-maintenance", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["maintenance_required"] is True
    assert data["maintenance_probability"] >= 0.70
    assert data["risk_level"] in ["High", "Critical"]
    assert "Schedule Emergency" in data["recommended_action"] or "Upcoming" in data["recommended_action"]

def test_predictive_maintenance_low_risk_asset():
    """Verify new asset with negligible wear triggers maintenance_required=False with low probability."""
    payload = {
        "rail_wear_mm": 2.0,
        "train_age_years": 2.0,
        "brake_pad_wear_percent": 15.0,
        "brake_pressure_psi": 95.0,
        "wheel_wear_percent": 10.0,
        "track_vibration_level": 1.2,
        "bearing_temperature_c": 55.0,
        "sensor_health_index": 92.0,
        "inspection_score": 95.0,
        "last_maintenance_days": 20.0
    }
    response = client.post("/api/v1/ai/predictive-maintenance", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["maintenance_required"] is False
    assert data["maintenance_probability"] < 0.50
    assert data["risk_level"] == "Low"

def test_predictive_maintenance_missing_optional_values():
    """Verify median imputer in pipeline handles omitted/null numerical values without crashing."""
    payload = {
        "rail_wear_mm": 13.5,
        "train_age_years": 22.0
    }
    response = client.post("/api/v1/ai/predictive-maintenance", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "maintenance_required" in data
    assert "maintenance_probability" in data

def test_predictive_maintenance_unknown_categorical_values():
    """Verify OneHotEncoder handle_unknown='ignore' handles unseen categories cleanly."""
    payload = {
        "rail_wear_mm": 5.0,
        "region": "Interstellar Railway",
        "season": "Solar Flare",
        "train_type": "Hovercraft"
    }
    response = client.post("/api/v1/ai/predictive-maintenance", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "maintenance_required" in data

def test_predictive_maintenance_invalid_input():
    """Verify Pydantic input validation blocks malformed types with HTTP 422."""
    payload = {
        "rail_wear_mm": "this_is_not_a_number_invalid_payload"
    }
    response = client.post("/api/v1/ai/predictive-maintenance", json=payload)
    assert response.status_code == 422

def test_predictive_maintenance_model_unavailable(monkeypatch):
    """Verify HTTP 503 is returned if pipeline fails or is not loaded."""
    original_pipeline = predictive_engine.pipeline
    try:
        predictive_engine.pipeline = None
        response = client.post("/api/v1/ai/predictive-maintenance", json={"rail_wear_mm": 5.0})
        assert response.status_code == 503
        assert "unavailable" in response.json()["detail"].lower()
    finally:
        predictive_engine.pipeline = original_pipeline

# ---------------------------------------------------------------------------
# 2. RBAC & Department Isolation Tests
# ---------------------------------------------------------------------------

def test_predictive_maintenance_department_isolation_unauthorized():
    """Verify an Engineering user cannot execute predictive maintenance (returns HTTP 403 Forbidden - Admin only)."""
    eng_token = get_token("engineering_officer", "Eng@123")
    headers = {"Authorization": f"Bearer {eng_token}"}

    payload = {
        "department_code": "SNT",
        "rail_wear_mm": 5.0,
        "sensor_health_index": 70.0
    }
    res = client.post("/api/v1/ai/predictive-maintenance", json=payload, headers=headers)
    assert res.status_code == 403
    assert "restricted to Admin only" in res.json()["detail"]

def test_predictive_maintenance_department_user_blocked_from_execution():
    """Verify an Engineering user cannot execute AI risk prediction even for ENG assets (returns HTTP 403 Forbidden)."""
    eng_token = get_token("engineering_officer", "Eng@123")
    headers = {"Authorization": f"Bearer {eng_token}"}

    payload = {
        "department_code": "ENG",
        "rail_wear_mm": 11.5,
        "sensor_health_index": 65.0
    }
    res = client.post("/api/v1/ai/predictive-maintenance", json=payload, headers=headers)
    assert res.status_code == 403
    assert "restricted to Admin only" in res.json()["detail"]

def test_predictive_maintenance_admin_cross_department_access():
    """Verify an Admin user can evaluate any department asset without restrictions (returns HTTP 200 OK)."""
    admin_token = get_token("admin", "Admin@123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin evaluates SNT asset
    res_snt = client.post("/api/v1/ai/predictive-maintenance", json={"department_code": "SNT", "rail_wear_mm": 4.5}, headers=headers)
    assert res_snt.status_code == 200

    # Admin evaluates TRD asset
    res_trd = client.post("/api/v1/ai/predictive-maintenance", json={"department_code": "TRD", "rail_wear_mm": 4.5}, headers=headers)
    assert res_trd.status_code == 200
