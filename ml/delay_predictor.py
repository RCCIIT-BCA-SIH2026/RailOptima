import os
import logging
import warnings
from typing import Dict, Any, List, Optional
import pandas as pd
import joblib

logger = logging.getLogger("railway.ml.delay_predictor")

class TrainDelayPredictor:
    """
    ML and Queuing-based Train Delay Impact Predictor for Indian Railways.
    
    Uses trained machine learning models when section/train telemetry is available:
    - traffic_density_model.pkl (station traffic density from station, day, hour)
    - congestion_risk_model.pkl (delay risk from station, train, punctuality stats)
    - station_encoder.pkl & train_encoder.pkl (with safe unknown-entity fallback)
    
    Gracefully falls back to heuristic domain calculations when ML features are absent.
    """

    # Time-of-day traffic congestion multipliers (24-hour cycle fallback)
    TIME_SLOT_CONGESTION = {
        (1, 5): 0.35,   # Night window 01:00 - 05:00: lowest passenger congestion
        (5, 9): 1.40,   # Morning peak: high passenger density
        (9, 12): 1.10,  # Midday regular
        (12, 16): 0.85, # Afternoon lull: favorable for maintenance
        (16, 21): 1.50, # Evening peak: highest passenger density
        (21, 24): 0.90, # Late evening
        (0, 1): 0.50    # Midnight transition
    }

    def __init__(self, model_dir: Optional[str] = None):
        if model_dir is None:
            model_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_dir = model_dir
        self.traffic_model = None
        self.congestion_model = None
        self.station_encoder = None
        self.train_encoder = None
        self.station_classes = set()
        self.train_classes = set()
        self._load_models_and_encoders()

    def _load_models_and_encoders(self):
        """Safely loads scikit-learn models and encoders without failing on version warnings."""
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            # 1. Traffic Density Model
            traffic_path = os.path.join(self.model_dir, "traffic_density_model.pkl")
            if os.path.exists(traffic_path):
                try:
                    self.traffic_model = joblib.load(traffic_path)
                    logger.info("Loaded traffic_density_model.pkl successfully.")
                except Exception as e:
                    logger.error(f"Failed to load traffic_density_model.pkl: {e}")

            # 2. Congestion Risk Model
            congestion_path = os.path.join(self.model_dir, "congestion_risk_model.pkl")
            if os.path.exists(congestion_path):
                try:
                    self.congestion_model = joblib.load(congestion_path)
                    logger.info("Loaded congestion_risk_model.pkl successfully.")
                except Exception as e:
                    logger.error(f"Failed to load congestion_risk_model.pkl: {e}")

            # 3. Station Encoder
            station_path = os.path.join(self.model_dir, "station_encoder.pkl")
            if os.path.exists(station_path):
                try:
                    self.station_encoder = joblib.load(station_path)
                    self.station_classes = set(self.station_encoder.classes_)
                    logger.info(f"Loaded station_encoder.pkl successfully ({len(self.station_classes)} stations).")
                except Exception as e:
                    logger.error(f"Failed to load station_encoder.pkl: {e}")

            # 4. Train Encoder
            train_path = os.path.join(self.model_dir, "train_encoder.pkl")
            if os.path.exists(train_path):
                try:
                    self.train_encoder = joblib.load(train_path)
                    self.train_classes = set(self.train_encoder.classes_)
                    logger.info(f"Loaded train_encoder.pkl successfully ({len(self.train_classes)} trains).")
                except Exception as e:
                    logger.error(f"Failed to load train_encoder.pkl: {e}")

    def safe_encode_station(self, station_code: Any) -> int:
        """Safely encodes a station code; returns 0 if unseen to prevent HTTP 500 crashes."""
        if not self.station_encoder or station_code is None:
            return 0
        cleaned = str(station_code).strip().upper()
        if cleaned in self.station_classes:
            return int(self.station_encoder.transform([cleaned])[0])
        logger.warning(f"Station '{station_code}' not in station_encoder classes. Safe fallback to index 0.")
        return 0

    def safe_encode_train(self, train_number: Any) -> int:
        """Safely encodes a train number; returns 0 if unseen to prevent HTTP 500 crashes."""
        if not self.train_encoder or train_number is None:
            return 0
        cleaned = str(train_number).strip()
        if cleaned in self.train_classes:
            return int(self.train_encoder.transform([cleaned])[0])
        logger.warning(f"Train '{train_number}' not in train_encoder classes. Safe fallback to index 0.")
        return 0

    def _get_time_congestion_multiplier(self, hour: int) -> float:
        """Fallback time-of-day traffic congestion multiplier."""
        for (start_h, end_h), mult in self.TIME_SLOT_CONGESTION.items():
            if start_h <= hour < end_h:
                return mult
        return 1.0

    def estimate_delay_impact(self_or_cls, block_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates projected passenger and freight delay minutes.
        Uses trained ML models if features are supplied, otherwise falls back to heuristics.
        """
        self = self_or_cls if isinstance(self_or_cls, TrainDelayPredictor) else delay_predictor

        duration_minutes = block_params.get("duration_minutes", 180)
        start_hour = block_params.get("start_hour", 2) # Default 02:00 AM
        line_capacity_pct = block_params.get("line_capacity_pct", 80.0) # Line occupancy %
        passenger_trains_count = block_params.get("passenger_trains_scheduled", 2)
        freight_trains_count = block_params.get("freight_trains_scheduled", 3)
        has_loop_line = block_params.get("has_loop_line_for_precedence", True)

        # ML Feature extraction (optional)
        station_code = block_params.get("station_code") or block_params.get("station")
        if not station_code and "section_code" in block_params:
            sec_candidate = str(block_params.get("section_code", "")).split("-")[0].strip().upper()
            if sec_candidate in self.station_classes:
                station_code = sec_candidate

        day = block_params.get("day") if block_params.get("day") is not None else block_params.get("day_of_week")
        if day is None and "start_time" in block_params:
            try:
                from datetime import datetime
                st_val = block_params.get("start_time")
                if isinstance(st_val, str) and len(st_val) >= 10:
                    dt = datetime.fromisoformat(st_val.replace("Z", "+00:00"))
                    day = dt.weekday()
            except Exception:
                pass

        hour = block_params.get("hour") if block_params.get("hour") is not None else start_hour

        train_number = block_params.get("train_number") or block_params.get("train_no")
        avg_delay = block_params.get("average_delay_minutes") or block_params.get("avg_delay")
        pct_right_time = block_params.get("pct_right_time")
        pct_slight_delay = block_params.get("pct_slight_delay")

        traffic_ml_used = False
        congestion_ml_used = False
        congestion_mult = self._get_time_congestion_multiplier(start_hour)
        congestion_level = "Low" if congestion_mult <= 0.6 else ("High" if congestion_mult >= 1.3 else "Moderate")
        risk_factor = 1.0

        # 1. Evaluate Traffic Density Model if inputs are present
        if self.traffic_model is not None and station_code is not None and day is not None and hour is not None:
            try:
                st_enc = self.safe_encode_station(station_code)
                df_traffic = pd.DataFrame([{
                    "station_code_enc": st_enc,
                    "day": int(day),
                    "hour": int(hour)
                }])
                traffic_probs = self.traffic_model.predict_proba(df_traffic)[0]
                prob_map = dict(zip(self.traffic_model.classes_, traffic_probs))
                p_high = float(prob_map.get("High", 0.0))
                p_low = float(prob_map.get("Low", 0.0))
                p_med = float(prob_map.get("Medium", 0.0))
                pred_label = self.traffic_model.predict(df_traffic)[0]

                # Blend probabilities into a continuous congestion multiplier
                congestion_mult = (p_low * 0.40) + (p_med * 1.00) + (p_high * 1.45)
                congestion_level = "High" if (pred_label == "High" or p_high >= 0.5) else ("Low" if (pred_label == "Low" or p_low >= 0.5) else "Moderate")
                traffic_ml_used = True
            except Exception as e:
                logger.warning(f"Error executing traffic_density_model: {e}. Falling back to baseline.")

        # 2. Evaluate Congestion Risk Model if inputs are present
        if (self.congestion_model is not None and station_code is not None and train_number is not None
                and avg_delay is not None and pct_right_time is not None and pct_slight_delay is not None):
            try:
                st_enc = self.safe_encode_station(station_code)
                tr_enc = self.safe_encode_train(train_number)
                df_risk = pd.DataFrame([{
                    "station_code_enc": st_enc,
                    "train_number_enc": tr_enc,
                    "average_delay_minutes": float(avg_delay),
                    "pct_right_time": float(pct_right_time),
                    "pct_slight_delay": float(pct_slight_delay)
                }])
                risk_probs = self.congestion_model.predict_proba(df_risk)[0]
                risk_map = dict(zip(self.congestion_model.classes_, risk_probs))
                p_risk_high = float(risk_map.get("High", 0.0))
                p_risk_low = float(risk_map.get("Low", 0.0))
                p_risk_med = float(risk_map.get("Medium", 0.0))
                pred_risk = self.congestion_model.predict(df_risk)[0]

                risk_factor = (p_risk_low * 0.85) + (p_risk_med * 1.00) + (p_risk_high * 1.30)
                if pred_risk == "High" or p_risk_high >= 0.5:
                    congestion_level = "High"
                congestion_ml_used = True
            except Exception as e:
                logger.warning(f"Error executing congestion_risk_model: {e}. Falling back to baseline.")

        capacity_factor = line_capacity_pct / 60.0
        loop_mitigation = 0.55 if has_loop_line else 1.0

        # Passenger delay calculation:
        # High priority trains are regulated with utmost care; loop line minimizes delay
        passenger_delay_per_train = (duration_minutes * 0.12) * congestion_mult * capacity_factor * loop_mitigation * risk_factor
        total_passenger_delay = int(passenger_delay_per_train * passenger_trains_count)

        # Freight delay calculation:
        # Freight trains are held in sidings/loops during blocks
        freight_delay_per_train = (duration_minutes * 0.45) * congestion_mult * capacity_factor
        total_freight_delay = int(freight_delay_per_train * freight_trains_count)

        total_delay = total_passenger_delay + total_freight_delay

        # Calculate punctuality impact score (0 to 100, 100 being zero disruption)
        punctuality_score = max(0.0, 100.0 - (total_passenger_delay * 0.8 + total_freight_delay * 0.2))
        punctuality_score = round(punctuality_score, 1)

        # Log computation source clearly
        if traffic_ml_used or congestion_ml_used:
            logger.info(
                f"[ML_INFERENCE] Delay estimated using ML (traffic_density={traffic_ml_used}, congestion_risk={congestion_ml_used}). "
                f"Total delay={total_delay}m, Congestion={congestion_level}"
            )
        else:
            logger.info(
                f"[FALLBACK_LOGIC] Delay estimated using heuristic fallback (hour={start_hour}, capacity={line_capacity_pct}%). "
                f"Total delay={total_delay}m, Congestion={congestion_level}"
            )

        return {
            "total_projected_delay_minutes": total_delay,
            "passenger_delay_minutes": total_passenger_delay,
            "freight_delay_minutes": total_freight_delay,
            "affected_passenger_trains": passenger_trains_count,
            "affected_freight_trains": freight_trains_count,
            "corridor_punctuality_score": punctuality_score,
            "congestion_level": congestion_level
        }

delay_predictor = TrainDelayPredictor()
