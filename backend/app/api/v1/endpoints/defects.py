from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import math
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func

from backend.app.api.deps import (
    get_db,
    get_current_user_optional,
    check_department_access,
    get_effective_department_filter,
    normalize_department
)
from backend.app.models import Defect, Department, RailwaySection, Asset, User
from backend.app.schemas import (
    DefectCreate,
    DefectUpdate,
    DefectResponse,
    DefectListResponse,
    DefectStatisticsResponse
)
from backend.app.core.ml_client import ml_client
from backend.app.services.duplicate_detection import assess_duplicate, DEFAULT_POLICY

router = APIRouter()

def serialize_defect(d: Defect) -> Dict[str, Any]:
    return {
        "id": d.id,
        "defect_code": d.defect_code,
        "asset_id": d.asset_id,
        "department_id": d.department_id,
        "section_id": d.section_id,
        "location": d.location or (f"KM {d.section.section_code}" if d.section else "Nagpur Division Main Line"),
        "defect_type": d.defect_type,
        "description": d.description or f"{d.severity} {d.defect_type} recorded via automated track telemetry.",
        "severity": d.severity,
        "criticality": d.criticality or ("P0 - Emergency" if d.severity == "Critical" else "P1 - Urgent"),
        "reported_at": d.reported_at,
        "due_date": d.due_date,
        "estimated_repair_duration_minutes": d.estimated_repair_duration_minutes or 120,
        "reported_by_system": d.reported_by_system,
        "status": d.status,
        "calculated_priority_score": d.calculated_priority_score,
        "speed_restriction_imposed": d.speed_restriction_imposed,
        "department_code": d.department.code if d.department else "ENG",
        "section_code": d.section.section_code if d.section else "SEC",
        "asset_code": d.asset.asset_code if d.asset else None,
        "asset_name": d.asset.asset_name if d.asset else None
    }

@router.get("/statistics", response_model=DefectStatisticsResponse)
def get_defect_statistics(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Computes aggregated dashboard KPI statistics for defect backlog management (scoped by role/department)."""
    base_query = db.query(Defect)
    eff_dept = get_effective_department_filter(current_user)
    if eff_dept:
        dept_obj = db.query(Department).filter(Department.code == eff_dept).first()
        if dept_obj:
            base_query = base_query.filter(Defect.department_id == dept_obj.id)

    total_defects = base_query.count()
    open_count = base_query.filter(Defect.status == "Open").count()
    investigating = base_query.filter(Defect.status == "Investigating").count()
    scheduled = base_query.filter(Defect.status == "Scheduled").count()
    resolved = base_query.filter(Defect.status.in_(["Resolved", "Closed"])).count()

    critical_p0 = base_query.filter(or_(Defect.severity == "Critical", Defect.criticality.ilike("%P0%"))).count()
    urgent_p1 = base_query.filter(or_(Defect.severity == "Major", Defect.criticality.ilike("%P1%"))).count()

    speed_restrictions = base_query.filter(Defect.speed_restriction_imposed > 0).count()
    avg_score = base_query.with_entities(func.avg(Defect.calculated_priority_score)).scalar() or 50.0

    # System source distribution
    src_query = db.query(Defect.reported_by_system, func.count(Defect.id))
    if eff_dept and dept_obj:
        src_query = src_query.filter(Defect.department_id == dept_obj.id)
    src_counts = src_query.group_by(Defect.reported_by_system).all()
    src_map = {src or "TMS": cnt for src, cnt in src_counts}

    # Department breakdown
    dept_query = db.query(Department.code, func.count(Defect.id)).join(Defect, Defect.department_id == Department.id)
    if eff_dept and dept_obj:
        dept_query = dept_query.filter(Defect.department_id == dept_obj.id)
    dept_counts = dept_query.group_by(Department.code).all()
    dept_map = {code: cnt for code, cnt in dept_counts}

    return {
        "total_defects": total_defects,
        "open_count": open_count,
        "investigating_count": investigating,
        "scheduled_count": scheduled,
        "resolved_count": resolved,
        "critical_p0_count": critical_p0,
        "urgent_p1_count": urgent_p1,
        "speed_restrictions_count": speed_restrictions,
        "avg_priority_score": round(float(avg_score), 1),
        "system_source_breakdown": src_map,
        "department_breakdown": dept_map
    }

@router.get("", response_model=Union[DefectListResponse, List[DefectResponse]])
@router.get("/backlog", response_model=Union[DefectListResponse, List[DefectResponse]])
def get_defects(
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=100),
    limit: Optional[int] = Query(None, ge=1, le=200),
    search: Optional[str] = Query(None, description="Search defect code, type, description, location"),
    department: Optional[str] = Query(None, description="Filter by department code (ENG, S&T, TRD)"),
    department_id: Optional[int] = Query(None, description="Filter by department ID (1=ENG, 2=SNT, 3=TRD)"),
    severity: Optional[str] = Query(None, description="Filter by severity (Critical, Major, Minor)"),
    criticality: Optional[str] = Query(None, description="Filter by criticality (P0, P1, P2, P3)"),
    status: Optional[str] = Query(None, description="Filter by status (Open, Investigating, Scheduled, Resolved)"),
    has_speed_restriction: Optional[bool] = Query(None, description="Filter defects causing speed restriction"),
    sort_by: str = Query("calculated_priority_score", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Fetches paginated, filtered, searched, and sorted defects with AI priority ranking and department RBAC."""
    query = db.query(Defect)

    # 1. Never trust department_id supplied by frontend: validate against user department
    if department_id is not None:
        dept_obj = db.query(Department).filter(Department.id == department_id).first()
        if not dept_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Department with ID {department_id} not found.")
        check_department_access(dept_obj.code, current_user)
        department = dept_obj.code

    # Department RBAC enforcement
    eff_dept = get_effective_department_filter(current_user, department)
    if eff_dept:
        dept = db.query(Department).filter(Department.code == eff_dept).first()
        if dept:
            query = query.filter(Defect.department_id == dept.id)

    if severity and severity != "ALL":
        query = query.filter(Defect.severity == severity)

    if criticality and criticality != "ALL":
        query = query.filter(Defect.criticality.ilike(f"%{criticality}%"))

    if status and status != "ALL":
        query = query.filter(Defect.status == status)

    if has_speed_restriction is True:
        query = query.filter(Defect.speed_restriction_imposed > 0)
    elif has_speed_restriction is False:
        query = query.filter(Defect.speed_restriction_imposed == 0)

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Defect.defect_code.ilike(search_filter),
                Defect.defect_type.ilike(search_filter),
                Defect.description.ilike(search_filter),
                Defect.location.ilike(search_filter)
            )
        )

    total = query.count()

    # Apply sorting
    sort_column = getattr(Defect, sort_by, Defect.calculated_priority_score)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    # Support legacy unpaginated limit request
    if limit is not None and page is None:
        defects = query.limit(limit).all()
        return [serialize_defect(d) for d in defects]

    effective_page = page or 1
    effective_page_size = page_size or 10
    offset = (effective_page - 1) * effective_page_size
    defects = query.offset(offset).limit(effective_page_size).all()

    total_pages = max(1, math.ceil(total / effective_page_size))

    return {
        "items": [serialize_defect(d) for d in defects],
        "total": total,
        "page": effective_page,
        "page_size": effective_page_size,
        "total_pages": total_pages
    }

@router.get("/{defect_id}", response_model=DefectResponse)
def get_defect_detail(
    defect_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Retrieves full details of a specific defect with department RBAC protection."""
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Defect with ID {defect_id} not found."
        )
    check_department_access(defect.department.code if defect.department else None, current_user)
    return serialize_defect(defect)

@router.post("", response_model=DefectResponse, status_code=status.HTTP_201_CREATED)
def create_defect(
    payload: DefectCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Logs a new defect, generating IR defect code and initial AI priority score with department RBAC."""
    # Enforce department access
    target_dept_code = payload.department_code or "ENG"
    check_department_access(target_dept_code, current_user)

    # Resolve department
    dept_id = payload.department_id
    if not dept_id:
        dept = db.query(Department).filter(Department.code == target_dept_code).first()
        if not dept:
            dept = db.query(Department).first()
        dept_id = dept.id if dept else 1

    dept_code = target_dept_code

    # Auto-resolve asset_id if not explicitly provided
    asset_id = payload.asset_id
    if not asset_id:
        asset_obj = db.query(Asset).filter(Asset.department_id == dept_id).first()
        if asset_obj:
            asset_id = asset_obj.id

    now = datetime.utcnow()
    rand_seq = db.query(Defect).count() + 1
    defect_code = f"DEF-{dept_code}-{now.year}-{rand_seq:04d}"

    section_id = payload.section_id
    if not section_id:
        first_sec = db.query(RailwaySection).first()
        section_id = first_sec.id if first_sec else 1

    due = payload.due_date or (now + timedelta(days=1 if payload.severity == "Critical" else 3))

    # Calculate initial AI priority score via ML Microservice
    score_data = ml_client.calculate_defect_priority({
        "severity": payload.severity or "Major",
        "speed_restriction_imposed": payload.speed_restriction_imposed or 0,
        "max_permissible_speed": 130,
        "traffic_density_gmt": 45.0,
        "asset_health": 75.0,
        "hours_open": 1.0,
        "department_code": dept_code
    })

    new_defect = Defect(
        defect_code=defect_code,
        asset_id=asset_id,
        department_id=dept_id,
        section_id=section_id,
        location=payload.location or "Nagpur - Wardha Section KM 824/18",
        defect_type=payload.defect_type,
        description=payload.description or f"{payload.severity} flaw in track component requiring remedial engineering.",
        severity=payload.severity or "Major",
        criticality=payload.criticality or ("P0 - Emergency" if payload.severity == "Critical" else "P1 - Urgent"),
        reported_at=now,
        due_date=due,
        estimated_repair_duration_minutes=payload.estimated_repair_duration_minutes or 120,
        reported_by_system=payload.reported_by_system or "TMS",
        status=payload.status or "Open",
        calculated_priority_score=score_data["priority_score"],
        speed_restriction_imposed=payload.speed_restriction_imposed or 0
    )

    db.add(new_defect)
    db.commit()
    db.refresh(new_defect)

    # ── Advisory Duplicate Detection (Pashupatastra-inspired) ──────────────
    # Runs AFTER the defect is saved. Advisory only — never blocks or modifies.
    duplicate_advisory = {"has_likely_duplicates": False, "advisory": "", "candidates": []}
    try:
        recent_open = (
            db.query(Defect)
            .filter(
                Defect.status.notin_(["Resolved", "Closed", "Cancelled"]),
                Defect.id != new_defect.id,
            )
            .order_by(desc(Defect.reported_at))
            .limit(20)
            .all()
        )
        existing_dicts = [
            {
                "id": d.id,
                "defect_code": d.defect_code,
                "department_id": d.department_id,
                "section_id": d.section_id,
                "severity": d.severity,
                "defect_type": d.defect_type,
                "location": d.location,
                "reported_at": d.reported_at,
                "status": d.status,
            }
            for d in recent_open
        ]
        new_dict = {
            "department_id": new_defect.department_id,
            "section_id": new_defect.section_id,
            "severity": new_defect.severity,
            "defect_type": new_defect.defect_type,
            "location": new_defect.location,
        }
        assessment = assess_duplicate(new_dict, existing_dicts, reported_at=now, policy=DEFAULT_POLICY)
        duplicate_advisory = assessment.to_dict()
    except Exception as _dup_err:
        pass  # advisory failure must never break defect creation

    serialised = serialize_defect(new_defect)
    serialised["duplicate_advisory"] = duplicate_advisory
    return serialised

@router.put("/{defect_id}", response_model=DefectResponse)
def update_defect(
    defect_id: int,
    payload: DefectUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Updates defect properties and recalculates AI priority score if severity or speed restriction changes."""
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Defect with ID {defect_id} not found."
        )
    check_department_access(defect.department.code if defect.department else None, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    recalculate_score = False

    if "severity" in update_data and update_data["severity"] != defect.severity:
        recalculate_score = True
    if "speed_restriction_imposed" in update_data and update_data["speed_restriction_imposed"] != defect.speed_restriction_imposed:
        recalculate_score = True

    for field, value in update_data.items():
        if value is not None:
            setattr(defect, field, value)

    if recalculate_score:
        dept_code = defect.department.code if defect.department else "ENG"
        now = datetime.utcnow()
        hours_open = max(1.0, (now - defect.reported_at).total_seconds() / 3600.0)
        score_data = ml_client.calculate_defect_priority({
            "severity": defect.severity,
            "speed_restriction_imposed": defect.speed_restriction_imposed or 0,
            "max_permissible_speed": 130,
            "traffic_density_gmt": 45.0,
            "asset_health": defect.asset.health_score if defect.asset else 75.0,
            "hours_open": hours_open,
            "department_code": dept_code
        })
        defect.calculated_priority_score = score_data["priority_score"]

    db.commit()
    db.refresh(defect)
    return serialize_defect(defect)

@router.delete("/{defect_id}", status_code=status.HTTP_200_OK)
def delete_defect(
    defect_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Deletes a defect from the system."""
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Defect with ID {defect_id} not found."
        )
    check_department_access(defect.department.code if defect.department else None, current_user)

    defect_code = defect.defect_code
    db.delete(defect)
    db.commit()
    return {
        "status": "success",
        "message": f"Defect {defect_code} (ID {defect_id}) deleted successfully."
    }

@router.post("/recalculate-priority")
@router.post("/recalculate-priorities")
def recalculate_ai_priorities(db: Session = Depends(get_db)):
    """Triggers AI Priority Engine to recalculate criticality scores for all open defects."""
    open_defects = db.query(Defect).filter(Defect.status.in_(["Open", "Scheduled", "Investigating"])).all()
    updated_count = 0
    now = datetime.utcnow()

    for d in open_defects:
        hours_open = max(1.0, (now - d.reported_at).total_seconds() / 3600.0)
        dept_code = d.department.code if d.department else "ENG"
        max_speed = d.section.max_permissible_speed if d.section else 130
        gmt = d.section.current_traffic_density if d.section else 45.0
        health = d.asset.health_score if d.asset else 80.0

        score_data = ml_client.calculate_defect_priority({
            "severity": d.severity,
            "speed_restriction_imposed": d.speed_restriction_imposed,
            "max_permissible_speed": max_speed,
            "traffic_density_gmt": gmt,
            "asset_health": health,
            "hours_open": hours_open,
            "department_code": dept_code
        })

        d.calculated_priority_score = score_data["priority_score"]
        updated_count += 1

    db.commit()
    return {
        "message": f"Successfully recalculated AI priority scores for {updated_count} active defects.",
        "defects_evaluated": updated_count,
        "engine": "AIPriorityEngine v1.0",
        "data_mode": "LIVE ML MICROSERVICE"
    }
