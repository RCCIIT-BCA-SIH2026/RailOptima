from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user, get_current_user_optional, require_roles, normalize_role, get_user_department_code
from backend.app.models import Block, Approval, User, AuditLog
from backend.app.schemas import ApprovalActionRequest
from backend.app.services.mongodb_repository_service import MongoDBRepositoryService

router = APIRouter()

@router.get("/pending")
def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Fetches blocks awaiting officer review and approval (department-filtered for department officers)."""
    pending_blocks = db.query(Block).filter(Block.status == "Proposed").order_by(Block.requested_start_time.asc()).all()

    # If department user, filter to blocks that involve user's department
    if current_user:
        user_norm = normalize_role(current_user.role.name if current_user.role else "")
        if user_norm in ["ENGINEERING", "TRD", "S&T"] or (user_norm == "SUPERVISOR" and current_user.department and current_user.department.code in ["ENG", "TRD", "SNT"]):
            u_dept = get_user_department_code(current_user)
            pending_blocks = [
                b for b in pending_blocks
                if (b.lead_department and b.lead_department.code == u_dept) or
                   any(bt.task and bt.task.department and bt.task.department.code == u_dept for bt in b.block_tasks)
            ]

    results = []
    for b in pending_blocks:
        results.append({
            "block_id": b.id,
            "block_code": b.block_code,
            "section_code": b.section.section_code if b.section else "SEC",
            "corridor": b.section.corridor.name if b.section and b.section.corridor else "CORR",
            "block_type": b.block_type,
            "requested_start_time": b.requested_start_time.isoformat(),
            "requested_end_time": b.requested_end_time.isoformat(),
            "duration_hours": round((b.requested_end_time - b.requested_start_time).total_seconds() / 3600.0, 1),
            "lead_department": b.lead_department.code if b.lead_department else "ENG",
            "tasks_count": b.total_tasks_count,
            "status": b.status,
            "ai_confidence": b.ai_recommendations[0].confidence_score if b.ai_recommendations else 0.92,
            "ai_strategy": b.ai_recommendations[0].strategy_name if b.ai_recommendations else "Balanced Plan"
        })
    return {"pending_count": len(results), "blocks": results, "data_mode": "SIMULATED DEMO DATA"}

@router.post("/{block_id}/action")
def perform_approval_action(
    block_id: int,
    payload: ApprovalActionRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Officer approval workflow:
    - DRM / Branch Officer submits Approved / Rejected / Modification_Requested
    - Updates Block status
    - Writes immutable Approval record and Audit Log in SQLite & MongoDB Atlas
    """
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    user_id = current_user.id if current_user else 1
    user_role = current_user.role.name if (current_user and current_user.role) else "DRM"
    user_fullname = current_user.full_name if current_user else "Divisional Railway Manager (DRM)"

    # Map action to block status
    if payload.action == "Approved":
        block.status = "Approved"
    elif payload.action == "Rejected":
        block.status = "Rejected"
    else:
        block.status = "Proposed" # Modification requested, remains proposed

    now_iso = datetime.utcnow().isoformat()

    # Create Approval record in SQL
    approval = Approval(
        block_id=block.id,
        plan_id=block.plan_id,
        reviewed_by_user_id=user_id,
        role_at_review=user_role,
        action=payload.action,
        comments=payload.comments or f"{payload.action} by {user_role}",
        reviewed_at=datetime.utcnow()
    )
    db.add(approval)

    # Log to audit trail in SQL
    audit = AuditLog(
        user_id=user_id,
        action=f"BLOCK_{payload.action.upper()}",
        entity_type="BLOCK",
        entity_id=block.id,
        change_details={"block_code": block.block_code, "action": payload.action, "comments": payload.comments}
    )
    db.add(audit)
    db.commit()

    # --- Sync directly into MongoDB Atlas database 'railway_planner' ---
    MongoDBRepositoryService.save_approval_record({
        "block_id": block.id,
        "block_code": block.block_code,
        "action": payload.action,
        "comments": payload.comments or f"{payload.action} by {user_role}",
        "reviewed_by_user_id": user_id,
        "reviewed_by": user_fullname,
        "role_at_review": user_role,
        "timestamp": now_iso
    })

    MongoDBRepositoryService.update_block_status_in_mongo(
        block_id=block.id,
        block_code=block.block_code,
        new_status=block.status,
        extra_details={
            "section_code": block.section.section_code if block.section else "SEC",
            "lead_department": block.lead_department.code if block.lead_department else "ENG",
            "action": payload.action,
            "timestamp": now_iso
        }
    )

    MongoDBRepositoryService.save_audit_log_in_mongo({
        "user_id": user_id,
        "username": user_fullname,
        "action": f"BLOCK_{payload.action.upper()}",
        "entity_type": "BLOCK",
        "entity_id": block.id,
        "change_details": {"block_code": block.block_code, "action": payload.action, "comments": payload.comments},
        "timestamp": now_iso
    })

    return {
        "message": f"Block {block.block_code} successfully marked as {block.status}.",
        "block_id": block.id,
        "new_status": block.status,
        "reviewed_by": user_fullname,
        "role": user_role,
        "mongodb_synced": True,
        "data_mode": "LIVE MONGODB ATLAS & DEMO DATA"
    }


