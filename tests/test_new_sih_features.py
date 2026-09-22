import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from backend.app.main import app
from ml.service import app as ml_app
from ml.asset_prognostics_dnn import AssetPrognosticsEngine
from backend.app.services.duplicate_detection import assess_duplicate
from backend.optimization.block_optimizer import ORToolsBlockOptimizer, AutomaticBlockPlanningEngine

client = TestClient(app)
ml_client = TestClient(ml_app)


# ===========================================================================
# 1. Asset Prognostics DNN & ML Tests
# ===========================================================================

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


def test_asset_prognostics_api_batch():
    """Verify POST /api/v1/asset-prognostics/batch scores multiple assets."""
    payload = {
        "records": [
            {"asset_id": 1, "gmt_tonnage": 50.0, "asset_age_years": 5.0},
            {"asset_id": 2, "gmt_tonnage": 70.0, "asset_age_years": 15.0},
        ]
    }
    response = client.post("/api/v1/asset-prognostics/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 2
    assert len(data["results"]) == 2


def test_ml_service_prognostics_endpoints():
    """Verify ML microservice /ml/prognostics and /ml/prognostics/batch."""
    res1 = ml_client.post("/ml/prognostics", json={"gmt_tonnage": 55.0, "asset_age_years": 8.0})
    assert res1.status_code == 200
    data1 = res1.json()
    assert "prognostics" in data1
    assert "failure_probability_7d" in data1["prognostics"]

    res2 = ml_client.post("/ml/prognostics/batch", json={
        "assets": [{"gmt_tonnage": 40.0, "asset_age_years": 4.0}]
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["total_evaluated"] == 1


# ===========================================================================
# 2. SLA Policy & Escalation Tests
# ===========================================================================

def test_sla_policy_endpoints():
    """Verify GET /api/v1/ai/sla/policy, POST /api/v1/ai/sla/evaluate, and GET /api/v1/ai/sla/breaches."""
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

    breaches_res = client.get("/api/v1/ai/sla/breaches")
    assert breaches_res.status_code == 200
    breaches_data = breaches_res.json()
    assert "total_breaches" in breaches_data
    assert "items" in breaches_data


# ===========================================================================
# 3. Defect Duplicate Detection Tests
# ===========================================================================

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


def test_defect_creation_includes_duplicate_advisory():
    """Verify POST /api/v1/defects includes duplicate_advisory in response."""
    payload = {
        "department_code": "ENG",
        "severity": "Major",
        "defect_type": "Fishplate Crack",
        "location": "KM 555/12 Down Line",
        "description": "Test crack reported for duplicate check verification"
    }
    res = client.post("/api/v1/defects", json=payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert "duplicate_advisory" in data
    assert "has_likely_duplicates" in data["duplicate_advisory"]


# ===========================================================================
# 4. CP-SAT Optimizer Determinism & Hardening Tests
# ===========================================================================

def test_cpsat_optimizer_determinism():
    """Verify ORToolsBlockOptimizer produces deterministic, reproducible output on repeat runs."""
    tasks = [
        {"id": 1, "task_code": "T1", "name": "Track Tamping", "duration_minutes": 120, "priority_score": 85, "preferred_window": "01:00-05:00", "required_resources": "BCM", "section_id": 1, "section_code": "SEC-01", "department_code": "ENG"},
        {"id": 2, "task_code": "T2", "name": "OHE Inspection", "duration_minutes": 90, "priority_score": 70, "preferred_window": "02:00-04:00", "required_resources": "TowerWagon", "section_id": 1, "section_code": "SEC-01", "department_code": "TRD"},
    ]
    trains = [
        {"train_number": "12001", "name": "Shatabdi Exp", "priority": 1, "arrival_time": "06:30", "departure_time": "06:35", "delay_cost_per_min": 100}
    ]
    resources = [
        {"id": 1, "code": "BCM", "type": "Machine", "available_hours": 8},
        {"id": 2, "code": "TowerWagon", "type": "Vehicle", "available_hours": 8}
    ]

    opt1 = ORToolsBlockOptimizer(time_limit_seconds=5)
    res1 = opt1.optimize(tasks, trains, resources, horizon_hours=24)

    opt2 = ORToolsBlockOptimizer(time_limit_seconds=5)
    res2 = opt2.optimize(tasks, trains, resources, horizon_hours=24)

    assert res1["solver_status"] in ("OPTIMAL", "FEASIBLE")
    assert res2["solver_status"] in ("OPTIMAL", "FEASIBLE")
    # Determinism check: both runs must produce identical block count and schedules
    assert len(res1.get("blocks", [])) == len(res2.get("blocks", []))
    assert res1.get("blocks") == res2.get("blocks")

