import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union

import numpy as np
import pandas as pd
import joblib

logger = logging.getLogger("railway.ml.train_delay_predictor")


class TrainDelayPredictionEngine:
    """
    Production Machine Learning Inference Engine for Indian Railways Train Delay Prediction.
    
    Uses trained HistGradientBoosting Pipeline (ColumnTransformer + Imputers + OneHotEncoder + Regressor)
    loaded from ml/train_delay_prediction_model.pkl.
    
    Predicts operational train trip delay in minutes (predicted_delay_minutes) based on
    environmental conditions (rainfall, humidity, temperature, season, region) and
    operational parameters (speed, distance, train age, maintenance recency, train type).
    
    ETA DESIGN NOTE:
    The empirical dataset predicts 'delay_minutes'. It does not contain direct station arrival timestamps.
    Estimated Time of Arrival (ETA) is computed deterministically as:
        predicted_eta = scheduled_arrival + timedelta(minutes=predicted_delay_minutes)
    """

    NUMERICAL_FEATURES = [
        "rainfall_mm",
        "humidity_percent",
        "ambient_temperature_c",
        "average_speed_kmph",
        "distance_travelled_km",
        "train_age_years",
        "last_maintenance_days"
    ]

    CATEGORICAL_FEATURES = [
        "season",
        "region",
        "train_type"
    ]

    FEATURE_NAMES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES

    def __init__(self, model_path: Optional[str] = None):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if model_path is None:
            model_path = os.path.join(base_dir, "train_delay_prediction_model.pkl")
        self.model_path = model_path
        self.pipeline = None
        self.is_loaded = False
        self.feature_importances: List[Dict[str, Any]] = []
        self.metrics: Dict[str, Any] = {}
        self.model_version = "1.0.0-hgb-regressor"
        self.model_type = "HistGradientBoostingRegressor"

        # Load the model once at initialization
        self._load_trained_pipeline(base_dir)

    def _load_trained_pipeline(self, base_dir: str):
        """Safely loads the scikit-learn regression pipeline without retraining."""
        if os.path.exists(self.model_path):
            try:
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    self.pipeline = joblib.load(self.model_path)
                self.is_loaded = True
                logger.info("Loaded train delay prediction pipeline from %s", self.model_path)
            except Exception as e:
                logger.error("Failed to load train delay prediction pipeline: %s", e)
                self.pipeline = None
                self.is_loaded = False
        else:
            logger.warning("Train delay prediction model file not found at: %s", self.model_path)
            self.pipeline = None
            self.is_loaded = False

        # Load metrics
        metrics_path = os.path.join(base_dir, "train_delay_prediction_metrics.json")
        if os.path.exists(metrics_path):
            try:
                with open(metrics_path, "r", encoding="utf-8") as f:
                    self.metrics = json.load(f)
                    self.model_version = self.metrics.get("training_timestamp", self.model_version)
                    self.model_type = self.metrics.get("primary_model", self.model_type)
            except Exception as e:
                logger.warning("Could not read train delay prediction metrics: %s", e)

        # Load feature importances
        fi_path = os.path.join(base_dir, "train_delay_prediction_feature_importance.json")
        if os.path.exists(fi_path):
            try:
                with open(fi_path, "r", encoding="utf-8") as f:
                    self.feature_importances = json.load(f)
            except Exception as e:
                logger.warning("Could not read train delay feature importances: %s", e)

    def predict_delay(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes inference on the trained pipeline to predict trip delay in minutes.
        Handles missing features (via pipeline median/mode imputation) and unseen categories
        (via OneHotEncoder handle_unknown='ignore').
        Guarantees non-negative prediction.
        """
        if self.pipeline is None:
            raise RuntimeError("Train delay prediction model is currently unavailable or failed to load.")

        # Build 1-row DataFrame preserving all 10 expected feature columns
        row = {}
        for col in self.FEATURE_NAMES:
            val = features.get(col)
            row[col] = val if val is not None else np.nan

        df_single = pd.DataFrame([row])

        # Run pipeline inference
        raw_pred = float(self.pipeline.predict(df_single)[0])
        delay_minutes = max(0.0, round(raw_pred, 2))

        # Categorize delay severity using Indian Railways operational tiers
        if delay_minutes <= 5.0:
            severity_tier = "On Time"
            is_delayed = False
            recommended_action = "Normal passage priority; proceed on scheduled track path."
        elif delay_minutes <= 15.0:
            severity_tier = "Minor Delay"
            is_delayed = True
            recommended_action = "Monitor section headway; make up time via speed relaxation where permissible."
        elif delay_minutes <= 30.0:
            severity_tier = "Moderate Delay"
            is_delayed = True
            recommended_action = "Alert section controller; coordinate precedence at loop line stations."
        else:
            severity_tier = "Major Delay"
            is_delayed = True
            recommended_action = "Issue priority regulation bulletin; review cascading impact on upcoming maintenance blocks."

        # Top contributing risk factors
        top_factors = []
        if self.feature_importances:
            for item in self.feature_importances[:4]:
                feat = item["feature"]
                top_factors.append({
                    "feature": feat,
                    "importance_pct": item.get("importance_pct", 0.0),
                    "feature_value": features.get(feat),
                    "category": item.get("category", "Environmental")
                })

        return {
            "predicted_delay_minutes": delay_minutes,
            "delay_severity_tier": severity_tier,
            "is_delayed": is_delayed,
            "top_contributing_factors": top_factors,
            "model_version": self.model_version,
            "model_type": self.model_type,
            "recommended_action": recommended_action,
            "status": "success"
        }

    def predict_eta(
        self,
        features: Dict[str, Any],
        scheduled_arrival: Optional[Union[datetime, str]] = None
    ) -> Dict[str, Any]:
        """
        Predicts delay and computes Estimated Time of Arrival (ETA).
        
        Explicit Architectural Distinction:
        - The ML model directly predicts 'predicted_delay_minutes'.
        - If scheduled_arrival is provided, predicted_eta = scheduled_arrival + predicted_delay_minutes.
        """
        delay_result = self.predict_delay(features)
        predicted_delay = delay_result["predicted_delay_minutes"]

        eta_iso = None
        scheduled_iso = None

        if scheduled_arrival is not None:
            if isinstance(scheduled_arrival, str):
                try:
                    dt_sched = datetime.fromisoformat(scheduled_arrival.replace("Z", "+00:00"))
                except Exception:
                    # Fallback for simple 'HH:MM' format
                    today = datetime.utcnow().date()
                    parts = scheduled_arrival.strip().split(":")
                    if len(parts) >= 2:
                        dt_sched = datetime(today.year, today.month, today.day, int(parts[0]), int(parts[1]))
                    else:
                        dt_sched = datetime.utcnow()
            else:
                dt_sched = scheduled_arrival

            scheduled_iso = dt_sched.isoformat()
            dt_eta = dt_sched + timedelta(minutes=predicted_delay)
            eta_iso = dt_eta.isoformat()

        response = dict(delay_result)
        response.update({
            "scheduled_arrival": scheduled_iso,
            "predicted_eta": eta_iso,
            "eta_calculation_formula": "predicted_eta = scheduled_arrival + timedelta(minutes=predicted_delay_minutes)",
            "eta_design_note": "The ML model predicts delay_minutes. Station ETA is calculated using scheduled arrival + predicted delay."
        })
        return response


# Singleton instance
train_delay_engine = TrainDelayPredictionEngine()

