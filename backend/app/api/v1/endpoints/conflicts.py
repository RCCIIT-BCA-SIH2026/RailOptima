"""
Conflict Detection & Multi-Department Coordination API Endpoints.

Implements:
- GET /api/conflicts
- POST /api/conflicts/check
- POST /api/conflicts/{conflict_id}/resolve
- GET /api/coordination/opportunities
- POST /api/coordination/combine-blocks

SIMULATED DEMO DATA
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.app.api.deps import get_db, get_current_user
from backend.app.models import MaintenanceTask, Block, Department, RailwaySection, User
from backend.app.schemas.common import (
    ConflictListResponse,
    ConflictCheckRequest,
    ConflictCheckResponse,
    CoordinationOpportunitiesResponse,
    CombinedBlockRecommendation
)
from backend.conflicts.conflict_detector import RailwayConflictDetector
from backend.coordination.multi_dept_coordinator import MultiDepartmentCoordinator

router = APIRouter()


@router.get("", response_model=ConflictListResponse)
def get_all_conflicts(
    severity: Optional[str] = Query(None, description="Filter by severity: Critical, High, Medium, Low"),
    conflict_type: Optional[str] = Query(None, description="Filter by type: Maintenance_vs_Train, Maintenance_vs_Maintenance, Block_vs_Block, Department_vs_Department, Resource_vs_Resource, Safety_Conflict"),
    section_code: Optional[str] = Query(None, description="Filter by section code, e.g. NDLS-TKD-UP"),
    status: Optional[str] = Query(None, description="Filter by status: Open, Resolved, Mitigated"),
    db: Session = Depends(get_db)
):
    """
    Retrieves all detected conflicts across timetable, possessions, departmental requests,
    and heavy machinery allocations.
    """
    raw_result = RailwayConflictDetector.detect_all_conflicts(db=db, section_filter=section_code)
    conflicts = raw_result.get("conflicts", [])

    if severity:
        sev_clean = severity.strip().capitalize()
        conflicts = [c for c in conflicts if c.get("severity") == sev_clean]

    if conflict_type:
        conflicts = [c for c in conflicts if c.get("conflict_type") == conflict_type]

    if status:
        conflicts = [c for c in conflicts if c.get("status") == status]

    return {
        "summary": raw_result.get("summary", {}),
        "conflicts": conflicts,
        "data_mode": "SIMULATED DEMO DATA"
    }


@router.post("/check", response_model=ConflictCheckResponse)
def check_proposed_block_conflicts(
    payload: ConflictCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Validates a proposed block possession, maintenance task, or track closure
    against all 6 conflict categories before official dispatch/approval.
    """
    req_dict = payload.model_dump(exclude_unset=True)
    check_result = RailwayConflictDetector.check_proposed_schedule(req_dict)
    return check_result


@router.post("/{conflict_id}/resolve")
def resolve_conflict(
    conflict_id: str,
    action_code: Optional[str] = Query("APPLY_RECOMMENDED", description="Action code to apply"),
    db: Session = Depends(get_db)
):
    """
    Executes or simulates the recommended resolution for a specific conflict.
    """
    return {
        "conflict_id": conflict_id,
        "status": "Resolved",
        "action_applied": action_code,
        "message": f"Conflict {conflict_id} successfully mitigated via {action_code}.",
        "resolved_at": datetime.utcnow().isoformat(),
        "data_mode": "SIMULATED DEMO DATA"
    }


# =============================================================================
# MULTI-DEPARTMENT COORDINATION ENDPOINTS
# =============================================================================

coordination_router = APIRouter()


@coordination_router.get("/opportunities", response_model=CoordinationOpportunitiesResponse)
def get_coordination_opportunities(
    section_code: Optional[str] = Query("NDLS-TKD-UP", description="Corridor section code"),
    db: Session = Depends(get_db)
):
    """
    Identifies compatible maintenance tasks across Engineering (ENG), S&T, and Traction (TRD)
    that can be bundled into unified Integrated Shadow Blocks.
    """
    # Query pending tasks from database across departments
    db_tasks = db.query(MaintenanceTask).options(
        joinedload(MaintenanceTask.department),
        joinedload(MaintenanceTask.section)
    ).filter(MaintenanceTask.status.in_(["Pending", "Scheduled"])).limit(30).all()

    tasks_data = []
    for t in db_tasks:
        dept_code = t.department.code if t.department else "ENG"
        sec_code = t.section.section_code if t.section else section_code
        tasks_data.append({
            "task_code": t.task_code,
            "title": t.title,
            "department": dept_code,
            "section_code": sec_code,
            "duration_minutes": t.estimated_duration_minutes,
            "priority_score": 75,
            "criticality": t.criticality,
            "required_resources": t.required_resources
        })

    recommendations = MultiDepartmentCoordinator.find_compatible_task_clusters(
        tasks=tasks_data,
        target_section=section_code
    )

    total_hours_saved = sum(r.get("track_capacity_saved_hours", 0) for r in recommendations)

    return {
        "total_opportunities": len(recommendations),
        "total_track_hours_saved": round(total_hours_saved, 1),
        "recommendations": recommendations,
        "data_mode": "SIMULATED DEMO DATA"
    }


@coordination_router.post("/combine-blocks")
def combine_tasks_into_block(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Creates a formal Integrated Multi-Department Block from specified tasks.
    """
    tasks = payload.get("tasks", [])
    section_code = payload.get("section_code", "NDLS-TKD-UP")

    rec = MultiDepartmentCoordinator.get_canonical_example(section_code)
    return {
        "message": "Combined Integrated Shadow Block successfully formulated.",
        "block": rec,
        "data_mode": "SIMULATED DEMO DATA"
    }

