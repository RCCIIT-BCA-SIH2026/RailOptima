import pytest
import os
import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.optimization.block_optimizer import AutomaticBlockPlanningEngine
from data.seed_data import seed_database

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_database()

def test_critical_track_defect_scheduled_in_low_traffic_window():
    """
    Validates that a critical track defect with derailment risk is scheduled
    during an optimal low-traffic window, ensuring zero passenger disruption
    to premier trains (Vande Bharat / Shatabdi) and clearing speed restrictions.
    """
    base_time = datetime(2026, 9, 17, 0, 0, 0)

    # 1. Critical Track Defect
    critical_defect_task = {
        "task_code": "D-1001",
        "title": "USFD Rail Fracture Repair & Thermit Weld Renewal",
        "priority_score": 96,
        "criticality": "Critical",
        "safety_impact": "Derailment Risk",
        "urgency": "Immediate",
        "duration_minutes": 180,
        "department": "ENG",
        "required_resources": "09-3X Tamping Machine, 15 Trackmen",
        "speed_restriction_imposed": 30
    }

    # 2. Train schedule with high-density daytime passenger express trains
    trains = [
        {
            "train_no": "20172",
            "train_name": "Vande Bharat Express (NZM-RKMP)",
            "train_type": "Vande_Bharat",
            "is_freight": False,
            "scheduled_departure": (base_time + timedelta(hours=6, minutes=0)).isoformat(),
            "scheduled_arrival": (base_time + timedelta(hours=6, minutes=45)).isoformat()
        },
        {
            "train_no": "12002",
            "train_name": "Bhopal Shatabdi Express (NDLS-RKMP)",
            "train_type": "Shatabdi",
            "is_freight": False,
            "scheduled_departure": (base_time + timedelta(hours=8, minutes=30)).isoformat(),
            "scheduled_arrival": (base_time + timedelta(hours=9, minutes=15)).isoformat()
        },
        {
            "train_no": "12302",
            "train_name": "Howrah Rajdhani Express (NDLS-HWH)",
            "train_type": "Rajdhani",
            "is_freight": False,
            "scheduled_departure": (base_time + timedelta(hours=10, minutes=0)).isoformat(),
            "scheduled_arrival": (base_time + timedelta(hours=10, minutes=45)).isoformat()
        },
        {
            "train_no": "G-8821",
            "train_name": "BOXN Heavy Haul Coal Freight",
            "train_type": "Freight_Coal",
            "is_freight": True,
            "scheduled_departure": (base_time + timedelta(hours=2, minutes=30)).isoformat(),
            "scheduled_arrival": (base_time + timedelta(hours=3, minutes=15)).isoformat()
        }
    ]

    # 3. Candidate Windows: Daytime window (with passenger conflicts) vs Night low-traffic window
    available_windows = [
        {
            "window_code": "WIN-DAY-01",
            "name": "Mid-Morning Trunk Window",
            "start_time": (base_time + timedelta(hours=9, minutes=0)).isoformat(),
            "end_time": (base_time + timedelta(hours=12, minutes=0)).isoformat(),
            "is_low_traffic": False
        },
        {
            "window_code": "WIN-NIGHT-01",
            "name": "Night Low-Traffic Possessions Window",
            "start_time": (base_time + timedelta(hours=1, minutes=30)).isoformat(),
            "end_time": (base_time + timedelta(hours=4, minutes=30)).isoformat(),
            "is_low_traffic": True
        }
    ]

    res = AutomaticBlockPlanningEngine.optimize_blocks(
        section="NDLS-TKD-UP",
        date_range={"start_date": base_time.isoformat()},
        maintenance_tasks=[critical_defect_task],
        train_schedule=trains,
        available_blocks=available_windows
    )

    # Assertions
    rec = res["recommended_block"]
    assert rec["window_code"] == "WIN-NIGHT-01"
    assert rec["is_low_traffic_window"] is True
    assert rec["duration_minutes"] == 180
    assert rec["utilization_pct"] == 100.0

    # Assert ZERO passenger disruption
    impact = res["estimated_train_impact"]
    assert impact["passenger_delay_minutes"] == 0

    # Assert asset availability improvement
    avail = res["asset_availability_improvement"]
    assert avail["speed_restrictions_cleared"] >= 1
    assert avail["availability_gain_pct"] > 0
    assert avail["line_speed_restored_kmh"] == 130

    # Assert explainable reasoning contains key decision factors
    reasoning = res["reasoning"]
    assert "D-1001" in reasoning
    assert "Priority 96" in reasoning
    assert "low-traffic" in reasoning
    assert "Zero passenger disruption" in reasoning
    assert "130 km/h" in reasoning

def test_deterministic_optimization_guarantee():
    """
    Validates that the optimization engine produces strictly deterministic
    results for the exact same input data across multiple runs.
    """
    base_time = datetime(2026, 9, 18, 0, 0, 0)
    sample_tasks = [
        {"task_code": "TSK-01", "duration_minutes": 120, "priority_score": 85, "department": "ENG"},
        {"task_code": "TSK-02", "duration_minutes": 150, "priority_score": 78, "department": "TRD"}
    ]
    sample_windows = [
        {"window_code": "W1", "start_time": (base_time + timedelta(hours=2)).isoformat(), "end_time": (base_time + timedelta(hours=5)).isoformat(), "is_low_traffic": True},
        {"window_code": "W2", "start_time": (base_time + timedelta(hours=14)).isoformat(), "end_time": (base_time + timedelta(hours=17)).isoformat(), "is_low_traffic": False}
    ]

    run1 = AutomaticBlockPlanningEngine.optimize_blocks(
        section="GWL-VGLJ-UP",
        date_range={"start_date": base_time.isoformat()},
        maintenance_tasks=sample_tasks,
        available_blocks=sample_windows
    )

    run2 = AutomaticBlockPlanningEngine.optimize_blocks(
        section="GWL-VGLJ-UP",
        date_range={"start_date": base_time.isoformat()},
        maintenance_tasks=sample_tasks,
        available_blocks=sample_windows
    )

    # Exact deterministic equivalence
    assert run1["recommended_block"]["window_code"] == run2["recommended_block"]["window_code"]
    assert run1["recommended_block"]["start_time"] == run2["recommended_block"]["start_time"]
    assert run1["recommended_block"]["end_time"] == run2["recommended_block"]["end_time"]
    assert run1["recommended_block"]["utilization_pct"] == run2["recommended_block"]["utilization_pct"]
    assert run1["estimated_train_impact"] == run2["estimated_train_impact"]
    assert run1["reasoning"] == run2["reasoning"]

def test_multi_department_shadow_block_coordination():
    """Validates that co-locating Civil (ENG) and Signal (S&T) tasks produces an Integrated Shadow Block."""
    base_time = datetime(2026, 9, 19, 0, 0, 0)
    tasks = [
        {
            "task_code": "TSK-CIVIL-01",
            "title": "Track Tamping",
            "department": "ENG",
            "duration_minutes": 120,
            "priority_score": 88
        },
        {
            "task_code": "TSK-SIGNAL-01",
            "title": "Point Machine Overhaul",
            "department": "SNT",
            "duration_minutes": 90,
            "priority_score": 82
        }
    ]

    res = AutomaticBlockPlanningEngine.optimize_blocks(
        section="BINA-BPL-UP",
        date_range={"start_date": base_time.isoformat()},
        maintenance_tasks=tasks
    )

    rec = res["recommended_block"]
    assert rec["block_type"] == "Integrated"
    assert "ENG" in rec["departments"]
    assert "SNT" in rec["departments"]
    assert len(res["scheduled_tasks"]) == 2

def test_api_post_optimize_blocks_endpoint():
    """Validates POST /api/ai/optimize-blocks and /api/v1/ai/optimize-blocks endpoints."""
    payload = {
        "section": "NDLS-TKD-UP",
        "date_range": {
            "start_date": "2026-09-17T00:00:00",
            "end_date": "2026-09-18T00:00:00"
        },
        "maintenance_tasks": [
            {
                "task_code": "D-1001",
                "title": "USFD Rail Fracture Repair",
                "priority_score": 96,
                "criticality": "Critical",
                "safety_impact": "Derailment Risk",
                "urgency": "Immediate",
                "duration_minutes": 180,
                "department": "ENG",
                "required_resources": "09-3X Tamping Machine",
                "speed_restriction_imposed": 30
            }
        ]
    }

    # Test direct endpoint
    res = client.post("/api/ai/optimize-blocks", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "recommended_block" in data
    assert "alternative_blocks" in data
    assert "scheduled_tasks" in data
    assert "affected_trains" in data
    assert "estimated_train_impact" in data
    assert "asset_availability_improvement" in data
    assert "reasoning" in data

    rec = data["recommended_block"]
    assert rec["is_low_traffic_window"] is True
    assert data["estimated_train_impact"]["passenger_delay_minutes"] == 0

    # Test versioned endpoint alias
    res_v1 = client.post("/api/v1/ai/optimize-blocks", json=payload)
    assert res_v1.status_code == 200
    assert res_v1.json()["recommended_block"]["window_code"] == rec["window_code"]

