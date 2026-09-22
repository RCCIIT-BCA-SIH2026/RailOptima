"""
sla.py  —  SLA Compliance & Escalation API Endpoints
======================================================
Exposes the SLA Policy Engine for defect/task SLA tracking.

Endpoints:
  GET  /api/ai/sla/evaluate/{defect_id}   Evaluate SLA for a specific defect
  GET  /api/ai/sla/breaches               All overdue defects, sorted by escalation level
  GET  /api/ai/sla/policy                 Returns the current SLA policy config
  POST /api/ai/sla/evaluate               Ad-hoc SLA evaluation from raw payload
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.models.defect import Defect
from backend.app.api.deps import get_current_user_optional
from backend.app.models.user import User
from backend.app.services.sla_policy import (
    evaluate_defect_sla,
    ASSUMED_SLA_POLICIES,
    resolve_policy,
)

logger = logging.getLogger("railoptima.sla_endpoint")

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class SlaEvaluateRequest(BaseModel):
    """Ad-hoc SLA evaluation payload."""
    severity: str = Field("Major", description="Defect severity: Critical / Major / Minor")
    reported_at: datetime = Field(..., description="When the defect was first reported (ISO 8601).")
    evaluated_at: Optional[datetime] = Field(None, description="Evaluation point (defaults to now).")
    sla_type: str = Field("completion", description="'approval' | 'execution' | 'completion'")


class SlaBreachItem(BaseModel):
    defect_id: int
    defect_code: str
    severity: str
    section_code: Optional[str]
    reported_at: str
    escalation_level: int
    sla_status: str
    hours_overdue: float
    department_code: Optional[str]


class SlaBreachesResponse(BaseModel):
    total_breaches: int
    critical_escalations: int   # level 3
    overdue: int                # level 2
    due_soon: int               # level 1
    items: List[SlaBreachItem]
    policy_version: str
    assumed_policy: bool = True


class SlaEvaluateResponse(BaseModel):
    defect_id: Optional[int] = None
    defect_code: Optional[str] = None
    sla_evaluation: Dict[str, Any]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _defect_to_sla_breach(d: "Defect", db: Session) -> Optional[SlaBreachItem]:
    """Evaluates a defect's SLA status. Returns SlaBreachItem if overdue or due-soon."""
    if not d.reported_at:
        return None
    try:
        eval_result = evaluate_defect_sla(
            severity=d.severity or "Major",
            reported_at=d.reported_at,
        )
    except Exception:
        return None

    if eval_result["escalation_level"] == 0:
        return None

    hours_overdue = max(0.0, -eval_result["hours_remaining"])
    dept_code = d.department.code if d.department else None
    section_code = d.section.section_code if d.section else None

    return SlaBreachItem(
        defect_id=d.id,
        defect_code=d.defect_code,
        severity=d.severity or "Major",
        section_code=section_code,
        reported_at=d.reported_at.isoformat(),
        escalation_level=eval_result["escalation_level"],
        sla_status=eval_result["sla_status"],
        hours_overdue=round(hours_overdue, 2),
        department_code=dept_code,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/policy")
def get_sla_policy(
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Returns the current SLA policy configuration for all severity tiers.

    Note: All values are engineering demo assumptions (not official IR policy).
    """
    return {
        "policies": {sev: pol.to_dict() for sev, pol in ASSUMED_SLA_POLICIES.items()},
        "policy_note": (
            "These SLA durations are engineering demo values. "
            "They have NOT been derived from or approved by any Indian Railways authority."
        ),
        "assumed": True,
    }


@router.get("/evaluate/{defect_id}", response_model=SlaEvaluateResponse)
def evaluate_defect_sla_by_id(
    defect_id: int,
    sla_type: str = Query("completion", description="'approval' | 'execution' | 'completion'"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Evaluates the SLA compliance status of a specific defect by its ID.

    Returns:
    - **sla_status**: WITHIN_SLA / DUE_SOON / OVERDUE / ESCALATED_L3
    - **escalation_level**: 0 (on time) to 3 (senior intervention needed)
    - **hours_remaining**: hours until SLA deadline (negative = overdue)
    - **deadline**: when the SLA deadline falls
    """
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Defect with ID {defect_id} not found.",
        )

    if not defect.reported_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Defect has no reported_at timestamp — SLA cannot be evaluated.",
        )

    valid_types = ("approval", "execution", "completion")
    if sla_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"sla_type must be one of {valid_types}.",
        )

    evaluation = evaluate_defect_sla(
        severity=defect.severity or "Major",
        reported_at=defect.reported_at,
        sla_type=sla_type,
    )

    return SlaEvaluateResponse(
        defect_id=defect.id,
        defect_code=defect.defect_code,
        sla_evaluation=evaluation,
    )


@router.post("/evaluate", response_model=SlaEvaluateResponse)
def evaluate_sla_adhoc(
    payload: SlaEvaluateRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Ad-hoc SLA evaluation without a DB lookup.
    Useful for testing, What-If sandbox, or integration scenarios.
    """
    valid_types = ("approval", "execution", "completion")
    if payload.sla_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"sla_type must be one of {valid_types}.",
        )

    evaluation = evaluate_defect_sla(
        severity=payload.severity,
        reported_at=payload.reported_at,
        evaluated_at=payload.evaluated_at,
        sla_type=payload.sla_type,
    )
    return SlaEvaluateResponse(sla_evaluation=evaluation)


@router.get("/breaches", response_model=SlaBreachesResponse)
def get_sla_breaches(
    limit: int = Query(50, description="Max number of breach records to return."),
    severity: Optional[str] = Query(None, description="Filter by severity (Critical/Major/Minor)."),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Returns all open defects that are past their SLA deadline or approaching it,
    sorted by escalation severity (L3 first, then L2, then L1).

    Useful for dashboard KPI cards and daily escalation reports.
    """
    query = db.query(Defect).filter(Defect.status.notin_(["Resolved", "Closed", "Cancelled"]))
    if severity:
        query = query.filter(Defect.severity == severity)

    # Fetch recent open defects (last 200 to keep it manageable)
    defects = query.order_by(desc(Defect.reported_at)).limit(200).all()

    breaches: List[SlaBreachItem] = []
    for d in defects:
        item = _defect_to_sla_breach(d, db)
        if item is not None:
            breaches.append(item)

    # Sort: escalation_level DESC, then hours_overdue DESC
    breaches.sort(key=lambda b: (-b.escalation_level, -b.hours_overdue))
    breaches = breaches[:limit]

    critical_esc = sum(1 for b in breaches if b.escalation_level == 3)
    overdue = sum(1 for b in breaches if b.escalation_level == 2)
    due_soon = sum(1 for b in breaches if b.escalation_level == 1)

    return SlaBreachesResponse(
        total_breaches=len(breaches),
        critical_escalations=critical_esc,
        overdue=overdue,
        due_soon=due_soon,
        items=breaches,
        policy_version="assumed-demo-v1.0",
    )
