import os
import sys
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from ml.train_delay_predictor import train_delay_engine

client = TestClient(app)


def get_auth_headers(username: str, password: str):
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def valid_delay_payload():
    return {
        "rainfall_mm": 42.5,
        "humidity_percent": 86.0,
        "ambient_temperature_c": 29.0,
        "average_speed_kmph": 72.0,
        "distance_travelled_km": 480000,
        "train_age_years": 8,
        "last_maintenance_days": 40,
        "season": "Monsoon",
        "region": "Northern Railway",
        "train_type": "Express",
        "scheduled_arrival": "2026-09-20T14:30:00Z"
    }


def test_api_valid_prediction(valid_delay_payload):
    """Test 1: Valid API request returns HTTP 200 and expected schema."""
    res = client.post("/api/v1/ai/train-delay-prediction", json=valid_delay_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "predicted_delay_minutes" in data
    assert data["predicted_delay_minutes"] > 0
    assert data["model_type"] == "HistGradientBoostingRegressor"
    assert "top_contributing_factors" in data
    assert len(data["top_contributing_factors"]) > 0


def test_api_missing_optional_values():
    """Test 2: Request with sparse features succeeds using pipeline median/mode imputation."""
    sparse_payload = {
        "season": "Summer",
        "region": "Western Railway",
        "train_type": "Freight"
    }
    res = client.post("/api/v1/ai/train-delay-prediction", json=sparse_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert isinstance(data["predicted_delay_minutes"], (int, float))
    assert data["predicted_delay_minutes"] >= 0.0


def test_api_unseen_categorical_values():
    """Test 3: Unseen categories do not cause HTTP 500 error."""
    unseen_payload = {
        "rainfall_mm": 5.0,
        "humidity_percent": 45.0,
        "ambient_temperature_c": 26.0,
        "season": "Autumn_Monsoon_Hybrid",
        "region": "Konkan_Private_Sector",
        "train_type": "Maglev_Shinkansen"
    }
    res = client.post("/api/v1/ai/train-delay-prediction", json=unseen_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["predicted_delay_minutes"] >= 0.0


def test_api_non_negative_prediction():
    """Test 4: Predicted delay minutes is strictly non-negative (>= 0.0)."""
    optimal_payload = {
        "rainfall_mm": 0.0,
        "humidity_percent": 10.0,
        "ambient_temperature_c": 22.0,
        "average_speed_kmph": 110.0,
        "distance_travelled_km": 5000,
        "train_age_years": 1,
        "last_maintenance_days": 1,
        "season": "Winter",
        "region": "Western Railway",
        "train_type": "Express"
    }
    res = client.post("/api/v1/ai/train-delay-prediction", json=optimal_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_delay_minutes"] >= 0.0


def test_api_eta_calculation_when_scheduled_arrival_supplied(valid_delay_payload):
    """Test 5: If scheduled_arrival is supplied, predicted_eta is accurately computed."""
    res = client.post("/api/v1/ai/train-delay-prediction", json=valid_delay_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["scheduled_arrival"] is not None
    assert data["predicted_eta"] is not None

    dt_sched = datetime.fromisoformat(data["scheduled_arrival"])
    dt_eta = datetime.fromisoformat(data["predicted_eta"])
    expected_eta = dt_sched + timedelta(minutes=data["predicted_delay_minutes"])
    assert dt_eta == expected_eta


def test_api_eta_null_when_scheduled_arrival_absent():
    """Test 6: If scheduled_arrival is omitted, predicted_eta and scheduled_arrival must be null."""
    no_eta_payload = {
        "season": "Summer",
        "region": "Northern Railway",
        "train_type": "Passenger",
        "rainfall_mm": 12.0
    }
    res = client.post("/api/v1/ai/train-delay-prediction", json=no_eta_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["scheduled_arrival"] is None
    assert data["predicted_eta"] is None
    assert data["predicted_delay_minutes"] >= 0.0


def test_api_model_unavailable(monkeypatch):
    """Test 7: Returns HTTP 503 when the ML model pipeline is unavailable."""
    original_pipeline = train_delay_engine.pipeline
    try:
        train_delay_engine.pipeline = None
        res = client.post("/api/v1/ai/train-delay-prediction", json={"season": "Summer"})
        assert res.status_code == 503
        assert "unavailable" in res.json()["detail"].lower()
    finally:
        train_delay_engine.pipeline = original_pipeline


def test_api_invalid_input():
    """Test 8: Invalid feature types return HTTP 422 Unprocessable Entity."""
    invalid_payload = {
        "rainfall_mm": "NON_NUMERIC_RAINFALL_STRING",
        "humidity_percent": "HIGH_HUMIDITY"
    }
    res = client.post("/api/v1/ai/train-delay-prediction", json=invalid_payload)
    assert res.status_code == 422


def test_api_rbac_authorization():
    """Test 9: Train delay prediction enforces RBAC (Control Office/DRM/Admin allowed, ENG/TRD/SNT blocked 403)."""
    payload = {
        "season": "Monsoon",
        "region": "Northern Railway",
        "train_type": "Express",
        "rainfall_mm": 25.0
    }

    # Engineering officer -> 403 Forbidden
    headers_eng = get_auth_headers("engineering_officer", "Eng@123")
    res_eng = client.post("/api/v1/ai/train-delay-prediction", json=payload, headers=headers_eng)
    assert res_eng.status_code == 403
    assert "restricted to Control Office" in res_eng.json()["detail"]

    # Traction officer -> 403 Forbidden
    headers_trd = get_auth_headers("traction_officer", "Trd@123")
    res_trd = client.post("/api/v1/ai/train-delay-prediction", json=payload, headers=headers_trd)
    assert res_trd.status_code == 403

    # Signal officer -> 403 Forbidden
    headers_snt = get_auth_headers("signal_officer", "Signal@123")
    res_snt = client.post("/api/v1/ai/train-delay-prediction", json=payload, headers=headers_snt)
    assert res_snt.status_code == 403

    # Control Office officer -> 200 OK
    headers_ctrl = get_auth_headers("control_office", "Opt@123")
    res_ctrl = client.post("/api/v1/ai/train-delay-prediction", json=payload, headers=headers_ctrl)
    assert res_ctrl.status_code == 200

    # DRM -> 200 OK
    headers_drm = get_auth_headers("drm", "Drm@123")
    res_drm = client.post("/api/v1/ai/train-delay-prediction", json=payload, headers=headers_drm)
    assert res_drm.status_code == 200

    # Admin -> 200 OK
    headers_admin = get_auth_headers("admin", "Admin@123")
    res_admin = client.post("/api/v1/ai/train-delay-prediction", json=payload, headers=headers_admin)
    assert res_admin.status_code == 200


def test_api_verifies_pkl_model_prediction(valid_delay_payload):
    """Test 10: Verifies that API response exactly matches direct prediction from the .pkl model."""
    res = client.post("/api/v1/ai/train-delay-prediction", json=valid_delay_payload)
    assert res.status_code == 200
    api_delay = res.json()["predicted_delay_minutes"]

    direct_res = train_delay_engine.predict_delay(valid_delay_payload)
    assert api_delay == direct_res["predicted_delay_minutes"]

