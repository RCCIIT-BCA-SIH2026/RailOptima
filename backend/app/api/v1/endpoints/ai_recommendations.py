from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.models.block import AIRecommendation
from backend.app.models.asset import Asset
from backend.app.models.infrastructure import RailwaySection
from backend.app.models.defect import MaintenanceTask
from backend.app.models.user import User, AuditLog, Department
from backend.app.schemas.common import (
    AIRecommendationActionRequest,
    AIRecommendationItemResponse,
    AIRecommendationsListResponse
)
from backend.app.api.deps import (
    get_current_user,
    normalize_role,
    normalize_department,
    get_user_department_code,
    check_department_access
)

router = APIRouter()


def _serialize_rec(rec: AIRecommendation) -> Dict[str, Any]:
    """Helper to convert AIRecommendation ORM object to JSON serializable dictionary."""
    return {
        "id": rec.id,
        "recommendation_code": rec.recommendation_code or f"REC-2026-{rec.id:04d}",
        "recommendation_type": rec.recommendation_type or "PREDICTIVE_MAINTENANCE",
        "source_module": rec.source_module or "ai_predictive_maintenance",
        "entity_type": rec.entity_type or "ASSET",
        "entity_id": rec.entity_id or (rec.asset_code or str(rec.asset_id or "")),
        "asset_id": rec.asset_id,
        "asset_code": rec.asset_code,
        "task_id": rec.task_id,
        "department_code": rec.department_code or "ENG",
        "title": rec.title or f"AI Recommendation for {rec.asset_code or 'Asset'}",
        "description": rec.description,
        "location": rec.location,
        "prediction": rec.prediction or ("YES" if rec.maintenance_required else "NO"),
        "probability": rec.probability if rec.probability is not None else rec.maintenance_probability,
        "maintenance_probability": rec.maintenance_probability if rec.maintenance_probability is not None else rec.probability,
        "maintenance_required": rec.maintenance_required,
        "risk_level": rec.risk_level or "Medium",
        "top_risk_factors": rec.top_risk_factors or [],
        "recommended_action": rec.recommended_action,
        "model_type": rec.model_type or "RandomForestClassifier",
        "model_version": rec.model_version or "v1.0.0",
        "predicted_delay_minutes": rec.predicted_delay_minutes,
        "predicted_eta": rec.predicted_eta.isoformat() if rec.predicted_eta else None,
        "scheduled_arrival": rec.scheduled_arrival.isoformat() if rec.scheduled_arrival else None,
        "status": rec.status or "PENDING_REVIEW",
        "created_at": rec.created_at.isoformat() if rec.created_at else None,
        "reviewed_at": rec.reviewed_at.isoformat() if rec.reviewed_at else None,
        "reviewed_by": rec.reviewed_by,
        "reviewer_name": rec.reviewer_name,
        "approval_comment": rec.approval_comment,
        "rejection_reason": rec.rejection_reason
    }


def _require_admin(user: User) -> None:
    """Enforces that caller has ADMIN role; raises HTTP 403 Forbidden otherwise."""
    role_norm = normalize_role(user.role.name if user.role else "")
    if role_norm != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: AI governance and approval operations are restricted to Admin only."
        )


@router.get("/pending", response_model=AIRecommendationsListResponse)
def get_pending_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ADMIN ONLY: Returns all AI recommendations in PENDING_REVIEW status.
    Department users (ENG, TRD, S&T) receive HTTP 403 Forbidden.
    """
    _require_admin(current_user)

    query = db.query(AIRecommendation).filter(
        AIRecommendation.status == "PENDING_REVIEW"
    ).order_by(desc(AIRecommendation.created_at))

    recs = query.all()
    serialized = [_serialize_rec(r) for r in recs]

    # Calculate metrics
    pending_count = len(serialized)
    approved_count = db.query(AIRecommendation).filter(AIRecommendation.status == "APPROVED").count()
    rejected_count = db.query(AIRecommendation).filter(AIRecommendation.status == "REJECTED").count()
    critical_count = sum(1 for r in serialized if r.get("risk_level") in ["Critical", "High"])

    return {
        "total_count": pending_count,
        "pending_count": pending_count,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "critical_count": critical_count,
        "recommendations": serialized,
        "data_mode": "OFFICIAL RAILWAY AI GOVERNANCE"
    }


@router.get("/approved", response_model=AIRecommendationsListResponse)
def get_approved_recommendations(
    department_code: Optional[str] = Query(None, description="Department filter (ENG, TRD, SNT)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns recommendations that have been APPROVED by Admin and are now OFFICIAL UPDATES.
    Enforces Department Isolation:
    - ADMIN: Can view all approved recommendations, or filter by requested department.
    - ENGINEERING: Can strictly view only approved recommendations where department_code == 'ENG'.
    - TRD: Can strictly view only approved recommendations where department_code == 'TRD'.
    - S&T: Can strictly view only approved recommendations where department_code == 'SNT'.
    - Non-admin requesting another department's updates receives HTTP 403 Forbidden.
    """
    user_role = normalize_role(current_user.role.name if current_user.role else "")
    user_dept = get_user_department_code(current_user)

    query = db.query(AIRecommendation).filter(AIRecommendation.status == "APPROVED")

    if user_role == "ADMIN":
        if department_code and department_code.upper() != "ALL":
            norm_target = normalize_department(department_code)
            query = query.filter(AIRecommendation.department_code == norm_target)
    else:
        # Non-admin users: Enforce strict department isolation
        if department_code:
            norm_requested = normalize_department(department_code)
            if norm_requested != user_dept:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Department isolation violation: User from {user_dept} cannot access {department_code} department recommendations."
                )
        query = query.filter(AIRecommendation.department_code == user_dept)

    recs = query.order_by(desc(AIRecommendation.reviewed_at), desc(AIRecommendation.created_at)).all()
    serialized = [_serialize_rec(r) for r in recs]

    critical_count = sum(1 for r in serialized if r.get("risk_level") in ["Critical", "High"])

    return {
        "total_count": len(serialized),
        "pending_count": 0,
        "approved_count": len(serialized),
        "rejected_count": 0,
        "critical_count": critical_count,
        "recommendations": serialized,
        "data_mode": "OFFICIAL RAILWAY APPROVED UPDATES"
    }


@router.get("", response_model=AIRecommendationsListResponse)
def list_all_recommendations(
    status_filter: Optional[str] = Query(None, alias="status"),
    department_code: Optional[str] = Query(None),
    recommendation_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ADMIN ONLY: Comprehensive AI Review Center listing all recommendations across departments.
    Department users attempting to view unapproved/all recommendations receive HTTP 403 Forbidden.
    """
    _require_admin(current_user)

    query = db.query(AIRecommendation)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(AIRecommendation.status == status_filter.upper())
    if department_code and department_code.upper() != "ALL":
        query = query.filter(AIRecommendation.department_code == normalize_department(department_code))
    if recommendation_type and recommendation_type.upper() != "ALL":
        query = query.filter(AIRecommendation.recommendation_type == recommendation_type.upper())

    recs = query.order_by(desc(AIRecommendation.created_at)).all()
    serialized = [_serialize_rec(r) for r in recs]

    # Global counts
    pending_count = db.query(AIRecommendation).filter(AIRecommendation.status == "PENDING_REVIEW").count()
    approved_count = db.query(AIRecommendation).filter(AIRecommendation.status == "APPROVED").count()
    rejected_count = db.query(AIRecommendation).filter(AIRecommendation.status == "REJECTED").count()
    critical_count = db.query(AIRecommendation).filter(
        AIRecommendation.status == "PENDING_REVIEW",
        AIRecommendation.risk_level.in_(["Critical", "High"])
    ).count()

    return {
        "total_count": len(serialized),
        "pending_count": pending_count,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "critical_count": critical_count,
        "recommendations": serialized,
        "data_mode": "OFFICIAL RAILWAY AI GOVERNANCE"
    }


@router.get("/{id}", response_model=AIRecommendationItemResponse)
def get_recommendation_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches a single recommendation by ID.
    Enforces Department Isolation:
    - ADMIN can view any recommendation.
    - Department users can only view APPROVED recommendations for their own department.
    - Foreign department access or viewing unapproved recommendations returns HTTP 403 Forbidden.
    """
    rec = db.query(AIRecommendation).filter(AIRecommendation.id == id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Recommendation with ID {id} not found."
        )

    user_role = normalize_role(current_user.role.name if current_user.role else "")
    user_dept = get_user_department_code(current_user)

    if user_role != "ADMIN":
        # Check department match
        if rec.department_code != user_dept:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Department isolation violation: User from {user_dept} cannot access {rec.department_code} department recommendation."
            )
        # Check approved status
        if rec.status != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Department users may only view approved AI recommendations."
            )

    return _serialize_rec(rec)


@router.post("/{id}/approve", response_model=AIRecommendationItemResponse)
def approve_recommendation(
    id: int,
    payload: Optional[AIRecommendationActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ADMIN ONLY: Approves an AI recommendation, transitioning it from PENDING_REVIEW to APPROVED.
    This converts the recommendation into an OFFICIAL OPERATIONAL UPDATE.
    - If predictive maintenance and maintenance_required is True: creates an official MaintenanceTask.
    - Department users (ENG, TRD, S&T) calling this endpoint receive HTTP 403 Forbidden.
    """
    _require_admin(current_user)

    rec = db.query(AIRecommendation).filter(AIRecommendation.id == id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Recommendation with ID {id} not found."
        )

    if rec.status == "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve a rejected AI recommendation."
        )

    prev_status = rec.status
    approval_comment = payload.approval_comment if payload and payload.approval_comment else "Approved by System Administrator"

    rec.status = "APPROVED"
    rec.reviewed_by = current_user.id
    rec.reviewer_name = current_user.full_name or "System Administrator"
    rec.reviewed_at = datetime.utcnow()
    rec.approval_comment = approval_comment

    # --- OFFICIAL UPDATE RULE ---
    # When Admin approves a predictive maintenance recommendation requiring maintenance:
    if rec.recommendation_type == "PREDICTIVE_MAINTENANCE" and rec.maintenance_required:
        # Check if asset exists
        asset_obj = None
        if rec.asset_id:
            asset_obj = db.query(Asset).filter(Asset.id == rec.asset_id).first()
        elif rec.asset_code:
            asset_obj = db.query(Asset).filter(Asset.asset_code == rec.asset_code).first()

        dept_obj = None
        if rec.department_code:
            dept_obj = db.query(Department).filter(Department.code == rec.department_code).first()
        if not dept_obj and asset_obj:
            dept_obj = asset_obj.department

        # Generate unique task code
        task_count = db.query(MaintenanceTask).count() + 1
        official_task_code = f"TSK-AI-{rec.department_code}-{task_count:04d}"

        # Determine section ID (required not-null in database)
        sec_id = asset_obj.section_id if asset_obj and asset_obj.section_id else None
        if not sec_id:
            first_sec = db.query(RailwaySection).first()
            sec_id = first_sec.id if first_sec else 1

        # Create official MaintenanceTask in database
        official_task = MaintenanceTask(
            task_code=official_task_code,
            title=f"Approved AI Maintenance: {rec.asset_code or 'Asset'}",
            description=f"Official maintenance work order generated following Admin approval of AI recommendation {rec.recommendation_code}.\nDirective: {rec.recommended_action or 'Corrective maintenance block'}\nApproval Remark: {approval_comment}",
            task_type="Corrective Maintenance",
            department_id=dept_obj.id if dept_obj else (asset_obj.department_id if asset_obj else 1),
            asset_id=asset_obj.id if asset_obj else rec.asset_id,
            section_id=sec_id,
            criticality="Critical" if rec.risk_level in ["Critical", "High"] else "Medium",
            urgency="High" if rec.risk_level in ["Critical", "High"] else "Medium",
            safety_impact="High Safety Priority (AI Defect Forecast)",
            status="Scheduled",
            estimated_duration_minutes=180,
            required_traffic_block=True,
            required_power_block=True if rec.department_code == "TRD" else False,
            due_date=datetime.utcnow() + timedelta(days=2),
            created_at=datetime.utcnow()
        )
        db.add(official_task)
        db.flush()
        rec.task_id = official_task.id

    # Record Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="AI_RECOMMENDATION_APPROVED",
        entity_type="AI_RECOMMENDATION",
        entity_id=rec.id,
        change_details={
            "recommendation_id": rec.id,
            "recommendation_code": rec.recommendation_code,
            "action": "APPROVED",
            "previous_status": prev_status,
            "new_status": "APPROVED",
            "department_code": rec.department_code,
            "asset_code": rec.asset_code,
            "reviewed_by": current_user.full_name,
            "approval_comment": approval_comment,
            "official_task_id": rec.task_id
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(rec)

    return _serialize_rec(rec)


@router.post("/{id}/reject", response_model=AIRecommendationItemResponse)
def reject_recommendation(
    id: int,
    payload: Optional[AIRecommendationActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ADMIN ONLY: Rejects an AI recommendation, transitioning it to REJECTED.
    - Rejected recommendations do NOT become official updates.
    - Department users cannot view rejected recommendations.
    - Department users (ENG, TRD, S&T) calling this endpoint receive HTTP 403 Forbidden.
    """
    _require_admin(current_user)

    rec = db.query(AIRecommendation).filter(AIRecommendation.id == id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Recommendation with ID {id} not found."
        )

    rejection_reason = payload.rejection_reason if payload and payload.rejection_reason else "Rejected by System Administrator"

    prev_status = rec.status
    rec.status = "REJECTED"
    rec.reviewed_by = current_user.id
    rec.reviewer_name = current_user.full_name or "System Administrator"
    rec.reviewed_at = datetime.utcnow()
    rec.rejection_reason = rejection_reason

    # Record Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="AI_RECOMMENDATION_REJECTED",
        entity_type="AI_RECOMMENDATION",
        entity_id=rec.id,
        change_details={
            "recommendation_id": rec.id,
            "recommendation_code": rec.recommendation_code,
            "action": "REJECTED",
            "previous_status": prev_status,
            "new_status": "REJECTED",
            "department_code": rec.department_code,
            "asset_code": rec.asset_code,
            "reviewed_by": current_user.full_name,
            "rejection_reason": rejection_reason
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(rec)

    return _serialize_rec(rec)

