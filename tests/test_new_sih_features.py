import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from backend.app.main import app
from ml.asset_prognostics_dnn import AssetPrognosticsEngine
from backend.app.services.duplicate_detection import assess_duplicate

client = TestClient(app)


def test_asset_prognostics_engine_fallback_prediction():
    """Verify AssetPrognosticsEngine runs prediction cleanly with scikit-learn / formula fallback."""
    engine = AssetPrognosticsEngine()
    features = {
        "gmt_tonnage": 48.0,
        "asset_age_years": 7.5,
        "operating_temp_c": 35.0,
        "curvature_deg": 1.2,
        "days_since_maintenance": 45,
        "prior_flaw_count": 2,
        "has_speed_restriction": False,
        "traffic_density_trains_per_day": 120,
        "coastal_salinity_factor": 0.2,
    }
    result = engine.predict(features)
    assert "failure_probability_7d" in result
    assert "expected_delay_cascade_mins" in result
    assert "remaining_useful_life_gmt" in result
    assert "risk_tier" in result
    assert result["backend_used"] in ("pytorch_dnn", "sklearn", "formula")
    assert 0.0 <= result["failure_probability_7d"] <= 1.0


def test_asset_prognostics_api_health():
    """Verify GET /api/v1/asset-prognostics/health endpoint returns status."""
    response = client.get("/api/v1/asset-prognostics/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "backend" in data
    assert "torch_available" in data
    assert "sklearn_available" in data


def test_asset_prognostics_api_predict():
    """Verify POST /api/v1/asset-prognostics endpoint returns prognostic calculation."""
    payload = {
        "gmt_tonnage": 52.0,
        "asset_age_years": 9.0,
        "operating_temp_c": 38.0,
        "curvature_deg": 1.5,
        "days_since_maintenance": 60,
        "prior_flaw_count": 3,
        "has_speed_restriction": True,
        "traffic_density_trains_per_day": 150,
        "coastal_salinity_factor": 0.3,
    }
    response = client.post("/api/v1/asset-prognostics", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "prognostics" in data
    assert "failure_probability_7d" in data["prognostics"]
    assert "expected_delay_cascade_mins" in data["prognostics"]
    assert "risk_tier" in data["prognostics"]


def test_sla_policy_endpoints():
    """Verify GET /api/v1/ai/sla/policy and POST /api/v1/ai/sla/evaluate."""
    policy_res = client.get("/api/v1/ai/sla/policy")
    assert policy_res.status_code == 200
    policy_data = policy_res.json()
    assert "policies" in policy_data
    assert "Critical" in policy_data["policies"]

    eval_payload = {
        "severity": "Critical",
        "reported_at": "2026-09-20T10:00:00",
        "sla_type": "completion"
    }
    eval_res = client.post("/api/v1/ai/sla/evaluate", json=eval_payload)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert "sla_evaluation" in eval_data
    assert "sla_status" in eval_data["sla_evaluation"]
    assert "escalation_level" in eval_data["sla_evaluation"]


def test_duplicate_detection_service():
    """Verify duplicate detection service advisory logic."""
    existing = [
        {
            "id": 101,
            "defect_code": "DEF-001",
            "department_id": 1,
            "section_id": 5,
            "severity": "Critical",
            "defect_type": "Rail Fracture",
            "location": "KM 124/10 Up Track",
            "reported_at": datetime(2026, 9, 22, 8, 0, 0),
            "status": "Open"
        }
    ]
    new_defect = {
        "department_id": 1,
        "section_id": 5,
        "severity": "Critical",
        "defect_type": "Rail Fracture",
        "location": "KM 124/10 Up Track",
    }
    assessment = assess_duplicate(new_defect, existing, reported_at=datetime(2026, 9, 22, 9, 0, 0))
    res_dict = assessment.to_dict()
    assert res_dict["has_likely_duplicates"] is True
    assert res_dict["candidate_count"] == 1
    assert "ADVISORY" in res_dict["advisory"]
