import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.delay_predictor import delay_predictor

def test_delay_predictor_known_station_known_train():
    """Verify ML models run with both known station and known train."""
    params = {
        "duration_minutes": 180,
        "start_hour": 14,
        "line_capacity_pct": 80.0,
        "passenger_trains_scheduled": 2,
        "freight_trains_scheduled": 3,
        "has_loop_line_for_precedence": True,
        "station_code": "NDLS",
        "day": 2,
        "train_number": "12001",
        "average_delay_minutes": 12.5,
        "pct_right_time": 0.80,
        "pct_slight_delay": 0.15
    }
    res = delay_predictor.estimate_delay_impact(params)
    
    assert "total_projected_delay_minutes" in res
    assert "passenger_delay_minutes" in res
    assert "freight_delay_minutes" in res
    assert "affected_passenger_trains" in res
    assert "affected_freight_trains" in res
    assert "corridor_punctuality_score" in res
    assert "congestion_level" in res
    assert res["total_projected_delay_minutes"] > 0
    assert 0.0 <= res["corridor_punctuality_score"] <= 100.0
    assert res["congestion_level"] in ["Low", "Moderate", "High"]

def test_delay_predictor_unknown_station():
    """Verify unknown station does not crash with ValueError and safely uses fallback encoder."""
    params = {
        "duration_minutes": 180,
        "start_hour": 14,
        "line_capacity_pct": 80.0,
        "passenger_trains_scheduled": 2,
        "freight_trains_scheduled": 3,
        "station_code": "NON_EXISTENT_STN_999",
        "day": 2,
        "train_number": "12001",
        "average_delay_minutes": 10.0,
        "pct_right_time": 0.85,
        "pct_slight_delay": 0.10
    }
    # Must succeed without raising ValueError
    res = delay_predictor.estimate_delay_impact(params)
    assert res["total_projected_delay_minutes"] > 0
    assert "congestion_level" in res

def test_delay_predictor_unknown_train():
    """Verify unknown train does not crash with ValueError and safely uses fallback encoder."""
    params = {
        "duration_minutes": 180,
        "start_hour": 14,
        "line_capacity_pct": 80.0,
        "passenger_trains_scheduled": 2,
        "freight_trains_scheduled": 3,
        "station_code": "NDLS",
        "day": 2,
        "train_number": "9999999",
        "average_delay_minutes": 10.0,
        "pct_right_time": 0.85,
        "pct_slight_delay": 0.10
    }
    # Must succeed without raising ValueError
    res = delay_predictor.estimate_delay_impact(params)
    assert res["total_projected_delay_minutes"] > 0
    assert "congestion_level" in res

def test_delay_predictor_missing_optional_ml_inputs():
    """Verify graceful fallback to heuristic logic when ML inputs are absent."""
    params = {
        "duration_minutes": 180,
        "start_hour": 2, # Night window
        "line_capacity_pct": 75.0,
        "passenger_trains_scheduled": 1,
        "freight_trains_scheduled": 2,
        "has_loop_line_for_precedence": True
    }
    res = delay_predictor.estimate_delay_impact(params)
    assert res["total_projected_delay_minutes"] == 75
    assert res["passenger_delay_minutes"] == 5
    assert res["freight_delay_minutes"] == 70
    assert res["congestion_level"] == "Low"
    assert res["corridor_punctuality_score"] == 82.0

