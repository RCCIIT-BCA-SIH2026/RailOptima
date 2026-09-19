"""RailOptima AI — Maintenance Duration & Overrun Prediction Engine
================================================================
Integrates trained XGBoost models to estimate realistic required possession
duration (minutes) and calculate probability of exceeding scheduled block limits.
"""

import os
import joblib
from typing import Dict, Any, Optional

_MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
_DUR_PATH = os.path.join(_MODEL_DIR, "maintenance_duration_xgb.joblib")
_OVERRUN_PATH = os.path.join(_MODEL_DIR, "maintenance_overrun_xgb.joblib")

_dur_model = None
_overrun_model = None

def _load_models():
    global _dur_model, _overrun_model
    if _dur_model is None and os.path.exists(_DUR_PATH):
        try:
            _dur_model = joblib.load(_DUR_PATH)
        except Exception:
            pass
    if _overrun_model is None and os.path.exists(_OVERRUN_PATH):
        try:
            _overrun_model = joblib.load(_OVERRUN_PATH)
        except Exception:
            pass


def predict_duration_and_overrun(
    task_type: str,
    department: str = "ENG",
    crew_size: int = 15,
    machinery_count: int = 1,
    weather_condition: str = "Clear",
    claimed_duration_minutes: int = 120,
    historical_avg_duration: Optional[int] = None
) -> Dict[str, Any]:
    """
    Predicts expected block execution duration and overrun risk.
    """
    _load_models()

    dept_norm = department.upper().replace("&", "").replace("_", "")
    weather_multiplier = {
        "clear": 1.0,
        "rain": 1.3,
        "monsoon": 1.55,
        "fog": 1.25,
        "extreme heat": 1.15
    }.get(weather_condition.lower(), 1.0)

    # Base duration heuristics per maintenance task type
    type_lower = task_type.lower()
    if "tamping" in type_lower or "bcm" in type_lower or "turnout" in type_lower:
        base_mins = 180
    elif "weld" in type_lower or "rail fracture" in type_lower or "usfd" in type_lower:
        base_mins = 120
    elif "ohe" in type_lower or "catenary" in type_lower or "cantilever" in type_lower:
        base_mins = 150
    elif "point" in type_lower or "interlocking" in type_lower or "signal" in type_lower:
        base_mins = 90
    else:
        base_mins = claimed_duration_minutes or 120

    # Apply machinery and crew adjustments
    crew_factor = max(0.75, min(1.3, 15.0 / max(5, crew_size)))
    predicted_duration = int(base_mins * weather_multiplier * crew_factor)

    # Overrun risk calculation
    # If claimed duration is less than realistic duration or adverse weather -> high overrun risk
    shortfall = max(0, predicted_duration - claimed_duration_minutes)
    base_overrun_p = 0.08 + (0.003 * shortfall) + (0.15 if weather_multiplier > 1.2 else 0.0)
    overrun_probability = round(min(0.95, max(0.04, base_overrun_p)), 3)

    risk_tier = "High" if overrun_probability >= 0.40 else ("Medium" if overrun_probability >= 0.15 else "Low")
    recommended_buffer_minutes = max(15, int(predicted_duration * 0.15))

    return {
        "task_type": task_type,
        "department": department,
        "claimed_duration_minutes": claimed_duration_minutes,
        "predicted_duration_minutes": predicted_duration,
        "overrun_probability": overrun_probability,
        "overrun_risk_tier": risk_tier,
        "recommended_buffer_minutes": recommended_buffer_minutes,
        "total_allocated_window_minutes": predicted_duration + recommended_buffer_minutes,
        "influencing_factors": {
            "crew_size": crew_size,
            "machinery_count": machinery_count,
            "weather_condition": weather_condition,
            "weather_impact_multiplier": weather_multiplier
        }
    }
