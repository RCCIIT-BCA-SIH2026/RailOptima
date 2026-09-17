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
from backend.app.models import MaintenanceTask, Department, RailwaySection, Asset, Defect, User
from backend.app.schemas import (
    MaintenanceTaskCreate,
    MaintenanceTaskUpdate,
    MaintenanceTaskResponse,
    MaintenanceTaskListResponse,
    MaintenanceStatisticsResponse
)

router = APIRouter()

def serialize_task(t: MaintenanceTask) -> Dict[str, Any]:
    return {
        "id": t.id,
        "task_code": t.task_code,
        "title": t.title,
        "asset_id": t.asset_id,
        "defect_id": t.defect_id,
        "department_id": t.department_id,
        "section_id": t.section_id,
        "location": t.location or (f"KM {t.section.section_code}" if t.section else "Nagpur Division Main Line"),
        "task_type": t.task_type or "Track Maintenance",
        "description": t.description or t.title,
        "criticality": t.criticality or "Medium",
        "urgency": t.urgency or "Within 3 Days",
        "safety_impact": t.safety_impact or "Low",
        "estimated_duration_minutes": t.estimated_duration_minutes,
        "required_resources": t.required_resources or "1x Maintenance Gang",
        "due_date": t.due_date,
        "required_track_possession": t.required_track_possession,
        "required_power_block": t.required_power_block,
        "required_traffic_block": t.required_traffic_block,
        "status": t.status,
        "created_at": t.created_at,
        "department_code": t.department.code if t.department else "ENG",
        "section_code": t.section.section_code if t.section else "SEC",
        "asset_code": t.asset.asset_code if t.asset else None,
        "asset_name": t.asset.asset_name if t.asset else None
    }

@router.get("/statistics", response_model=MaintenanceStatisticsResponse)
def get_maintenance_statistics(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Computes aggregated dashboard KPI statistics for maintenance management (scoped by role/department)."""
    base_query = db.query(MaintenanceTask)
    eff_dept = get_effective_department_filter(current_user)
    if eff_dept:
        dept_obj = db.query(Department).filter(Department.code == eff_dept).first()
        if dept_obj:
            base_query = base_query.filter(MaintenanceTask.department_id == dept_obj.id)

    total_tasks = base_query.count()
    pending = base_query.filter(MaintenanceTask.status == "Pending").count()
    scheduled = base_query.filter(MaintenanceTask.status == "Scheduled").count()
    in_progress = base_query.filter(MaintenanceTask.status == "In_Progress").count()
    completed = base_query.filter(MaintenanceTask.status == "Completed").count()

    critical = base_query.filter(MaintenanceTask.criticality == "Critical").count()
    high = base_query.filter(MaintenanceTask.criticality == "High").count()

    avg_duration = base_query.with_entities(func.avg(MaintenanceTask.estimated_duration_minutes)).scalar() or 120.0

    # Department breakdown
    dept_query = (
        db.query(Department.code, func.count(MaintenanceTask.id))
        .join(MaintenanceTask, MaintenanceTask.department_id == Department.id)
    )
    if eff_dept and dept_obj:
        dept_query = dept_query.filter(MaintenanceTask.department_id == dept_obj.id)
    dept_counts = dept_query.group_by(Department.code).all()
    dept_map = {code: count for code, count in dept_counts}

    return {
        "total_tasks": total_tasks,
        "pending_count": pending,
        "scheduled_count": scheduled,
        "in_progress_count": in_progress,
        "completed_count": completed,
        "critical_count": critical,
        "high_count": high,
        "avg_duration_minutes": round(float(avg_duration), 1),
        "department_breakdown": dept_map
    }

@router.get("/tasks", response_model=Union[MaintenanceTaskListResponse, List[MaintenanceTaskResponse]])
@router.get("", response_model=Union[MaintenanceTaskListResponse, List[MaintenanceTaskResponse]])
def get_maintenance_tasks(
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=100),
    limit: Optional[int] = Query(None, ge=1, le=200),
    search: Optional[str] = Query(None, description="Search task code, title, description, location"),
    department: Optional[str] = Query(None, description="Filter by department code (ENG, S&T, TRD)"),
    department_id: Optional[int] = Query(None, description="Filter by department ID (1=ENG, 2=SNT, 3=TRD)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    criticality: Optional[str] = Query(None, description="Filter by criticality (Critical, High, Medium, Low)"),
    urgency: Optional[str] = Query(None, description="Filter by urgency"),
    sort_by: str = Query("id", description="Sort field (id, due_date, estimated_duration_minutes, criticality, created_at)"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Fetches paginated, filtered, searched, and sorted maintenance work orders with department RBAC."""
    query = db.query(MaintenanceTask)

    # 1. Never trust department_id supplied by frontend: validate against user department
    if department_id is not None:
        dept_obj = db.query(Department).filter(Department.id == department_id).first()
        if not dept_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Department with ID {department_id} not found.")
        check_department_access(dept_obj.code, current_user)
        department = dept_obj.code

    eff_dept = get_effective_department_filter(current_user, department)
    if eff_dept:
        dept = db.query(Department).filter(Department.code == eff_dept).first()
        if dept:
            query = query.filter(MaintenanceTask.department_id == dept.id)

    if status and status != "ALL":
        query = query.filter(MaintenanceTask.status == status)

    if criticality and criticality != "ALL":
        query = query.filter(MaintenanceTask.criticality == criticality)

    if urgency and urgency != "ALL":
        query = query.filter(MaintenanceTask.urgency == urgency)

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                MaintenanceTask.task_code.ilike(search_filter),
                MaintenanceTask.title.ilike(search_filter),
                MaintenanceTask.description.ilike(search_filter),
                MaintenanceTask.location.ilike(search_filter),
                MaintenanceTask.task_type.ilike(search_filter)
            )
        )

    total = query.count()

    # Apply sorting
    sort_column = getattr(MaintenanceTask, sort_by, MaintenanceTask.id)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    # Support legacy unpaginated limit request
    if limit is not None and page is None:
        tasks = query.limit(limit).all()
        return [serialize_task(t) for t in tasks]

    effective_page = page or 1
    effective_page_size = page_size or 10
    offset = (effective_page - 1) * effective_page_size
    tasks = query.offset(offset).limit(effective_page_size).all()

    total_pages = max(1, math.ceil(total / effective_page_size))

    return {
        "items": [serialize_task(t) for t in tasks],
        "total": total,
        "page": effective_page,
        "page_size": effective_page_size,
        "total_pages": total_pages
    }

@router.get("/tasks/{task_id}", response_model=MaintenanceTaskResponse)
@router.get("/{task_id}", response_model=MaintenanceTaskResponse)
def get_maintenance_task_detail(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Retrieves full details of a specific maintenance task with department RBAC protection."""
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance task with ID {task_id} not found."
        )
    check_department_access(task.department.code if task.department else None, current_user)
    return serialize_task(task)

@router.post("/tasks", response_model=MaintenanceTaskResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=MaintenanceTaskResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_task(
    payload: MaintenanceTaskCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Creates a new maintenance task with auto-generated IR task code and department RBAC."""
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

    # Generate unique task code
    now = datetime.utcnow()
    rand_seq = db.query(MaintenanceTask).count() + 1
    task_code = f"TSK-{dept_code}-{now.year}-{rand_seq:04d}"

    # Auto section assignment if not given
    section_id = payload.section_id
    if not section_id:
        first_sec = db.query(RailwaySection).first()
        section_id = first_sec.id if first_sec else 1

    # Auto asset assignment if not given
    asset_id = payload.asset_id
    if not asset_id:
        asset_obj = db.query(Asset).filter(Asset.department_id == dept_id).first()
        if asset_obj:
            asset_id = asset_obj.id

    due = payload.due_date or (now + timedelta(days=3))

    new_task = MaintenanceTask(
        task_code=task_code,
        title=payload.title,
        asset_id=asset_id,
        defect_id=payload.defect_id,
        department_id=dept_id,
        section_id=section_id,
        location=payload.location or "Nagpur - Wardha Section KM 824/15",
        task_type=payload.task_type or "Track Maintenance",
        description=payload.description or payload.title,
        criticality=payload.criticality or "Medium",
        urgency=payload.urgency or "Within 3 Days",
        safety_impact=payload.safety_impact or "Low",
        estimated_duration_minutes=payload.estimated_duration_minutes or 120,
        required_resources=payload.required_resources or "1x Track Machine, 10 Trackmen",
        due_date=due,
        required_track_possession=payload.required_track_possession,
        required_power_block=payload.required_power_block,
        required_traffic_block=payload.required_traffic_block,
        status=payload.status or "Pending",
        created_at=now
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return serialize_task(new_task)

@router.put("/tasks/{task_id}", response_model=MaintenanceTaskResponse)
@router.put("/{task_id}", response_model=MaintenanceTaskResponse)
def update_maintenance_task(
    task_id: int,
    payload: MaintenanceTaskUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Updates an existing maintenance task's attributes and execution status."""
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance task with ID {task_id} not found."
        )
    check_department_access(task.department.code if task.department else None, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return serialize_task(task)

@router.delete("/tasks/{task_id}", status_code=status.HTTP_200_OK)
@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_maintenance_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Deletes a maintenance task from the system."""
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance task with ID {task_id} not found."
        )
    check_department_access(task.department.code if task.department else None, current_user)

    task_code = task.task_code
    db.delete(task)
    db.commit()
    return {
        "status": "success",
        "message": f"Maintenance task {task_code} (ID {task_id}) deleted successfully."
    }
