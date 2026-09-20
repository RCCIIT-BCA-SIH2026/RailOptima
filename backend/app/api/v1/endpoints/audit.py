from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user_optional
from backend.app.models import AuditLog, User

router = APIRouter()

@router.get("")
def get_audit_logs(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):


    """Immutable audit trail of all system decisions, approvals, and optimizations."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "user_id": l.user_id,
            "username": l.user.username if l.user else "System",
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "change_details": l.change_details,
            "timestamp": l.timestamp.isoformat()
        })
    return {"total_records": len(results), "logs": results, "data_mode": "SIMULATED DEMO DATA"}

