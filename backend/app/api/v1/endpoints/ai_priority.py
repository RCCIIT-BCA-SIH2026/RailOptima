from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc

from backend.app.core.database import get_db
from backend.app.models.defect import MaintenanceTask, Defect, AIPriorityRecommendation
from backend.app.models.asset import Asset
from backend.app.models.infrastructure import RailwaySection
from backend.app.models.user import Department, User, AuditLog
from backend.app.models.block import Block, AIRecommendation
from backend.app.models.train import Train
from backend.app.schemas.common import (
    AIPriorityRequest,
    AIPriorityResponse,
    AIPrioritiesListResponse,
    AIPriorityRecommendationItem,
    AIPriorityRecommendationsResponse,
    AIOptimizeBlocksRequest,
    AIOptimizeBlocksResponse,
    PredictiveMaintenanceRequest,
    PredictiveMaintenanceResponse,
    TrainDelayPredictionRequest,
    TrainDelayPredictionResponse
)
from backend.app.core.ml_client import ml_client
from backend.app.api.deps import get_current_user_optional, check_department_access, normalize_role

router = APIRouter()


def _extract_task_dict_from_db(task: MaintenanceTask) -> Dict[str, Any]:
    """Helper to convert MaintenanceTask ORM object into dictionary for AI scoring."""
    asset_type = task.asset.asset_type if task.asset else None
    asset_health = task.asset.health_score if task.asset else 80.0
    asset_status = task.asset.status if task.asset else "Operational"
    
    traffic_density = task.section.current_traffic_density if task.section else 50.0
    line_capacity = task.section.line_capacity if task.section else 60
    section_code = task.section.section_code if task.section else "NDLS-BPL"

    speed_rest = 0.0
    defect_sev = None
    if task.defect:
        speed_rest = float(task.defect.speed_restriction_imposed or 0.0)
        defect_sev = task.defect.severity

    dept_code = task.department.code if task.department else "ENG"

    return {
        "id": task.id,
        "task_code": task.task_code,
        "title": task.title,
        "task_type": task.task_type,
        "criticality": task.criticality,
        "urgency": task.urgency,
        "safety_impact": task.safety_impact,
        "due_date": task.due_date,
        "estimated_duration_minutes": task.estimated_duration_minutes,
        "required_traffic_block": task.required_traffic_block,
        "required_power_block": task.required_power_block,
        "status": task.status,
        "location": task.location,
        "department_code": dept_code,
        "department": dept_code,
        "asset_id": task.asset_id,
        "asset_type": asset_type,
        "asset_health": asset_health,
        "asset_status": asset_status,
        "section_id": task.section_id,
        "section_code": section_code,
        "traffic_density_gmt": traffic_density,
        "line_capacity": line_capacity,
        "speed_restriction_imposed": speed_rest,
        "defect_severity": defect_sev
    }

@router.post("/priority", response_model=AIPriorityResponse)
def calculate_task_priority(
    payload: Optional[AIPriorityRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Computes explainable 6-factor AI priority score (0-100) for a maintenance task.
    Accepts either an existing task_id / task_code, or an ad-hoc custom payload.
    """
    task_dict = {}
    
    if payload and (payload.task_id or payload.task_code):
        # 1. Search in MaintenanceTask
        task_query = db.query(MaintenanceTask).options(
            joinedload(MaintenanceTask.asset),
            joinedload(MaintenanceTask.defect),
            joinedload(MaintenanceTask.section),
            joinedload(MaintenanceTask.department)
        )
        task_obj = None
        if payload.task_id:
            task_obj = task_query.filter(MaintenanceTask.id == payload.task_id).first()
        elif payload.task_code:
            task_obj = task_query.filter(MaintenanceTask.task_code.ilike(payload.task_code.strip())).first()

        if task_obj:
            task_dict = _extract_task_dict_from_db(task_obj)
        else:
            # 2. Check if task_code matches a Defect code (e.g. 'D-1001' or 'DEF-ENG-2026-0001')
            if payload.task_code:
                defect_obj = db.query(Defect).options(
                    joinedload(Defect.asset),
                    joinedload(Defect.section),
                    joinedload(Defect.department)
                ).filter(
                    or_(
                        Defect.defect_code.ilike(payload.task_code.strip()),
                        Defect.id == int(payload.task_code.replace("D-", "")) if payload.task_code.startswith("D-") and payload.task_code[2:].isdigit() else False
                    )
                ).first()

                if defect_obj:
                    task_dict = {
                        "id": None,
                        "task_code": payload.task_code,
                        "title": f"Rectification: {defect_obj.defect_type}",
                        "task_type": defect_obj.defect_type,
                        "criticality": defect_obj.criticality or "Critical",
                        "urgency": "Immediate" if defect_obj.severity == "Critical" else "Within 24 Hours",
                        "safety_impact": "Derailment Risk" if defect_obj.severity == "Critical" else "Speed Restriction",
                        "due_date": defect_obj.due_date,
                        "estimated_duration_minutes": defect_obj.estimated_repair_duration_minutes or 180,
                        "required_traffic_block": True,
                        "required_power_block": True,
                        "status": defect_obj.status,
                        "location": defect_obj.location,
                        "department_code": defect_obj.department.code if defect_obj.department else "ENG",
                        "department": defect_obj.department.code if defect_obj.department else "ENG",
                        "asset_id": defect_obj.asset_id,
                        "asset_type": defect_obj.asset.asset_type if defect_obj.asset else "Turnout Point Machine",
                        "asset_health": defect_obj.asset.health_score if defect_obj.asset else 35.0,
                        "asset_status": defect_obj.asset.status if defect_obj.asset else "Critical",
                        "traffic_density_gmt": defect_obj.section.current_traffic_density if defect_obj.section else 55.0,
                        "line_capacity": defect_obj.section.line_capacity if defect_obj.section else 60,
                        "speed_restriction_imposed": defect_obj.speed_restriction_imposed or 0,
                        "defect_severity": defect_obj.severity
                    }
                elif payload.task_code.strip().upper() in ["D-1001", "TASK D-1001", "TASK-D-1001"]:
                    task_dict = {
                        "id": None,
                        "task_code": "D-1001",
                        "title": "Turnout Point Machine Detection Overhaul & USFD Flaw Rectification",
                        "task_type": "Point Machine Overhaul",
                        "criticality": "Critical",
                        "urgency": "Immediate",
                        "safety_impact": "Derailment Risk",
                        "due_date": (datetime.utcnow() - timedelta(days=2)).isoformat(),
                        "is_overdue": True,
                        "estimated_duration_minutes": 180,
                        "required_traffic_block": True,
                        "required_power_block": True,
                        "status": "Pending",
                        "location": "NDLS-TKD-UP",
                        "department_code": "ENG",
                        "department": "ENG",
                        "asset_id": 1,
                        "asset_type": "Turnout Point Machine",
                        "asset_health": 35.0,
                        "asset_status": "Critical",
                        "traffic_density_gmt": 62.0,
                        "line_capacity": 64,
                        "speed_restriction_imposed": 30,
                        "defect_severity": "Critical"
                    }

    # If payload provided ad-hoc fields, overlay or populate them
    if payload:
        payload_data = payload.model_dump(exclude_unset=True)
        for k, v in payload_data.items():
            if v is not None:
                task_dict[k] = v

    # If still empty or no task code, provide realistic default structure
    if not task_dict:
        task_dict = {
            "task_code": "TSK-AI-PREVIEW",
            "title": "Mainline Turnout Tamping & Ultrasonic Flaw Rectification",
            "criticality": "Critical",
            "urgency": "Immediate",
            "safety_impact": "Derailment Risk",
            "due_date": datetime.utcnow().isoformat(),
            "is_overdue": True,
            "estimated_duration_minutes": 180,
            "required_traffic_block": True,
            "required_power_block": True,
            "traffic_density_gmt": 58.0,
            "asset_type": "Point Machine",
            "asset_health": 38.0
        }

    # Execute explainable scoring
    result = ml_client.score_task(task_dict)

    # Persist AI recommendation in PostgreSQL database
    try:
        rec = AIPriorityRecommendation(
            task_id=task_dict.get("id"),
            task_code=task_dict.get("task_code") or result["task"].get("task_code"),
            title=task_dict.get("title") or result["task"].get("title"),
            department_code=task_dict.get("department_code") or task_dict.get("department") or "ENG",
            priority_score=result["priority_score"],
            priority_level=result["priority_level"],
            criticality=str(task_dict.get("criticality") or ""),
            urgency=str(task_dict.get("urgency") or ""),
            safety_impact=str(task_dict.get("safety_impact") or ""),
            asset_availability_impact=str(task_dict.get("asset_availability_impact") or ""),
            overdue_status=str(task_dict.get("overdue_status") or ("Overdue" if task_dict.get("is_overdue") else "Within SLA")),
            operational_impact=str(task_dict.get("operational_impact") or ""),
            reasons=result["reasons"],
            factor_breakdown=result["factor_breakdown"],
            recommended_window=(
                "Immediate (< 12 hours)" if result["priority_level"] == "Critical"
                else ("Within 24-48 hours" if result["priority_level"] == "High"
                else "Scheduled Weekly Block")
            )
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        result["recommendation_id"] = rec.id
    except Exception as e:
        db.rollback()

    return result

@router.get("/priorities", response_model=AIPrioritiesListResponse)
def get_maintenance_priorities(
    level: Optional[str] = Query(None, description="Filter by priority tier: Critical, High, Medium, Low"),
    department: Optional[str] = Query(None, description="Filter by department code: ENG, SNT, TRD"),
    status_filter: Optional[str] = Query("active", description="Filter by task status: active, all, Pending, etc."),
    limit: int = Query(50, ge=1, le=200, description="Max number of ranked tasks to return"),
    db: Session = Depends(get_db)
):
    """
    Ranks active maintenance tasks from the database using the 6-factor AI priority scoring model.
    Returns sorted list (highest priority first) and category statistics.
    """
    query = db.query(MaintenanceTask).options(
        joinedload(MaintenanceTask.asset),
        joinedload(MaintenanceTask.defect),
        joinedload(MaintenanceTask.section),
        joinedload(MaintenanceTask.department)
    )

    if status_filter == "active":
        query = query.filter(MaintenanceTask.status.in_(["Pending", "Scheduled", "In_Progress"]))
    elif status_filter != "all":
        query = query.filter(MaintenanceTask.status == status_filter)

    if department:
        query = query.join(MaintenanceTask.department).filter(Department.code == department.upper())

    tasks = query.limit(200).all()

    # Score all fetched tasks
    scored_tasks = []
    for t in tasks:
        t_dict = _extract_task_dict_from_db(t)
        scored = ml_client.score_task(t_dict)
        scored_tasks.append(scored)

    # Sort descending by priority_score
    scored_tasks.sort(key=lambda x: (x["priority_score"], x["raw_score"]), reverse=True)

    # Calculate overall summary before level filter
    total_ranked = len(scored_tasks)
    critical_count = sum(1 for x in scored_tasks if x["priority_level"] == "Critical")
    high_count = sum(1 for x in scored_tasks if x["priority_level"] == "High")
    medium_count = sum(1 for x in scored_tasks if x["priority_level"] == "Medium")
    low_count = sum(1 for x in scored_tasks if x["priority_level"] == "Low")
    avg_score = round(sum(x["priority_score"] for x in scored_tasks) / max(1, total_ranked), 1)

    # Apply level filter if requested
    filtered_results = scored_tasks
    if level:
        level_clean = level.strip().capitalize()
        filtered_results = [x for x in scored_tasks if x["priority_level"] == level_clean]

    return {
        "summary": {
            "total_ranked": total_ranked,
            "critical_count": critical_count,
            "high_count": high_count,
            "medium_count": medium_count,
            "low_count": low_count,
            "average_score": avg_score
        },
        "priorities": filtered_results[:limit],
        "data_mode": "SIMULATED DEMO DATA"
    }

@router.get("/recommendations", response_model=AIPriorityRecommendationsResponse)
def get_ai_recommendations(
    level: Optional[str] = Query(None, description="Filter by priority tier: Critical, High, Medium, Low"),
    department: Optional[str] = Query(None, description="Filter by department code: ENG, SNT, TRD"),
    task_code: Optional[str] = Query(None, description="Filter by task code"),
    limit: int = Query(50, ge=1, le=200, description="Max number of recommendations to return"),
    db: Session = Depends(get_db)
):
    """
    Retrieves stored AI priority recommendations from PostgreSQL.
    Automatically pre-seeds recommendations from database tasks if empty.
    """
    total_recs = db.query(AIPriorityRecommendation).count()

    if total_recs == 0:
        tasks = db.query(MaintenanceTask).options(
            joinedload(MaintenanceTask.asset),
            joinedload(MaintenanceTask.defect),
            joinedload(MaintenanceTask.section),
            joinedload(MaintenanceTask.department)
        ).limit(20).all()

        for t in tasks:
            t_dict = _extract_task_dict_from_db(t)
            res = ml_client.score_task(t_dict)
            rec = AIPriorityRecommendation(
                task_id=t.id,
                task_code=t.task_code,
                title=t.title,
                department_code=t.department.code if t.department else "ENG",
                priority_score=res["priority_score"],
                priority_level=res["priority_level"],
                criticality=t.criticality,
                urgency=t.urgency,
                safety_impact=t.safety_impact,
                asset_availability_impact="High" if t.required_traffic_block and t.required_power_block else "Medium",
                overdue_status="Within SLA",
                operational_impact="High",
                reasons=res["reasons"],
                factor_breakdown=res["factor_breakdown"],
                recommended_window=(
                    "Immediate (< 12 hours)" if res["priority_level"] == "Critical"
                    else ("Within 24-48 hours" if res["priority_level"] == "High"
                    else "Scheduled Weekly Block")
                )
            )
            db.add(rec)
        db.commit()

    query = db.query(AIPriorityRecommendation)

    if level and level.upper() != "ALL":
        query = query.filter(AIPriorityRecommendation.priority_level.ilike(level.strip()))

    if department and department.upper() != "ALL":
        query = query.filter(AIPriorityRecommendation.department_code == department.strip().upper())

    if task_code:
        query = query.filter(AIPriorityRecommendation.task_code.ilike(f"%{task_code.strip()}%"))

    recs = query.order_by(desc(AIPriorityRecommendation.priority_score), desc(AIPriorityRecommendation.created_at)).limit(limit).all()

    items = []
    for r in recs:
        items.append(AIPriorityRecommendationItem(
            id=r.id,
            task_id=r.task_id,
            task_code=r.task_code,
            title=r.title,
            department_code=r.department_code,
            priority_score=r.priority_score,
            priority_level=r.priority_level,
            criticality=r.criticality,
            urgency=r.urgency,
            safety_impact=r.safety_impact,
            asset_availability_impact=r.asset_availability_impact,
            overdue_status=r.overdue_status,
            operational_impact=r.operational_impact,
            reasons=r.reasons if isinstance(r.reasons, list) else [],
            factor_breakdown=r.factor_breakdown if isinstance(r.factor_breakdown, dict) else {},
            recommended_window=r.recommended_window,
            created_at=r.created_at
        ))

    return AIPriorityRecommendationsResponse(
        total_recommendations=len(items),
        recommendations=items,
        data_mode="OFFICIAL RAILWAY AI GOVERNANCE"
    )

@router.post("/optimize-blocks", response_model=AIOptimizeBlocksResponse)
def optimize_maintenance_blocks(
    payload: Optional[AIOptimizeBlocksRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Automatic Block Planning Optimization Engine powered by Google OR-Tools CP-SAT via ML Microservice.
    """
    req_dict = payload.model_dump(exclude_unset=True) if payload else {}

    section = req_dict.get("section") or "NDLS-TKD-UP"
    section_str = section if isinstance(section, str) else str(section.get("section_code", "NDLS-TKD-UP"))

    # If maintenance_tasks is not provided in payload, query active/pending tasks from PostgreSQL
    tasks = req_dict.get("maintenance_tasks")
    if not tasks:
        db_tasks = db.query(MaintenanceTask).options(
            joinedload(MaintenanceTask.asset),
            joinedload(MaintenanceTask.defect),
            joinedload(MaintenanceTask.section),
            joinedload(MaintenanceTask.department)
        ).limit(15).all()

        tasks = []
        for t in db_tasks:
            t_dict = _extract_task_dict_from_db(t)
            score_res = ml_client.score_task(t_dict)
            tasks.append({
                "task_code": t.task_code,
                "title": t.title,
                "priority_score": score_res["priority_score"],
                "criticality": t.criticality,
                "urgency": t.urgency,
                "safety_impact": t.safety_impact,
                "duration_minutes": t.estimated_duration_minutes or 180,
                "department": t_dict["department_code"],
                "required_resources": t.required_resources or "P-Way Gang",
                "speed_restriction_imposed": t_dict.get("speed_restriction_imposed", 0)
            })

    if not tasks:
        tasks = [
            {
                "task_code": "D-1001",
                "title": "Turnout Point Machine Detection Overhaul & USFD Flaw Rectification",
                "priority_score": 96,
                "criticality": "Critical",
                "urgency": "Immediate",
                "safety_impact": "Derailment Risk",
                "duration_minutes": 180,
                "department": "ENG",
                "required_resources": "P-Way Machine Gang & USFD Trolley",
                "speed_restriction_imposed": 30
            },
            {
                "task_code": "S-204",
                "title": "Digital Axle Counter & Point Machine Detection Alignment",
                "priority_score": 88,
                "criticality": "Critical",
                "urgency": "Immediate",
                "safety_impact": "Signal Failure Risk",
                "duration_minutes": 120,
                "department": "SNT",
                "required_resources": "S&T Signal Calibration Crew",
                "speed_restriction_imposed": 0
            },
            {
                "task_code": "T-305",
                "title": "25kV Traction Catenary Wire Tension Adjustment",
                "priority_score": 82,
                "criticality": "High",
                "urgency": "Within 24 Hours",
                "duration_minutes": 150,
                "department": "TRD",
                "required_resources": "TRD Tower Wagon & Wiring Gang",
                "speed_restriction_imposed": 0
            }
        ]

    existing = req_dict.get("existing_blocks")
    if not existing:
        db_blocks = db.query(Block).options(joinedload(Block.section)).filter(
            Block.status.in_(["Approved", "Active", "Upcoming"])
        ).limit(10).all()
        existing = [
            {
                "block_code": b.block_code,
                "section_code": b.section.section_code if b.section else section_str,
                "start_time": b.requested_start_time.isoformat() if b.requested_start_time else None,
                "end_time": b.requested_end_time.isoformat() if b.requested_end_time else None,
            }
            for b in db_blocks if b.requested_start_time and b.requested_end_time
        ]

    # Run CP-SAT deterministic optimization via ML client
    result = ml_client.optimize_blocks({
        "section": section,
        "date_range": req_dict.get("date_range"),
        "maintenance_tasks": tasks,
        "train_schedule": req_dict.get("train_schedule"),
        "available_blocks": req_dict.get("available_blocks"),
        "resources": req_dict.get("resources"),
        "existing_blocks": existing,
        "goods_train_forecast": req_dict.get("goods_train_forecast"),
        "passenger_train_traffic": req_dict.get("passenger_train_traffic")
    })

    return result


@router.post(
    "/predictive-maintenance",
    response_model=PredictiveMaintenanceResponse,
    summary="Predict Asset Maintenance Risk via Trained ML Model"
)
def predict_asset_maintenance(
    payload: PredictiveMaintenanceRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Evaluates real-time sensor telemetry and operational parameters using the
    trained Random Forest Predictive Maintenance pipeline via ML Microservice.
    """
    if current_user:
        user_role = normalize_role(current_user.role.name if current_user.role else "")
        if user_role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Predictive Maintenance AI execution is restricted to Admin only. Department users (ENG, TRD, S&T) view Approved AI Updates."
            )

    if payload.asset_id is not None:
        asset_obj = db.query(Asset).join(Department).filter(Asset.id == payload.asset_id).first()
        if not asset_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asset with ID {payload.asset_id} not found."
            )
        target_dept = asset_obj.department.code if asset_obj.department else None
        check_department_access(target_dept, current_user)
    elif payload.department_code:
        check_department_access(payload.department_code, current_user)

    try:
        input_data = payload.model_dump()
        result = ml_client.predict_maintenance(input_data)

        dept_code = payload.department_code
        if not dept_code and payload.asset_id:
            asset_obj = db.query(Asset).filter(Asset.id == payload.asset_id).first()
            if asset_obj and asset_obj.department:
                dept_code = asset_obj.department.code
        dept_code = dept_code or "ENG"

        rec_count = db.query(AIRecommendation).count() + 1
        rec_code = f"PM-2026-{rec_count:04d}"

        raw_factors = result.get("top_risk_factors", [])
        formatted_factors = []
        for f in raw_factors:
            if isinstance(f, dict):
                formatted_factors.append(f)
            else:
                formatted_factors.append({
                    "feature": getattr(f, "feature", str(f)),
                    "importance": getattr(f, "importance", 0.0),
                    "value": getattr(f, "value", None)
                })

        ai_rec = AIRecommendation(
            recommendation_code=rec_code,
            recommendation_type="PREDICTIVE_MAINTENANCE",
            source_module="ai_predictive_maintenance",
            entity_type="ASSET",
            entity_id=str(payload.asset_code or payload.asset_id or "ASSET"),
            asset_id=payload.asset_id,
            asset_code=payload.asset_code,
            department_code=dept_code,
            title=f"Predictive Maintenance Assessment: {payload.asset_code or 'Asset'}",
            description=f"Automated AI diagnostic generated by {result.get('model_type', 'RandomForestClassifier')}.",
            prediction="YES" if result.get("maintenance_required") else "NO",
            probability=result.get("maintenance_probability"),
            maintenance_probability=result.get("maintenance_probability"),
            maintenance_required=result.get("maintenance_required"),
            risk_level=result.get("risk_level", "Medium"),
            top_risk_factors=formatted_factors,
            recommended_action=result.get("recommended_action"),
            model_type=result.get("model_type", "RandomForestClassifier"),
            model_version=result.get("model_version", "v1.0.0"),
            status="PENDING_REVIEW",
            created_at=datetime.utcnow(),
            created_by=current_user.id if current_user else None
        )
        db.add(ai_rec)
        db.flush()

        audit = AuditLog(
            user_id=current_user.id if current_user else None,
            action="AI_RECOMMENDATION_GENERATED",
            entity_type="AI_RECOMMENDATION",
            entity_id=ai_rec.id,
            change_details={
                "recommendation_code": rec_code,
                "status": "PENDING_REVIEW",
                "department_code": dept_code,
                "asset_code": payload.asset_code,
                "risk_level": result.get("risk_level"),
                "probability": result.get("maintenance_probability")
            }
        )
        db.add(audit)
        db.commit()

        result["recommendation_id"] = ai_rec.id
        result["recommendation_code"] = ai_rec.recommendation_code
        result["recommendation_status"] = "PENDING_REVIEW"
        result["is_official_update"] = False

        return result
    except HTTPException:
        raise
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(re)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Predictive maintenance inference failed: {str(e)}"
        )


@router.post(
    "/train-delay-prediction",
    response_model=TrainDelayPredictionResponse,
    summary="Predict Train Delay & Estimated Arrival (ETA) via Trained ML Model"
)
def predict_train_delay(
    payload: TrainDelayPredictionRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Predicts operational train trip delay in minutes using the trained HistGradientBoostingRegressor
    pipeline via ML Microservice evaluated across environmental and operational conditions.
    """
    if current_user:
        role_norm = normalize_role(current_user.role.name if current_user.role else "")
        if role_norm in ["ENGINEERING", "TRD", "S&T"] or (
            role_norm == "SUPERVISOR"
            and current_user.department
            and current_user.department.code in ["ENG", "TRD", "SNT"]
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Train operations, timetable, tracking, and delay prediction data are restricted to Control Office (Sr. DOM), DRM, and Admin."
            )

    input_data = payload.model_dump()
    sched_arr = payload.scheduled_arrival

    if not sched_arr and payload.train_id:
        train_obj = db.query(Train).filter(Train.id == payload.train_id).first()
        if train_obj and train_obj.scheduled_arrival:
            sched_arr = train_obj.scheduled_arrival
    elif not sched_arr and payload.train_no:
        train_obj = db.query(Train).filter(Train.train_no == str(payload.train_no).strip()).first()
        if train_obj and train_obj.scheduled_arrival:
            sched_arr = train_obj.scheduled_arrival

    try:
        result = ml_client.predict_train_delay_eta(input_data, scheduled_arrival=sched_arr)
        return result
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(re)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Train delay prediction inference failed: {str(e)}"
        )


@router.get("/survival/sections", summary="Get 30-Day Failure Risk & Remaining Useful Life for all Railway Sections")
def get_all_sections_survival(db: Session = Depends(get_db)):
    """Returns survival risk ranking and estimated RUL across all network sections."""
    from backend.app.services.survival_service import get_all_sections_risk_overview
    return get_all_sections_risk_overview(db)


@router.get("/survival/section/{section_id}", summary="Get 30-Day Discrete Survival Curve for Specific Section")
def get_section_survival_curve(section_id: int, db: Session = Depends(get_db)):
    """Computes daily survival probability S(t) and hazard rates across a 30-day forecast horizon."""
    from backend.app.services.survival_service import get_section_survival_analysis
    return get_section_survival_analysis(section_id, db)


@router.post("/survival/predict", summary="Predict 30-Day Failure Probability & Survival Curve from Feature Payload")
def predict_survival_from_features(payload: Dict[str, Any]):
    """Calculates survival probability curve and RUL from track parameters via ML Microservice."""
    age = float(payload.get("age_years", 18.0))
    gmt = float(payload.get("gmt_density", 45.0))
    monsoon = str(payload.get("monsoon_exposure", "medium"))
    curvature = str(payload.get("curvature_class", "gentle"))
    asset_type = str(payload.get("asset_type", "Track"))
    defects = int(payload.get("defects_count", 0))
    return ml_client.predict_survival(age, gmt, monsoon, curvature, asset_type, defects)


@router.get("/anti-gaming/audit", summary="Division-Wide Anti-Inflation & Gaming Audit Report")
def run_anti_gaming_audit(db: Session = Depends(get_db)):
    """Audits all pending tasks, comparing claimed priority vs sensor evidence score to identify inflated emergency requests."""
    from backend.app.services.anti_gaming_service import audit_department_task_pool
    return audit_department_task_pool(db)


@router.post("/anti-gaming/evaluate", summary="Evaluate Single Task for Criticality Inflation")
def evaluate_task_claim(payload: Dict[str, Any]):
    """Evaluates task criticality claim against objective failure risk."""
    from backend.app.services.anti_gaming_service import evaluate_task_inflation
    return evaluate_task_inflation(
        task_code=str(payload.get("task_code", "TSK-DEMO")),
        department_code=str(payload.get("department_code", "ENG")),
        claimed_criticality=str(payload.get("claimed_criticality", "Critical")),
        section_name=str(payload.get("section_name", "NDLS-TKD")),
        risk_30d_pct=float(payload.get("risk_30d_pct", 25.0)),
        has_speed_restriction=bool(payload.get("has_speed_restriction", False)),
        is_overdue=bool(payload.get("is_overdue", False))
    )


@router.post("/duration-overrun/predict", summary="Predict Maintenance Duration & Block Overrun Probability")
def predict_task_duration_and_overrun(payload: Dict[str, Any]):
    """Estimates realistic required possession duration and overrun probability via ML Microservice."""
    return ml_client.predict_duration_and_overrun(payload)





