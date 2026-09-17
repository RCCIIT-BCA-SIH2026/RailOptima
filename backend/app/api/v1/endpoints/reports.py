from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user_optional, normalize_role, get_user_department_code
from backend.app.models import Asset, Defect, Block, Train, Corridor, Department, User

router = APIRouter()

@router.get("/summary")
def get_reports_summary(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Aggregates executive analytics reports across asset availability, punctuality, and block execution with department RBAC."""
    user_dept = None
    if current_user:
        user_norm = normalize_role(current_user.role.name if current_user.role else "")
        if user_norm in ["ENGINEERING", "TRD", "S&T"] or (user_norm == "SUPERVISOR" and current_user.department and current_user.department.code in ["ENG", "TRD", "SNT"]):
            user_dept = get_user_department_code(current_user)

    asset_query = db.query(Asset)
    block_query = db.query(Block)

    if user_dept:
        dept_obj = db.query(Department).filter(Department.code == user_dept).first()
        if dept_obj:
            asset_query = asset_query.filter(Asset.department_id == dept_obj.id)
            block_query = block_query.filter(Block.lead_department_id == dept_obj.id)

    total_assets = asset_query.count()
    operational_assets = asset_query.filter(Asset.status == "Operational").count()
    asset_availability_pct = round((operational_assets / max(1, total_assets)) * 100, 1)

    total_blocks = block_query.count()
    approved_blocks = block_query.filter(Block.status.in_(["Approved", "Completed"])).count()
    block_approval_rate_pct = round((approved_blocks / max(1, total_blocks)) * 100, 1)

    # Monthly Availability Historical Trend
    now = datetime.utcnow()
    availability_trend = [
        {"month": "May 2026", "availability_pct": 91.2, "punctuality_pct": 90.8, "blocks_granted": 74},
        {"month": "Jun 2026", "availability_pct": 92.0, "punctuality_pct": 91.5, "blocks_granted": 80},
        {"month": "Jul 2026", "availability_pct": 91.8, "punctuality_pct": 91.0, "blocks_granted": 78},
        {"month": "Aug 2026", "availability_pct": 93.4, "punctuality_pct": 92.4, "blocks_granted": 88},
        {"month": "Sep 2026", "availability_pct": asset_availability_pct, "punctuality_pct": 93.2, "blocks_granted": total_blocks}
    ]

    # Department Execution Efficiency
    all_dept_stats = [
        {"department": "Civil (ENG)", "dept_code": "ENG", "planned_hours": 320, "actual_hours": 312, "efficiency_pct": 97.5},
        {"department": "Signal (S&T)", "dept_code": "SNT", "planned_hours": 180, "actual_hours": 174, "efficiency_pct": 96.6},
        {"department": "Traction (TRD)", "dept_code": "TRD", "planned_hours": 210, "actual_hours": 204, "efficiency_pct": 97.1}
    ]

    if user_dept:
        dept_stats = [d for d in all_dept_stats if d["dept_code"] == user_dept]
    else:
        dept_stats = all_dept_stats

    return {
        "report_generated_at": now.isoformat(),
        "data_mode": "SIMULATED DEMO DATA",
        "department_scope": user_dept or "DIVISION_WIDE",
        "key_metrics": {
            "asset_availability_pct": asset_availability_pct,
            "system_punctuality_pct": 93.2,
            "block_approval_rate_pct": block_approval_rate_pct,
            "total_blocks_analyzed": total_blocks,
            "total_defects_resolved_ytd": 842 if not user_dept else 280,
            "track_hours_saved_by_synergy": 128 if not user_dept else 42
        },
        "monthly_trend": availability_trend,
        "department_efficiency": dept_stats
    }

