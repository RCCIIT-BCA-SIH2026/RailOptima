import sys
import os
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from backend.app.main import app as backend_app
from backend.app.core.ml_client import ml_client
from backend.app.core.database import SessionLocal
from backend.app.models import (
    Defect, Department, RailwaySection, Asset, Train,
    Block, BlockPlan, Conflict
)
from ml.service import app as ml_app
from data.seed_data import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_database()

def test_ml_microservice_health():
    tc = TestClient(ml_app)
    resp = tc.get("/ml/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "Healthy"
    assert "models" in data

def test_ml_priority_defect_score():
    tc = TestClient(ml_app)
    resp = tc.post("/ml/priority/defect-score", json={
        "severity": "Critical",
        "speed_restriction_imposed": 30,
        "max_permissible_speed": 130,
        "traffic_density_gmt": 52.0,
        "asset_health": 45.0,
        "hours_open": 12.0,
        "department_code": "ENG"
    })
    assert resp.status_code == 200
    res = resp.json()
    assert "priority_score" in res
    assert res["priority_score"] >= 80.0

def test_ml_predictive_maintenance():
    tc = TestClient(ml_app)
    resp = tc.post("/ml/predictive-maintenance/predict", json={
        "rail_wear_mm": 3.2,
        "train_age_years": 8.5,
        "brake_pad_wear_percent": 65.0,
        "brake_pressure_psi": 72.0,
        "battery_voltage": 23.5,
        "average_speed_kmph": 75.0,
        "distance_travelled_km": 60000.0,
        "track_vibration_level": 5.8
    })
    assert resp.status_code == 200
    pdm = resp.json()
    assert "maintenance_probability" in pdm
    assert "risk_level" in pdm

def test_ml_train_delay_prediction():
    tc = TestClient(ml_app)
    resp = tc.post("/ml/train-delay/predict-eta", json={
        "rainfall_mm": 25.0,
        "humidity_percent": 85.0,
        "ambient_temperature_c": 32.0,
        "average_speed_kmph": 65.0,
        "distance_travelled_km": 150.0,
        "train_age_years": 6.0,
        "last_maintenance_days": 40.0,
        "season": "Monsoon",
        "region": "Central",
        "train_type": "Express",
        "scheduled_arrival": "14:30"
    })
    assert resp.status_code == 200
    delay_res = resp.json()
    assert "predicted_delay_minutes" in delay_res
    assert "delay_severity_tier" in delay_res

def test_ml_survival_curve():
    tc = TestClient(ml_app)
    resp = tc.post("/ml/survival/predict-curve", json={
        "age_years": 12.0,
        "gmt_density": 48.0,
        "monsoon_exposure": "high",
        "curvature_class": "sharp",
        "asset_type": "Track",
        "defects_count": 2
    })
    assert resp.status_code == 200
    surv_res = resp.json()
    assert "failure_probability_30d" in surv_res
    assert "estimated_rul_days" in surv_res

def test_ml_duration_overrun():
    tc = TestClient(ml_app)
    resp = tc.post("/ml/duration-overrun/predict", json={
        "task_type": "OHE Catenary Replacement",
        "department": "TRD",
        "crew_size": 12,
        "machinery_count": 2,
        "weather_condition": "Rainy",
        "claimed_duration_minutes": 120
    })
    assert resp.status_code == 200
    dur_res = resp.json()
    assert "predicted_duration_minutes" in dur_res
    assert "overrun_probability" in dur_res

def test_ml_explainer():
    tc = TestClient(ml_app)
    resp = tc.post("/ml/explainer/block", json={
        "block_info": {
            "block_code": "BLK-ENG-2026-001",
            "section_code": "NGP-WR-01",
            "start_time": "01:30",
            "end_time": "04:30",
            "duration_hours": 3.0,
            "departments": ["ENG", "TRD"],
            "tasks": ["Track Tamping", "OHE Inspection"],
            "passenger_delay_minutes": 0,
            "freight_delay_minutes": 15,
            "defects_cleared": 3
        }
    })
    assert resp.status_code == 200
    exp_res = resp.json()
    assert "summary" in exp_res
    assert "synergy_justification" in exp_res

def test_backend_optimization_run_no_auth():
    backend_tc = TestClient(backend_app)
    resp = backend_tc.post("/api/v1/optimization/run", json={
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "section_id": None,
        "department_id": None,
        "planning_horizon_hours": 24,
        "optimization_policy": "balanced"
    })
    assert resp.status_code == 200
    opt_data = resp.json()
    assert "alternatives" in opt_data
    assert len(opt_data["alternatives"]) >= 1

def test_backend_defects_and_ai_recommendations():
    backend_tc = TestClient(backend_app)
    resp = backend_tc.get("/api/v1/defects")
    assert resp.status_code == 200
    
    resp_rec = backend_tc.get("/api/v1/ai/recommendations")
    assert resp_rec.status_code == 200
    
    resp_ag = backend_tc.get("/api/v1/ai/anti-gaming/audit")
    assert resp_ag.status_code == 200

def test_backend_approval_action_no_auth():
    backend_tc = TestClient(backend_app)
    
    # 1. Fetch pending approvals
    resp_pending = backend_tc.get("/api/v1/approvals/pending")
    assert resp_pending.status_code == 200
    pending_data = resp_pending.json()
    assert "blocks" in pending_data
    blocks = pending_data["blocks"]
    assert len(blocks) > 0

    first_block = blocks[0]
    block_id = first_block["block_id"]

    # 2. Test Approve action without bearer token
    resp_approve = backend_tc.post(f"/api/v1/approvals/{block_id}/action", json={
        "action": "Approved",
        "comments": "Approved digitally by DRM"
    })
    assert resp_approve.status_code == 200
    appr_data = resp_approve.json()
    assert appr_data["status"] == "success"
    assert appr_data["new_status"] == "Approved"

    # 3. Test Reject action on another block without bearer token
    if len(blocks) > 1:
        second_block = blocks[1]
        second_id = second_block["block_id"]
        resp_reject = backend_tc.post(f"/api/v1/approvals/{second_id}/action", json={
            "action": "Rejected",
            "comments": "Rejected due to high passenger congestion"
        })
        assert resp_reject.status_code == 200
        rej_data = resp_reject.json()
        assert rej_data["status"] == "success"
        assert rej_data["new_status"] == "Rejected"

