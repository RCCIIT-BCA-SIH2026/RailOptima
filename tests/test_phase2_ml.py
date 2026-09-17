import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.priority_engine import AIPriorityEngine
from ml.predictive_maintenance import predictive_engine
from ml.delay_predictor import delay_predictor
from ml.explainer import explainer
from backend.integrations import MockTMSClient, MockSMMSClient, MockTDMSClient, MockCOAClient

def test_ai_priority_engine_critical_defect():
    critical_defect = {
        "severity": "Critical",
        "speed_restriction_imposed": 30,
        "max_permissible_speed": 130,
        "traffic_density_gmt": 65.0,
        "asset_health": 42.0,
        "hours_open": 24.0,
        "department_code": "ENG"
    }
    result = AIPriorityEngine.calculate_priority(critical_defect)
    assert 80.0 <= result["priority_score"] <= 100.0
    assert result["priority_tier"] in ["P0 - Emergency", "P1 - Urgent"]
    assert "breakdown" in result
    assert result["breakdown"]["base_severity_pts"] == 40.0
    assert result["breakdown"]["speed_penalty_pts"] > 15.0

def test_ai_priority_engine_minor_defect():
    minor_defect = {
        "severity": "Minor",
        "speed_restriction_imposed": 0,
        "max_permissible_speed": 130,
        "traffic_density_gmt": 30.0,
        "asset_health": 90.0,
        "hours_open": 4.0,
        "department_code": "SNT"
    }
    result = AIPriorityEngine.calculate_priority(minor_defect)
    assert result["priority_score"] < 65.0
    assert result["priority_tier"] == "P2 - Routine"

def test_backlog_prioritization():
    defects = [
        {"id": 1, "severity": "Minor", "speed_restriction_imposed": 0, "department_code": "SNT"},
        {"id": 2, "severity": "Critical", "speed_restriction_imposed": 30, "department_code": "ENG"},
        {"id": 3, "severity": "Major", "speed_restriction_imposed": 45, "department_code": "TRD"}
    ]
    ranked = AIPriorityEngine.prioritize_backlog(defects)
    assert ranked[0]["id"] == 2
    assert ranked[-1]["id"] == 1
    assert ranked[0]["priority_score"] > ranked[1]["priority_score"]

def test_predictive_maintenance_ml():
    high_risk_asset = {
        "health_score": 40.0,
        "wear_mm": 5.5,
        "age_years": 16.0,
        "traffic_density_gmt": 65.0,
        "past_defects_count": 6,
        "inspection_deviation": 3.2
    }
    prediction = predictive_engine.predict_asset_risk(high_risk_asset)
    assert 0.0 <= prediction["failure_probability_pct"] <= 100.0
    assert "risk_category" in prediction
    assert "key_risk_drivers" in prediction
    assert len(prediction["key_risk_drivers"]) == 6

def test_train_delay_predictor():
    night_block = {
        "duration_minutes": 180,
        "start_hour": 2, # 02:00 AM
        "line_capacity_pct": 75.0,
        "passenger_trains_scheduled": 1,
        "freight_trains_scheduled": 2,
        "has_loop_line_for_precedence": True
    }
    day_block = {
        "duration_minutes": 180,
        "start_hour": 8, # 08:00 AM peak
        "line_capacity_pct": 95.0,
        "passenger_trains_scheduled": 6,
        "freight_trains_scheduled": 2,
        "has_loop_line_for_precedence": False
    }
    res_night = delay_predictor.estimate_delay_impact(night_block)
    res_day = delay_predictor.estimate_delay_impact(day_block)

    assert res_night["total_projected_delay_minutes"] < res_day["total_projected_delay_minutes"]
    assert res_night["corridor_punctuality_score"] > res_day["corridor_punctuality_score"]
    assert res_night["congestion_level"] == "Low"

def test_ai_explainer():
    block_info = {
        "block_code": "BLK-2026-0042",
        "section_code": "NDLS-TKD-UP",
        "start_time": "01:30",
        "end_time": "04:30",
        "duration_hours": 3.0,
        "departments": ["ENG", "TRD"],
        "tasks": ["Track Tamping", "OHE Catenary Inspection"],
        "passenger_delay_minutes": 0,
        "freight_delay_minutes": 18,
        "defects_cleared": 2
    }
    exp = explainer.generate_block_explanation(block_info)
    assert "01:30 - 04:30" in exp["summary"]
    assert "ENG + TRD" in exp["synergy_justification"]
    assert "0 passenger delay" in exp["traffic_justification"]
    assert exp["confidence_score"] >= 0.90

def test_mock_integrations():
    tms_data = MockTMSClient.fetch_latest_defects(count=5)
    smms_data = MockSMMSClient.fetch_latest_defects(count=5)
    tdms_data = MockTDMSClient.fetch_latest_defects(count=5)
    coa_trains = MockCOAClient.fetch_live_train_locations(count=5)
    coa_freight = MockCOAClient.fetch_freight_forecast("NDLS-AGC")

    assert len(tms_data) == 5
    assert all(d["data_mode"] in ["SIMULATED DATA", "SIMULATED DEMO DATA"] for d in tms_data)
    assert len(smms_data) == 5
    assert len(tdms_data) == 5
    assert len(coa_trains) > 0
    assert coa_freight["projected_freight_rakes"] > 0

    assert MockTMSClient.ping_system_health()["status"].startswith("Online")
    assert MockSMMSClient.ping_system_health()["status"].startswith("Online")
    assert MockTDMSClient.ping_system_health()["status"].startswith("Online")
    assert MockCOAClient.ping_system_health()["status"].startswith("Online")

