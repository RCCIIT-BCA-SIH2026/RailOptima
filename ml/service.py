"""
RailOptima ML & Optimization Microservice
==========================================
Standalone high-performance FastAPI service running on port 8001.
Hosts Scikit-Learn pipelines, XGBoost models, Weibull survival algorithms,
and Google OR-Tools CP-SAT constraint solvers.
"""

import os
import sys
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure ml directory is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.priority_engine import AIMaintenancePriorityEngine, AIPriorityEngine
from ml.predictive_maintenance import predictive_engine
from ml.train_delay_predictor import train_delay_engine
from ml.survival_engine import compute_survival_curve, predict_failure_risk_30d
from ml.duration_overrun_engine import predict_duration_and_overrun
from ml.explainer import explainer
from backend.optimization.block_optimizer import AutomaticBlockPlanningEngine
from backend.conflicts.conflict_detector import RailwayConflictDetector
from backend.coordination.multi_dept_coordinator import MultiDepartmentCoordinator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("railoptima.ml_service")

app = FastAPI(
    title="RailOptima ML & Optimization Microservice",
    version="2.0.0",
    description="Dedicated microservice for Indian Railways ML inference, predictive maintenance, train delay, survival curves, and CP-SAT optimization."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Request & Response Schemas
# -----------------------------------------------------------------------------

class TaskScoreRequest(BaseModel):
    task: Dict[str, Any]

class BacklogRankRequest(BaseModel):
    tasks: List[Dict[str, Any]]

class PredictiveMaintenanceInput(BaseModel):
    rail_wear_mm: Optional[float] = 1.5
    track_vibration_level: Optional[float] = 0.5
    wheel_wear_percent: Optional[float] = 40.0
    brake_pad_wear_percent: Optional[float] = 35.0
    brake_pressure_psi: Optional[float] = 85.0
    axle_temperature_c: Optional[float] = 45.0
    bearing_temperature_c: Optional[float] = 50.0
    battery_voltage: Optional[float] = 24.0
    sensor_health_index: Optional[float] = 85.0
    inspection_score: Optional[float] = 80.0
    train_age_years: Optional[float] = 6.0
    distance_travelled_km: Optional[float] = 50000.0
    average_speed_kmph: Optional[float] = 80.0
    delay_minutes: Optional[float] = 0.0
    last_maintenance_days: Optional[float] = 30.0
    ambient_temperature_c: Optional[float] = 28.0
    humidity_percent: Optional[float] = 60.0
    rainfall_mm: Optional[float] = 0.0
    region: Optional[str] = "Central"
    season: Optional[str] = "Summer"
    train_type: Optional[str] = "Superfast"
    asset_id: Optional[int] = None
    asset_code: Optional[str] = None
    department_code: Optional[str] = None

class TrainDelayInput(BaseModel):
    rainfall_mm: Optional[float] = 0.0
    humidity_percent: Optional[float] = 60.0
    ambient_temperature_c: Optional[float] = 28.0
    average_speed_kmph: Optional[float] = 80.0
    distance_travelled_km: Optional[float] = 100.0
    train_age_years: Optional[float] = 5.0
    last_maintenance_days: Optional[float] = 25.0
    season: Optional[str] = "Summer"
    region: Optional[str] = "Central"
    train_type: Optional[str] = "Superfast"
    scheduled_arrival: Optional[str] = None

class SurvivalInput(BaseModel):
    age_years: float = 18.0
    gmt_density: float = 45.0
    monsoon_exposure: str = "medium"
    curvature_class: str = "gentle"
    asset_type: str = "Track"
    defects_count: int = 0

class DurationOverrunInput(BaseModel):
    task_type: str = "Track Tamping"
    department: str = "ENG"
    crew_size: int = 15
    machinery_count: int = 1
    weather_condition: str = "Clear"
    claimed_duration_minutes: int = 120

class OptimizeBlocksInput(BaseModel):
    section: Optional[Any] = "NDLS-TKD-UP"
    date_range: Optional[Dict[str, Any]] = None
    maintenance_tasks: Optional[List[Dict[str, Any]]] = None
    train_schedule: Optional[List[Dict[str, Any]]] = None
    available_blocks: Optional[List[Dict[str, Any]]] = None
    resources: Optional[List[Dict[str, Any]]] = None
    existing_blocks: Optional[List[Dict[str, Any]]] = None
    goods_train_forecast: Optional[List[Dict[str, Any]]] = None
    passenger_train_traffic: Optional[List[Dict[str, Any]]] = None

class ExplainerInput(BaseModel):
    block_info: Optional[Dict[str, Any]] = None
    recommended_window: Optional[str] = "01:30 - 04:30"
    section: Optional[str] = "NDLS-TKD-UP"
    defect_code: Optional[str] = "D-1001"
    departments: Optional[List[str]] = None

# -----------------------------------------------------------------------------
# Microservice Endpoints
# -----------------------------------------------------------------------------

@app.get("/")
@app.get("/ml/health")
def health_check():
    return {
        "service": "RailOptima ML & Optimization Microservice",
        "status": "Healthy",
        "port": 8001,
        "models": {
            "predictive_maintenance": "Active (RandomForestClassifier Pipeline)",
            "train_delay_regressor": "Active (HistGradientBoostingRegressor Pipeline)",
            "survival_aft": "Active (Weibull AFT + XGBoost)",
            "duration_overrun": "Active (XGBoost)",
            "priority_engine": "Active (6-Factor Explainable)",
            "block_optimizer": "Active (Google OR-Tools CP-SAT)"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/ml/priority/score")
def score_maintenance_task(payload: TaskScoreRequest):
    """Calculates 6-factor explainable priority score for a single maintenance task."""
    try:
        result = AIMaintenancePriorityEngine.score_task(payload.task)
        return result
    except Exception as e:
        logger.error(f"Score calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/priority/defect-score")
def score_defect_priority(payload: Dict[str, Any]):
    """Calculates composite defect criticality score (0-100) based on severity, speed restriction, GMT, and health."""
    try:
        result = AIPriorityEngine.calculate_priority(payload)
        return result
    except Exception as e:
        logger.error(f"Defect score calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/priority/rank")
def rank_maintenance_tasks(payload: BacklogRankRequest):
    """Scores and ranks a list of maintenance tasks descending by priority."""
    try:
        ranked = AIMaintenancePriorityEngine.rank_tasks(payload.tasks)
        return {"ranked_tasks": ranked, "total": len(ranked)}
    except Exception as e:
        logger.error(f"Task ranking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/predictive-maintenance/predict")
def predict_asset_maintenance(payload: PredictiveMaintenanceInput):
    """Runs inference on trained Random Forest Predictive Maintenance pipeline."""
    try:
        features = payload.model_dump()
        result = predictive_engine.predict_maintenance(features)
        return result
    except Exception as e:
        logger.error(f"Predictive maintenance error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/train-delay/predict-eta")
def predict_train_delay_eta(payload: TrainDelayInput):
    """Runs inference on trained HistGradientBoosting Regressor and computes ETA."""
    try:
        features = payload.model_dump()
        sched_arr = payload.scheduled_arrival
        result = train_delay_engine.predict_eta(features, scheduled_arrival=sched_arr)
        return result
    except Exception as e:
        logger.error(f"Train delay prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/survival/predict-curve")
def predict_survival_curve(payload: SurvivalInput):
    """Computes 30-day discrete survival probability curve S(t) and RUL."""
    try:
        result = predict_failure_risk_30d(
            age_years=payload.age_years,
            gmt_density=payload.gmt_density,
            monsoon_exposure=payload.monsoon_exposure,
            curvature_class=payload.curvature_class,
            asset_type=payload.asset_type,
            defects_count=payload.defects_count
        )
        return result
    except Exception as e:
        logger.error(f"Survival curve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/duration-overrun/predict")
def predict_duration_and_overrun_risk(payload: DurationOverrunInput):
    """Estimates realistic duration and probability of exceeding scheduled block limits."""
    try:
        result = predict_duration_and_overrun(
            task_type=payload.task_type,
            department=payload.department,
            crew_size=payload.crew_size,
            machinery_count=payload.machinery_count,
            weather_condition=payload.weather_condition,
            claimed_duration_minutes=payload.claimed_duration_minutes
        )
        return result
    except Exception as e:
        logger.error(f"Duration overrun prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/optimization/optimize-blocks")
def optimize_blocks_cpsat(payload: OptimizeBlocksInput):
    """Solves multi-department corridor possession scheduling via Google OR-Tools CP-SAT."""
    try:
        result = AutomaticBlockPlanningEngine.optimize_blocks(
            section=payload.section,
            date_range=payload.date_range,
            maintenance_tasks=payload.maintenance_tasks,
            train_schedule=payload.train_schedule,
            available_blocks=payload.available_blocks,
            resources=payload.resources,
            existing_blocks=payload.existing_blocks,
            goods_train_forecast=payload.goods_train_forecast,
            passenger_train_traffic=payload.passenger_train_traffic
        )
        return result
    except Exception as e:
        logger.error(f"CP-SAT optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/explainer/comparative")
def generate_comparative_explanation(payload: ExplainerInput):
    """Generates canonical 7-bullet comparative explanations for block scheduling."""
    try:
        result = explainer.generate_canonical_comparative_explanation(
            recommended_window=payload.recommended_window or "01:30 - 04:30",
            section=payload.section or "NDLS-TKD-UP",
            defect_code=payload.defect_code or "D-1001",
            departments=payload.departments
        )
        return result
    except Exception as e:
        logger.error(f"Explainer error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/explainer/block")
def generate_single_block_explanation(payload: ExplainerInput):
    """Generates natural language rationale for a specific block allocation."""
    try:
        result = explainer.generate_block_explanation(payload.block_info or {})
        return result
    except Exception as e:
        logger.error(f"Block explanation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml.service:app", host="127.0.0.1", port=8001, reload=True)
