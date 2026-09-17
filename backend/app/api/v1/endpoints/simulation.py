from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.api.deps import get_db, get_current_user
from backend.app.models import WhatIfScenario, User
from backend.app.schemas import WhatIfRequest
from ml.delay_predictor import delay_predictor

router = APIRouter()

@router.post("/run")
def run_what_if_simulation(
    payload: WhatIfRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Simulates operational impact of changing operational parameters:
    - Freight traffic surge (+X%)
    - Sudden emergency defect insertions
    - Speed restriction penalties
    """
    surge = payload.freight_surge_pct
    emergencies = payload.emergency_defects_count
    speed_pen = payload.speed_restriction_pct

    # Estimate simulated impact
    base_delay = 45 + int(surge * 3.2) + (emergencies * 25) + int(speed_pen * 1.8)
    passenger_delay = max(0, int(base_delay * 0.28))
    freight_delay = base_delay - passenger_delay

    projected_conflicts = max(1, int((surge / 10.0) + emergencies))
    throughput_score = round(max(40.0, 95.0 - (surge * 0.4) - (emergencies * 5.0)), 1)
    punctuality = round(max(50.0, 96.0 - (passenger_delay * 0.4)), 1)

    result_metrics = {
        "projected_total_delay_minutes": base_delay,
        "passenger_delay_minutes": passenger_delay,
        "freight_delay_minutes": freight_delay,
        "projected_conflicts": projected_conflicts,
        "asset_throughput_score": throughput_score,
        "corridor_punctuality_projected_pct": punctuality,
        "recommendation": "Deploy Integrated Shadow Mega-Blocks between 01:00 and 04:30 to absorb freight surge without compromising passenger punctuality."
    }

    # Record scenario
    scenario = WhatIfScenario(
        name=payload.name,
        description=f"Simulated surge: {surge}%, emergencies: {emergencies}, speed reduction: {speed_pen}%",
        simulated_parameters=payload.model_dump(),
        result_metrics=result_metrics,
        created_by=current_user.id
    )
    db.add(scenario)
    db.commit()

    return {
        "scenario_id": scenario.id,
        "scenario_name": scenario.name,
        "parameters": payload.model_dump(),
        "metrics": result_metrics,
        "data_mode": "SIMULATED DEMO DATA"
    }

@router.get("/scenarios")
def get_recent_scenarios(db: Session = Depends(get_db)):
    scenarios = db.query(WhatIfScenario).order_by(WhatIfScenario.created_at.desc()).limit(10).all()
    return scenarios

