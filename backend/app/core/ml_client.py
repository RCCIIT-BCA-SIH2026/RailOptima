"""
RailOptima Backend — ML Service Client
=======================================
High-performance resilient HTTP client connecting the Core Backend API (port 8000)
to the standalone ML & Optimization Microservice (port 8001).
"""

import time
import logging
from typing import Dict, Any, List, Optional
import httpx

from backend.app.core.config import settings

logger = logging.getLogger("railoptima.backend.ml_client")

class MLServiceClient:
    """
    Client for interacting with the standalone ML & Optimization Microservice.
    Points to settings.ML_SERVICE_URL (default: http://127.0.0.1:8001).
    Includes resilient failover to direct in-process execution if microservice is offline during dev/test.
    """

    def __init__(self, base_url: Optional[str] = None, timeout: float = 30.0):
        self.base_url = (base_url or getattr(settings, "ML_SERVICE_URL", "http://127.0.0.1:8001")).rstrip("/")
        self.timeout = timeout
        self.client_timeout = httpx.Timeout(connect=0.5, read=timeout, write=10.0, pool=5.0)
        self.client = httpx.Client(base_url=self.base_url, timeout=self.client_timeout)
        self._last_unreachable_ts = 0.0
        self._unreachable_cooldown_sec = 2.0

    def _is_service_likely_online(self) -> bool:
        if time.time() - self._last_unreachable_ts < self._unreachable_cooldown_sec:
            return False
        return True

    def _mark_unreachable(self, err: Exception):
        self._last_unreachable_ts = time.time()
        logger.debug(f"ML microservice unreachable at {self.base_url}, fast-failing to in-process: {err}")

    def health(self) -> Dict[str, Any]:
        """Checks health and status of the ML microservice."""
        if self._is_service_likely_online():
            try:
                resp = self.client.get("/ml/health")
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                self._mark_unreachable(e)
        return {"status": "In-Process Mode", "microservice_url": self.base_url}

    def score_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calls ML microservice to score a maintenance task using the 6-factor model."""
        if self._is_service_likely_online():
            try:
                resp = self.client.post("/ml/priority/score", json={"task": task_data})
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                self._mark_unreachable(e)
        
        from ml.priority_engine import AIMaintenancePriorityEngine
        return AIMaintenancePriorityEngine.score_task(task_data)

    def calculate_defect_priority(self, defect_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calls ML microservice to calculate composite defect priority score (0-100)."""
        if self._is_service_likely_online():
            try:
                resp = self.client.post("/ml/priority/defect-score", json=defect_data)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                self._mark_unreachable(e)
        
        from ml.priority_engine import AIPriorityEngine
        return AIPriorityEngine.calculate_priority(defect_data)

    def rank_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calls ML microservice to rank multiple maintenance tasks."""
        if self._is_service_likely_online():
            try:
                resp = self.client.post("/ml/priority/rank", json={"tasks": tasks})
                if resp.status_code == 200:
                    return resp.json().get("ranked_tasks", [])
            except Exception as e:
                self._mark_unreachable(e)
        
        from ml.priority_engine import AIMaintenancePriorityEngine
        return AIMaintenancePriorityEngine.rank_tasks(tasks)

    def predict_maintenance(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Calls ML microservice to execute Random Forest Predictive Maintenance pipeline."""
        if self._is_service_likely_online():
            try:
                resp = self.client.post("/ml/predictive-maintenance/predict", json=features)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                self._mark_unreachable(e)
        
        from ml.predictive_maintenance import predictive_engine
        return predictive_engine.predict_maintenance(features)

    def predict_train_delay_eta(
        self,
        features: Dict[str, Any],
        scheduled_arrival: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calls ML microservice to execute HistGradientBoosting delay prediction and ETA calculation."""
        if self._is_service_likely_online():
            payload = dict(features)
            if scheduled_arrival:
                payload["scheduled_arrival"] = str(scheduled_arrival)
            try:
                resp = self.client.post("/ml/train-delay/predict-eta", json=payload)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                self._mark_unreachable(e)
        
        from ml.train_delay_predictor import train_delay_engine
        return train_delay_engine.predict_eta(features, scheduled_arrival=scheduled_arrival)

    def predict_survival(
        self,
        age_years: float = 18.0,
        gmt_density: float = 45.0,
        monsoon_exposure: str = "medium",
        curvature_class: str = "gentle",
        asset_type: str = "Track",
        defects_count: int = 0
    ) -> Dict[str, Any]:
        """Calls ML microservice to calculate 30-day Weibull survival curve and RUL."""
        if self._is_service_likely_online():
            payload = {
                "age_years": age_years,
                "gmt_density": gmt_density,
                "monsoon_exposure": monsoon_exposure,
                "curvature_class": curvature_class,
                "asset_type": asset_type,
                "defects_count": defects_count
            }
            try:
                resp = self.client.post("/ml/survival/predict-curve", json=payload)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                self._mark_unreachable(e)
        
        from ml.survival_engine import predict_failure_risk_30d
        return predict_failure_risk_30d(
            age_years=age_years,
            gmt_density=gmt_density,
            monsoon_exposure=monsoon_exposure,
            curvature_class=curvature_class,
            asset_type=asset_type,
            defects_count=defects_count
        )

    def predict_duration_and_overrun(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Calls ML microservice to predict realistic duration and overrun probability."""
        if self._is_service_likely_online():
            try:
                resp = self.client.post("/ml/duration-overrun/predict", json=payload)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                self._mark_unreachable(e)
        
        from ml.duration_overrun_engine import predict_duration_and_overrun
        return predict_duration_and_overrun(
            task_type=str(payload.get("task_type", "Track Tamping")),
            department=str(payload.get("department", "ENG")),
            crew_size=int(payload.get("crew_size", 15)),
            machinery_count=int(payload.get("machinery_count", 1)),
            weather_condition=str(payload.get("weather_condition", "Clear")),
            claimed_duration_minutes=int(payload.get("claimed_duration_minutes", 120))
        )

    def optimize_blocks(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Calls ML microservice to solve corridor schedule using Google OR-Tools CP-SAT."""
        if self._is_service_likely_online():
            try:
                resp = self.client.post("/ml/optimization/optimize-blocks", json=payload)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                self._mark_unreachable(e)
        
        from backend.optimization.block_optimizer import AutomaticBlockPlanningEngine
        return AutomaticBlockPlanningEngine.optimize_blocks(
            section=payload.get("section", "NDLS-TKD-UP"),
            date_range=payload.get("date_range"),
            maintenance_tasks=payload.get("maintenance_tasks"),
            train_schedule=payload.get("train_schedule"),
            available_blocks=payload.get("available_blocks"),
            resources=payload.get("resources"),
            existing_blocks=payload.get("existing_blocks"),
            goods_train_forecast=payload.get("goods_train_forecast"),
            passenger_train_traffic=payload.get("passenger_train_traffic")
        )

    def explain_block(self, block_info: Dict[str, Any]) -> Dict[str, Any]:
        """Calls ML microservice to generate natural language rationale for a block."""
        if self._is_service_likely_online():
            try:
                resp = self.client.post("/ml/explainer/block", json={"block_info": block_info})
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                self._mark_unreachable(e)
        
        from ml.explainer import explainer
        return explainer.generate_block_explanation(block_info)

    def explain_comparative(
        self,
        recommended_window: str = "01:30 - 04:30",
        section: str = "NDLS-TKD-UP",
        defect_code: str = "D-1001",
        departments: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Calls ML microservice to generate 7-bullet comparative explanation."""
        if self._is_service_likely_online():
            payload = {
                "recommended_window": recommended_window,
                "section": section,
                "defect_code": defect_code,
                "departments": departments
            }
            try:
                resp = self.client.post("/ml/explainer/comparative", json=payload)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                self._mark_unreachable(e)
        
        from ml.explainer import explainer
        return explainer.generate_canonical_comparative_explanation(
            recommended_window=recommended_window,
            section=section,
            defect_code=defect_code,
            departments=departments
        )

# Global singleton client
ml_client = MLServiceClient()
