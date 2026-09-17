import pytest
import os
import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from ml.priority_engine import AIMaintenancePriorityEngine, maintenance_priority_engine
from data.seed_data import seed_database
from backend.app.core.database import SessionLocal
from backend.app.models.defect import MaintenanceTask, AIPriorityRecommendation

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_database()

def test_engine_critical_task_scoring():
    """Validates that a critical derailment hazard with overdue SLA yields Critical level (80-100) and explainable reasons."""
    task = {
        "task_code": "D-1001",
        "title": "Turnout Point Machine Detection Overhaul & USFD Flaw Rectification",
        "asset_type": "Point Machine",
        "asset_health": 35.0,
        "asset_status": "Critical",
        "criticality": "Critical",
        "urgency": "Immediate",
        "safety_impact": "Derailment Risk",
        "is_overdue": True,
        "due_date": (datetime.utcnow() - timedelta(days=2)).isoformat(),
        "traffic_density_gmt": 62.0,
        "line_capacity": 64,
        "estimated_duration_minutes": 180,
        "required_traffic_block": True,
        "required_power_block": True
    }

    res = AIMaintenancePriorityEngine.score_task(task)

    assert 80 <= res["priority_score"] <= 100
    assert res["priority_level"] == "Critical"
    assert res["score"] == res["priority_score"]
    assert res["level"] == "Critical"

    # Check the 4 prompt-required explainable reasons are present
    reasons = res["reasons"]
    assert "Safety-related defect" in reasons
    assert "High asset criticality" in reasons
    assert "Maintenance overdue" in reasons
    assert "High operational impact" in reasons

    # Check factor breakdown
    breakdown = res["factor_breakdown"]
    assert breakdown["asset_criticality"]["score"] >= 16.0
    assert breakdown["urgency"]["score"] == 20.0
    assert breakdown["safety_impact"]["score"] == 25.0
    assert breakdown["asset_availability_impact"]["score"] >= 8.0
    assert breakdown["overdue_status"]["score"] >= 6.0
    assert breakdown["operational_impact"]["score"] >= 12.0

def test_engine_low_task_scoring():
    """Validates that routine non-safety maintenance on healthy asset scores Low (< 40)."""
    task = {
        "task_code": "TSK-ROUTINE-001",
        "title": "Quarterly Vegetation Clearing & Track Cess Cleaning",
        "asset_type": "General Track Cess",
        "asset_health": 95.0,
        "asset_status": "Operational",
        "criticality": "Low",
        "urgency": "Routine",
        "safety_impact": "Low",
        "is_overdue": False,
        "due_date": (datetime.utcnow() + timedelta(days=14)).isoformat(),
        "traffic_density_gmt": 25.0,
        "line_capacity": 30,
        "estimated_duration_minutes": 60,
        "required_traffic_block": False,
        "required_power_block": False
    }

    res = AIMaintenancePriorityEngine.score_task(task)

    assert 0 <= res["priority_score"] < 40
    assert res["priority_level"] == "Low"
    assert res["score"] == res["priority_score"]
    assert res["level"] == "Low"
    assert len(res["reasons"]) >= 1

def test_engine_medium_and_high_classification():
    """Validates accurate boundary classification for Medium (40-59) and High (60-79) tiers."""
    # High task
    high_task = {
        "task_code": "TSK-HIGH-01",
        "title": "OHE Catenary Dropper Fatigue Adjustment",
        "asset_type": "OHE Mast & Catenary",
        "asset_health": 65.0,
        "criticality": "High",
        "urgency": "Within 24 Hours",
        "safety_impact": "OHE Tripping Risk",
        "traffic_density_gmt": 48.0,
        "estimated_duration_minutes": 150,
        "required_traffic_block": True,
        "required_power_block": True
    }
    high_res = AIMaintenancePriorityEngine.score_task(high_task)
    assert 60 <= high_res["priority_score"] < 80
    assert high_res["priority_level"] == "High"

    # Medium task
    med_task = {
        "task_code": "TSK-MED-01",
        "title": "Signal Battery Bank Preventive Maintenance",
        "asset_type": "Signal Post",
        "asset_health": 78.0,
        "criticality": "Medium",
        "urgency": "Within 3 Days",
        "safety_impact": "Low",
        "traffic_density_gmt": 35.0,
        "estimated_duration_minutes": 90,
        "required_traffic_block": False,
        "required_power_block": False
    }
    med_res = AIMaintenancePriorityEngine.score_task(med_task)
    assert 40 <= med_res["priority_score"] < 60
    assert med_res["priority_level"] == "Medium"

def test_engine_transparent_mathematical_breakdown():
    """Verifies that the sum of the 6 explainable factor scores strictly equals the total score."""
    sample_task = {
        "task_code": "TSK-TEST-SUM",
        "title": "Track Tamping",
        "asset_type": "Rail 60kg",
        "asset_health": 55.0,
        "criticality": "Medium",
        "urgency": "Within 24 Hours",
        "safety_impact": "Speed Restriction Imposed",
        "speed_restriction_imposed": 30,
        "traffic_density_gmt": 42.0,
        "estimated_duration_minutes": 180,
        "required_traffic_block": True
    }
    res = AIMaintenancePriorityEngine.score_task(sample_task)
    b = res["factor_breakdown"]

    summed_factors = (
        b["asset_criticality"]["score"] +
        b["urgency"]["score"] +
        b["safety_impact"]["score"] +
        b["asset_availability_impact"]["score"] +
        b["overdue_status"]["score"] +
        b["operational_impact"]["score"]
    )

    assert round(summed_factors, 1) == res["raw_score"]
    assert res["priority_score"] == int(round(res["raw_score"]))

def test_api_post_priority_ad_hoc_payload():
    """Tests POST /api/ai/priority with custom Task D-1001 ad-hoc payload."""
    payload = {
        "task_code": "D-1001",
        "title": "USFD Weld Defect Rectification",
        "criticality": "Critical",
        "urgency": "Immediate",
        "safety_impact": "Derailment Risk",
        "is_overdue": True,
        "traffic_density_gmt": 65.0,
        "asset_type": "Turnout Point Machine",
        "asset_health": 35.0,
        "estimated_duration_minutes": 180,
        "required_traffic_block": True,
        "required_power_block": True
    }

    # Direct /api/ai/priority endpoint
    res = client.post("/api/ai/priority", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["task"]["task_code"] == "D-1001"
    assert data["priority_score"] >= 80
    assert data["priority_level"] == "Critical"
    assert "Safety-related defect" in data["reasons"]
    assert "High asset criticality" in data["reasons"]
    assert "Maintenance overdue" in data["reasons"]
    assert "High operational impact" in data["reasons"]

    # Versioned /api/v1/ai/priority alias
    res_v1 = client.post("/api/v1/ai/priority", json=payload)
    assert res_v1.status_code == 200
    assert res_v1.json()["priority_score"] == data["priority_score"]

def test_api_post_priority_existing_db_task():
    """Tests POST /api/ai/priority using a task ID fetched from PostgreSQL."""
    db = SessionLocal()
    task = db.query(MaintenanceTask).first()
    db.close()
    assert task is not None

    res = client.post("/api/ai/priority", json={"task_id": task.id})
    assert res.status_code == 200
    data = res.json()
    assert data["task"]["id"] == task.id
    assert 0 <= data["priority_score"] <= 100
    assert data["priority_level"] in ["Critical", "High", "Medium", "Low"]
    assert len(data["reasons"]) >= 1
    assert "factor_breakdown" in data

def test_api_get_priorities_ranking_and_filtering():
    """Tests GET /api/ai/priorities rankings, limit, and level/department filtering."""
    # 1. Fetch default ranked list
    res = client.get("/api/ai/priorities?limit=25")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert data["summary"]["total_ranked"] > 0
    assert len(data["priorities"]) <= 25

    # Verify descending sort order
    scores = [p["priority_score"] for p in data["priorities"]]
    assert scores == sorted(scores, reverse=True)

    # 2. Filter by level=Critical
    res_crit = client.get("/api/ai/priorities?level=Critical&limit=10")
    assert res_crit.status_code == 200
    data_crit = res_crit.json()
    for item in data_crit["priorities"]:
        assert item["priority_level"] == "Critical"
        assert item["priority_score"] >= 80

    # 3. Filter by department=ENG
    res_dept = client.get("/api/v1/ai/priorities?department=ENG&limit=10")
    assert res_dept.status_code == 200
    data_dept = res_dept.json()
    for item in data_dept["priorities"]:
        assert item["task"]["department"] == "ENG"

def test_multiple_scenarios_all_six_inputs():
    """
    Validates transparent 0-100 scoring across all 4 tiers using the 6 direct inputs:
    - Criticality
    - Urgency
    - Safety Impact
    - Asset Availability Impact
    - Overdue status
    - Operational impact
    """
    # Scenario 1: Critical (80-100)
    scen_critical = {
        "task_code": "SCEN-CRIT-001",
        "title": "Turnout Tongue Rail Fracture Rectification",
        "criticality": "Critical",
        "urgency": "Immediate",
        "safety_impact": "Derailment Risk",
        "asset_availability_impact": "Critical",
        "overdue_status": "Overdue",
        "operational_impact": "Critical"
    }
    res_crit = client.post("/api/ai/priority", json=scen_critical)
    assert res_crit.status_code == 200
    data_crit = res_crit.json()
    assert 80 <= data_crit["priority_score"] <= 100
    assert data_crit["priority_level"] == "Critical"
    assert "Safety-related defect" in data_crit["reasons"]
    assert "High asset criticality" in data_crit["reasons"]
    assert "Maintenance overdue" in data_crit["reasons"]
    assert "High operational impact" in data_crit["reasons"]

    # Scenario 2: High (60-79)
    scen_high = {
        "task_code": "SCEN-HIGH-002",
        "title": "OHE Neutral Section Contact Wire Sag Adjustment",
        "criticality": "High",
        "urgency": "Within 24 Hours",
        "safety_impact": "OHE Tripping Risk",
        "asset_availability_impact": "Medium",
        "overdue_status": "Within SLA",
        "operational_impact": "High"
    }
    res_high = client.post("/api/ai/priority", json=scen_high)
    assert res_high.status_code == 200
    data_high = res_high.json()
    assert 60 <= data_high["priority_score"] <= 79
    assert data_high["priority_level"] == "High"

    # Scenario 3: Medium (40-59)
    scen_med = {
        "task_code": "SCEN-MED-003",
        "title": "Level Crossing Gate Barrier Motor Servicing",
        "criticality": "Medium",
        "urgency": "Within 3 Days",
        "safety_impact": "Speed Restriction",
        "asset_availability_impact": "Medium",
        "overdue_status": "Within SLA",
        "operational_impact": "Medium"
    }
    res_med = client.post("/api/ai/priority", json=scen_med)
    assert res_med.status_code == 200
    data_med = res_med.json()
    assert 40 <= data_med["priority_score"] <= 59
    assert data_med["priority_level"] == "Medium"

    # Scenario 4: Low (0-39)
    scen_low = {
        "task_code": "SCEN-LOW-004",
        "title": "Station Boundary Fence Maintenance",
        "criticality": "Low",
        "urgency": "Routine",
        "safety_impact": "Low",
        "asset_availability_impact": "Low",
        "overdue_status": "Within SLA",
        "operational_impact": "Low"
    }
    res_low = client.post("/api/ai/priority", json=scen_low)
    assert res_low.status_code == 200
    data_low = res_low.json()
    assert 0 <= data_low["priority_score"] <= 39
    assert data_low["priority_level"] == "Low"

def test_db_storage_of_ai_recommendations():
    """
    Verifies that POST /api/ai/priority successfully persists the AI recommendation in PostgreSQL,
    and all fields (scores, reasons, breakdown, 6 inputs) are saved in the database.
    """
    payload = {
        "task_code": "D-1001-PERSIST",
        "title": "Point Machine USFD Urgent Overhaul",
        "criticality": "Critical",
        "urgency": "Immediate",
        "safety_impact": "Derailment Risk",
        "asset_availability_impact": "High",
        "overdue_status": "Overdue",
        "operational_impact": "High",
        "department_code": "ENG"
    }

    res = client.post("/api/ai/priority", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "recommendation_id" in data
    rec_id = data["recommendation_id"]
    assert rec_id is not None

    # Query PostgreSQL to verify row persistence
    db = SessionLocal()
    rec_row = db.query(AIPriorityRecommendation).filter(AIPriorityRecommendation.id == rec_id).first()
    db.close()

    assert rec_row is not None
    assert rec_row.task_code == "D-1001-PERSIST"
    assert rec_row.priority_score == data["priority_score"]
    assert rec_row.priority_level == data["priority_level"]
    assert rec_row.criticality == "Critical"
    assert rec_row.urgency == "Immediate"
    assert rec_row.safety_impact == "Derailment Risk"
    assert rec_row.overdue_status == "Overdue"
    assert isinstance(rec_row.reasons, list)
    assert len(rec_row.reasons) >= 1
    assert isinstance(rec_row.factor_breakdown, dict)
    assert "safety_impact" in rec_row.factor_breakdown

def test_get_ai_recommendations_endpoint():
    """
    Verifies GET /api/ai/recommendations retrieves stored recommendations from PostgreSQL
    with support for filtering by priority level and task code.
    """
    # 1. Fetch recommendations list
    res = client.get("/api/ai/recommendations?limit=50")
    assert res.status_code == 200
    data = res.json()
    assert "total_recommendations" in data
    assert data["total_recommendations"] > 0
    assert len(data["recommendations"]) > 0

    first_item = data["recommendations"][0]
    assert "id" in first_item
    assert "task_code" in first_item
    assert "priority_score" in first_item
    assert "priority_level" in first_item
    assert "reasons" in first_item

    # 2. Filter by level=Critical
    res_crit = client.get("/api/ai/recommendations?level=Critical&limit=10")
    assert res_crit.status_code == 200
    data_crit = res_crit.json()
    for item in data_crit["recommendations"]:
        assert item["priority_level"] == "Critical"
        assert item["priority_score"] >= 80

    # 3. Filter by task_code
    res_code = client.get("/api/ai/recommendations?task_code=D-1001")
    assert res_code.status_code == 200
    data_code = res_code.json()
    assert data_code["total_recommendations"] >= 1
    for item in data_code["recommendations"]:
        assert "D-1001" in item["task_code"]


