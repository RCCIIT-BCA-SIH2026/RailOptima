from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models import Alert, RailwaySection

router = APIRouter()

@router.get("")
def get_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity (Critical, Warning, Info)"),
    unread_only: bool = Query(False, description="Filter by unread status"),
    db: Session = Depends(get_db)
):
    """Returns active railway safety alerts, speed restrictions, and conflict warnings."""
    query = db.query(Alert).outerjoin(RailwaySection).order_by(Alert.created_at.desc())

    if severity:
        query = query.filter(Alert.severity == severity)
    if unread_only:
        query = query.filter(Alert.is_read == False)

    alerts = query.limit(100).all()

    results = []
    for a in alerts:
        results.append({
            "id": a.id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "section_code": a.section.section_code if a.section else "Trunk Corridor",
            "is_read": a.is_read,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "data_mode": "SIMULATED DEMO DATA"
        })

    return {
        "total": len(results),
        "unread_count": sum(1 for a in results if not a["is_read"]),
        "critical_count": sum(1 for a in results if a["severity"] == "Critical"),
        "data_mode": "SIMULATED DEMO DATA",
        "alerts": results
    }

@router.post("/mark-read/{alert_id}")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    """Marks a railway safety alert as acknowledged/read."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"status": "Success", "alert_id": alert_id, "is_read": True}

