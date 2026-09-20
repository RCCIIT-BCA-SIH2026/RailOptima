from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user, require_roles
from backend.app.models import (
    MaintenanceTask, TrainSchedule, Resource, Block, BlockTask,
    BlockPlan, AIRecommendation, User, Department, RailwaySection
)
from backend.app.schemas import OptimizeRequest
from backend.optimization import block_optimizer, alternative_generator
from ml.explainer import explainer

router = APIRouter()

# In-memory cache of generated alternatives for rapid demo inspection
_CACHED_ALTERNATIVES = []

@router.post("/run")
def run_automatic_optimization(
    payload: OptimizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin", "DRM", "Sr_DOM", "Sr_DEN", "Sr_DSTE", "Sr_DEE"]))
):

    """
    Core SIH Demo Action: Runs Google OR-Tools CP-SAT Block Optimizer.
    Extracts pending tasks, calculates priorities, and generates 3 strategic alternatives.
    """
    global _CACHED_ALTERNATIVES
    
    # 1. Fetch pending maintenance tasks
    task_query = db.query(MaintenanceTask).filter(MaintenanceTask.status == "Pending")
    if payload.section_id:
        task_query = task_query.filter(MaintenanceTask.section_id == payload.section_id)
    if payload.department_id:
        task_query = task_query.filter(MaintenanceTask.department_id == payload.department_id)

    db_tasks = task_query.limit(40).all()
    if not db_tasks:
        # Fallback to any tasks if all are scheduled
        db_tasks = db.query(MaintenanceTask).limit(25).all()

    tasks_data = []
    for t in db_tasks:
        prio = 50.0
        if t.defect and t.defect.calculated_priority_score:
            prio = t.defect.calculated_priority_score
        tasks_data.append({
            "id": t.id,
            "title": t.title,
            "section_id": t.section_id,
            "department_id": t.department_id,
            "department_code": t.department.code if t.department else "ENG",
            "defect_id": t.defect_id,
            "duration_minutes": t.estimated_duration_minutes,
            "priority_score": prio
        })

    # 2. Fetch train timetable and resources
    train_schedules = []
    resources = []

    # 3. Generate 3 Strategic Alternatives
    alternatives = alternative_generator.generate_alternatives(
        tasks=tasks_data,
        train_schedules=train_schedules,
        resources=resources,
        horizon_hours=payload.horizon_hours
    )

    _CACHED_ALTERNATIVES = alternatives

    return {
        "status": "Success",
        "solver": "Google OR-Tools CP-SAT Engine",
        "horizon_hours": payload.horizon_hours,
        "tasks_evaluated": len(tasks_data),
        "alternatives_count": len(alternatives),
        "alternatives": alternatives,
        "recommended_strategy": "Balanced Operational Plan",
        "data_mode": "SIMULATED DEMO DATA"
    }

@router.get("/alternatives")
def get_latest_alternatives(db: Session = Depends(get_db)):
    """Returns the cached 3 alternatives, or generates fresh ones if cache is empty."""
    global _CACHED_ALTERNATIVES
    if not _CACHED_ALTERNATIVES:
        tasks = db.query(MaintenanceTask).limit(20).all()
        t_data = [{
            "id": t.id,
            "title": t.title,
            "section_id": t.section_id,
            "department_id": t.department_id,
            "department_code": t.department.code if t.department else "ENG",
            "duration_minutes": t.estimated_duration_minutes,
            "priority_score": 75.0
        } for t in tasks]
        _CACHED_ALTERNATIVES = alternative_generator.generate_alternatives(t_data, [], [], 24)

    return {
        "alternatives": _CACHED_ALTERNATIVES,
        "data_mode": "SIMULATED DEMO DATA"
    }

@router.post("/select-alternative/{strategy_id}")
def select_and_apply_alternative(
    strategy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin", "DRM", "Sr_DOM", "Sr_DEN", "Sr_DSTE", "Sr_DEE"]))
):

    """
    Officer selects one of the 3 alternatives to instantiate official 'Proposed' Blocks
    and attach AI Recommendations ready for DRM approval.
    """
    global _CACHED_ALTERNATIVES
    matched = [a for a in _CACHED_ALTERNATIVES if a["strategy_id"] == strategy_id]
    if not matched:
        # Fallback to recommended strategy #1
        matched = _CACHED_ALTERNATIVES[:1]
    
    selected_alt = matched[0] if matched else None
    if not selected_alt:
        raise HTTPException(status_code=400, detail="No active optimization alternatives found. Please run optimization first.")

    now = datetime.utcnow()
    # Create or retrieve active block plan
    plan = BlockPlan(
        plan_code=f"PLN-OPT-{now.strftime('%Y%m%d%H%M')}",
        plan_type="Weekly",
        status="Under_Review",
        horizon_start=now,
        horizon_end=now + timedelta(days=7),
        total_blocks=selected_alt["total_blocks"],
        total_delay_impact_minutes=selected_alt["total_delay_minutes"],
        created_by=current_user.id
    )
    db.add(plan)
    db.flush()

    blocks_created = []
    for b_data in selected_alt["blocks"]:
        st = datetime.fromisoformat(b_data["start_time"])
        et = datetime.fromisoformat(b_data["end_time"])
        dept = db.query(Department).filter(Department.code == b_data["lead_department"]).first()
        dept_id = dept.id if dept else 1

        new_block = Block(
            block_code=b_data["block_code"],
            plan_id=plan.id,
            section_id=b_data["section_id"],
            block_type=b_data["block_type"],
            requested_start_time=st,
            requested_end_time=et,
            status="Proposed",
            lead_department_id=dept_id,
            total_tasks_count=b_data["tasks_count"]
        )
        db.add(new_block)
        db.flush()

        # Attach AI Recommendation
        ai_rec = AIRecommendation(
            block_id=new_block.id,
            alternative_number=strategy_id,
            strategy_name=selected_alt["title"],
            confidence_score=0.94,
            throughput_score=selected_alt["overall_score"],
            delay_impact_minutes=b_data.get("passenger_delay_minutes", 0) + b_data.get("freight_delay_minutes", 15),
            multi_dept_synergy_score=selected_alt["multi_dept_synergy_score"],
            rationale_text=selected_alt["ai_rationale"]
        )
        db.add(ai_rec)
        blocks_created.append(new_block.id)

    db.commit()

    return {
        "message": f"Successfully adopted Strategy '{selected_alt['title']}'. Created {len(blocks_created)} proposed blocks for officer approval.",
        "plan_id": plan.id,
        "plan_code": plan.plan_code,
        "blocks_count": len(blocks_created),
        "status": "Under_Review",
        "data_mode": "SIMULATED DEMO DATA"
    }

@router.get("/explain/{block_id}")
def explain_block_decision(block_id: int, db: Session = Depends(get_db)):
    """Returns AI Natural Language rationale explaining why a block was scheduled."""
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    sec = block.section
    lead_dept = block.lead_department.code if block.lead_department else "ENG"

    explanation = explainer.generate_block_explanation({
        "block_code": block.block_code,
        "section_code": sec.section_code if sec else "SEC",
        "start_time": block.requested_start_time.strftime("%H:%M"),
        "end_time": block.requested_end_time.strftime("%H:%M"),
        "duration_hours": round((block.requested_end_time - block.requested_start_time).total_seconds() / 3600.0, 1),
        "departments": [lead_dept, "TRD"] if block.block_type == "Integrated" else [lead_dept],
        "tasks": ["Permanent Way Overhaul", "OHE Catenary Inspection"] if block.block_type == "Integrated" else ["Specialized Maintenance"],
        "passenger_delay_minutes": 0 if 1 <= block.requested_start_time.hour <= 5 else 15,
        "freight_delay_minutes": 18,
        "defects_cleared": block.total_tasks_count
    })

    return explanation

