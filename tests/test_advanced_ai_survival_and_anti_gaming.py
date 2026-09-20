import pytest
import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.services.survival_service import get_all_sections_risk_overview, get_section_survival_analysis
from backend.app.services.anti_gaming_service import audit_department_task_pool, evaluate_task_inflation
from ml.survival_engine import compute_survival_curve, predict_failure_risk_30d
from ml.duration_overrun_engine import predict_duration_and_overrun
from data.seed_data import seed_database

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_database()

def test_discrete_survival_engine():
    res = predict_failure_risk_30d(
        age_years=22.0,
        gmt_density=55.0,
        monsoon_exposure="high",
        defects_count=3
    )
    assert "failure_probability_30d" in res
    assert 0.0 <= res["failure_probability_30d"] <= 1.0
    assert "estimated_rul_days" in res
    assert len(res["survival_curve_30d"]) == 30
    assert res["survival_curve_30d"][0]["survival_probability"] >= res["survival_curve_30d"][-1]["survival_probability"]

def test_duration_and_overrun_engine():
    res = predict_duration_and_overrun(
        task_type="Track Tamping",
        department="ENG",
        claimed_duration_minutes=180,
        machinery_count=1,
        crew_size=12,
        weather_condition="Clear"
    )
    assert "predicted_duration_minutes" in res
    assert "overrun_probability" in res
    assert "overrun_risk_tier" in res
    assert res["predicted_duration_minutes"] > 0

def test_anti_gaming_evaluation():
    # Test inflated claim (Emergency claim on low risk section with no speed restriction)
    inflated = evaluate_task_inflation(
        task_code="TEST-INFLATED",
        department_code="SNT",
        claimed_criticality="Emergency",
        section_name="NDLS-TKD-UP",
        risk_30d_pct=15.0,
        has_speed_restriction=False,
        is_overdue=False
    )
    assert inflated["is_inflated"] is True
    assert inflated["evidence_score"] <= 2.5
    assert "Adjusted to fair priority" in inflated["audit_rationale"]

    # Test genuine claim (Critical claim on high risk section with speed restriction)
    genuine = evaluate_task_inflation(
        task_code="TEST-GENUINE",
        department_code="ENG",
        claimed_criticality="Critical",
        section_name="PWL-MTJ-UP",
        risk_30d_pct=85.0,
        has_speed_restriction=True,
        is_overdue=True
    )
    assert genuine["is_inflated"] is False
    assert genuine["evidence_score"] >= 4.0

def test_survival_service_db():
    db = SessionLocal()
    try:
        overview = get_all_sections_risk_overview(db)
        assert len(overview) > 0
        assert "failure_probability_30d" in overview[0]
        assert "risk_tier" in overview[0]
        assert "estimated_rul_days" in overview[0]
    finally:
        db.close()

def test_anti_gaming_service_db():
    db = SessionLocal()
    try:
        audit = audit_department_task_pool(db)
        assert "total_tasks_audited" in audit
        assert "compliance_rate_pct" in audit
        assert "department_inflation_breakdown" in audit
        assert len(audit["audited_tasks"]) > 0
    finally:
        db.close()

def test_survival_api_endpoints():
    # Section overview
    res = client.get("/api/v1/ai/survival/sections")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0

    # Custom prediction
    predict_res = client.post("/api/v1/ai/survival/predict", json={
        "age_years": 20.0,
        "gmt_density": 50.0,
        "monsoon_exposure": "medium",
        "curvature_class": "gentle",
        "asset_type": "Track",
        "defects_count": 2
    })
    assert predict_res.status_code == 200
    p_data = predict_res.json()
    assert "failure_probability_30d" in p_data
    assert "estimated_rul_days" in p_data

def test_anti_gaming_api_endpoints():
    # Audit summary
    audit_res = client.get("/api/v1/ai/anti-gaming/audit")
    assert audit_res.status_code == 200
    a_data = audit_res.json()
    assert "total_tasks_audited" in a_data
    assert "compliance_rate_pct" in a_data

    # Single claim evaluation
    eval_res = client.post("/api/v1/ai/anti-gaming/evaluate", json={
        "task_code": "API-TEST-001",
        "department_code": "TRD",
        "claimed_criticality": "Emergency",
        "section_name": "NDLS-TKD-UP",
        "risk_30d_pct": 20.0,
        "has_speed_restriction": False,
        "is_overdue": False
    })
    assert eval_res.status_code == 200
    e_data = eval_res.json()
    assert "is_inflated" in e_data
    assert "verified_priority_score" in e_data
