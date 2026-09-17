import os
import sys
from datetime import datetime, timedelta
import pytest
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.train_delay_predictor import TrainDelayPredictionEngine, train_delay_engine


@pytest.fixture
def valid_features():
    return {
        "rainfall_mm": 45.2,
        "humidity_percent": 88.0,
        "ambient_temperature_c": 28.5,
        "average_speed_kmph": 75.0,
        "distance_travelled_km": 450000,
        "train_age_years": 8,
        "last_maintenance_days": 45,
        "season": "Monsoon",
        "region": "Northern Railway",
        "train_type": "Express"
    }


def test_normal_prediction(valid_features):
    """Test 1: Normal prediction with all 10 valid features produces structured output."""
    res = train_delay_engine.predict_delay(valid_features)
    assert res["status"] == "success"
    assert "predicted_delay_minutes" in res
    assert "delay_severity_tier" in res
    assert "is_delayed" in res
    assert "top_contributing_factors" in res
    assert res["model_type"] == "HistGradientBoostingRegressor"
    assert len(res["top_contributing_factors"]) > 0


def test_prediction_with_missing_optional_values():
    """Test 2: Prediction with missing optional values succeeds via pipeline imputers."""
    sparse_features = {
        "season": "Summer",
        "train_type": "Passenger"
        # All numerical features missing (None / omitted)
    }
    res = train_delay_engine.predict_delay(sparse_features)
    assert res["status"] == "success"
    assert isinstance(res["predicted_delay_minutes"], (int, float))
    assert res["predicted_delay_minutes"] >= 0.0


def test_unseen_categorical_values():
    """Test 3: Unseen categorical values do not cause crash (handled by OneHotEncoder ignore)."""
    unseen_features = {
        "rainfall_mm": 10.0,
        "humidity_percent": 50.0,
        "ambient_temperature_c": 25.0,
        "average_speed_kmph": 80.0,
        "distance_travelled_km": 100000,
        "train_age_years": 5,
        "last_maintenance_days": 30,
        "season": "Antarctic_Blizzard", # Completely unseen season
        "region": "Moon_Railway_Zone",   # Completely unseen region
        "train_type": "Hyperloop"        # Completely unseen train type
    }
    res = train_delay_engine.predict_delay(unseen_features)
    assert res["status"] == "success"
    assert isinstance(res["predicted_delay_minutes"], (int, float))
    assert res["predicted_delay_minutes"] >= 0.0


def test_prediction_is_numeric(valid_features):
    """Test 4: Predicted delay is strictly numeric (float or int)."""
    res = train_delay_engine.predict_delay(valid_features)
    val = res["predicted_delay_minutes"]
    assert isinstance(val, (int, float))
    assert not np.isnan(val)
    assert not np.isinf(val)


def test_prediction_is_non_negative():
    """Test 5: Prediction is strictly non-negative (>= 0.0) even under optimal conditions."""
    optimal_features = {
        "rainfall_mm": 0.0,
        "humidity_percent": 15.0,
        "ambient_temperature_c": 24.0,
        "average_speed_kmph": 110.0,
        "distance_travelled_km": 5000,
        "train_age_years": 1,
        "last_maintenance_days": 2,
        "season": "Winter",
        "region": "Western Railway",
        "train_type": "Express"
    }
    res = train_delay_engine.predict_delay(optimal_features)
    assert res["predicted_delay_minutes"] >= 0.0


def test_model_loading_failure():
    """Test 6: Engine raises RuntimeError gracefully if model file is missing."""
    engine = TrainDelayPredictionEngine(model_path="non_existent_model_file_12345.pkl")
    assert engine.is_loaded is False
    with pytest.raises(RuntimeError) as exc_info:
        engine.predict_delay({"season": "Summer"})
    assert "currently unavailable" in str(exc_info.value)


def test_pipeline_consistency(valid_features):
    """Test 7: Prediction matches direct pipeline call output for mathematical consistency."""
    engine_pred = train_delay_engine.predict_delay(valid_features)["predicted_delay_minutes"]

    df_sample = pd.DataFrame([{col: valid_features.get(col) for col in train_delay_engine.FEATURE_NAMES}])
    direct_pred = float(train_delay_engine.pipeline.predict(df_sample)[0])
    direct_clamped = max(0.0, round(direct_pred, 2))

    assert engine_pred == direct_clamped


def test_eta_calculation_distinction(valid_features):
    """Test 8: Explicit ETA calculation preserves scheduled arrival + predicted delay separation."""
    sched = datetime(2026, 9, 20, 14, 30, 0)
    res = train_delay_engine.predict_eta(valid_features, scheduled_arrival=sched)

    assert "predicted_delay_minutes" in res
    assert "scheduled_arrival" in res
    assert "predicted_eta" in res

    pred_delay = res["predicted_delay_minutes"]
    expected_eta = sched + timedelta(minutes=pred_delay)
    assert res["predicted_eta"] == expected_eta.isoformat()
    assert "eta_calculation_formula" in res

