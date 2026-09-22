"""
sla_policy.py  —  SLA Compliance & Escalation Policy Engine
=============================================================
Ported and adapted from Pashupatastra (AryanRajguru22/Pashupatastra-sih26027).

WHAT THIS IS
    A versioned, immutable SLA policy that answers two questions:
      1. What is the allowed response time for a given defect severity?
      2. Given a reporting time and evaluation time, how overdue are we?
         (→ escalation level L0 / L1 / L2 / L3)

SEVERITY TIERS (engineering demo values — not official IR policy)
    CRITICAL    approval ≤6h,   start ≤12h, complete ≤24h
    MAJOR       approval ≤24h,  start ≤48h, complete ≤72h
    MINOR       approval ≤72h,  start ≤120h, complete ≤168h

Every policy is versioned. The version string contains "assumed" to
signal that these durations are engineering placeholders, not IR circulars.

ESCALATION LEVELS
    L0  WITHIN_SLA      — job is on time
    L1  DUE_SOON        — within 20% of SLA deadline
    L2  OVERDUE         — past first deadline
    L3  ESCALATED_L3    — past 1.5× deadline (senior intervention needed)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

logger = logging.getLogger("railoptima.sla_policy")

# A policy version must contain this marker.
# It prevents any version string from ever removing the "assumed" signal.
ASSUMED_VERSION_MARKER = "assumed"

# Escalation vocabulary
SLA_WITHIN = "WITHIN_SLA"
SLA_DUE_SOON = "DUE_SOON"
SLA_OVERDUE = "OVERDUE"
SLA_ESCALATED_L3 = "ESCALATED_L3"


@dataclass(frozen=True)
class SlaTiming:
    """
    Pure timing facts evaluated at a specific point in time.

    escalation_level:
        0 = WITHIN_SLA
        1 = DUE_SOON
        2 = OVERDUE
        3 = ESCALATED_L3
    """
    started_at: datetime
    evaluated_at: datetime
    deadline: datetime
    due_soon_at: datetime
    escalated_at: datetime
    elapsed: timedelta
    escalation_level: int
    sla_label: str

    @property
    def is_overdue(self) -> bool:
        return self.evaluated_at >= self.deadline

    @property
    def is_due_soon(self) -> bool:
        return self.evaluated_at >= self.due_soon_at and not self.is_overdue

    @property
    def hours_remaining(self) -> float:
        remaining = (self.deadline - self.evaluated_at).total_seconds() / 3600.0
        return round(remaining, 2)


@dataclass(frozen=True)
class SlaPolicy:
    """
    Immutable SLA policy for one severity tier.

    Fields:
        severity          DefectSeverity string: Critical / Major / Minor
        approval_sla      Maximum time allowed for DRM/officer approval
        execution_sla     Maximum time allowed for field work start
        completion_sla    Maximum time allowed for full repair completion
        due_soon_fraction Fraction of sla at which DUE_SOON begins (default 0.80)
        escalation_mult   Multiple of completion_sla at which L3 begins (default 1.5)
        version           Policy version string (must contain "assumed")
        assumed           True — flags that these are demo engineering values
    """
    severity: str
    approval_sla: timedelta
    execution_sla: timedelta
    completion_sla: timedelta
    due_soon_fraction: float = 0.80
    escalation_mult: float = 1.50
    version: str = "assumed-demo-v1.0"
    assumed: bool = True

    def __post_init__(self) -> None:
        if ASSUMED_VERSION_MARKER not in self.version:
            raise ValueError(
                f"SlaPolicy.version must contain '{ASSUMED_VERSION_MARKER}' "
                f"until real IR policy data is available. Got: {self.version!r}"
            )

    def evaluate(
        self,
        started_at: datetime,
        evaluated_at: Optional[datetime] = None,
        sla_type: str = "completion",
    ) -> SlaTiming:
        """
        Evaluates SLA timing against the given clock start and evaluation time.

        Args:
            started_at:    When the defect/task was reported/started.
            evaluated_at:  Point of evaluation (defaults to now UTC).
            sla_type:      One of 'approval', 'execution', 'completion'.

        Returns:
            SlaTiming with escalation level, deadline, elapsed time.
        """
        eval_time = evaluated_at or datetime.utcnow()

        sla_dur = {
            "approval": self.approval_sla,
            "execution": self.execution_sla,
            "completion": self.completion_sla,
        }.get(sla_type, self.completion_sla)

        deadline = started_at + sla_dur
        due_soon_at = started_at + timedelta(seconds=sla_dur.total_seconds() * self.due_soon_fraction)
        escalated_at = started_at + timedelta(seconds=sla_dur.total_seconds() * self.escalation_mult)
        elapsed = eval_time - started_at

        if eval_time >= escalated_at:
            level = 3
            label = SLA_ESCALATED_L3
        elif eval_time >= deadline:
            level = 2
            label = SLA_OVERDUE
        elif eval_time >= due_soon_at:
            level = 1
            label = SLA_DUE_SOON
        else:
            level = 0
            label = SLA_WITHIN

        return SlaTiming(
            started_at=started_at,
            evaluated_at=eval_time,
            deadline=deadline,
            due_soon_at=due_soon_at,
            escalated_at=escalated_at,
            elapsed=elapsed,
            escalation_level=level,
            sla_label=label,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Serializable representation for API responses."""
        return {
            "severity": self.severity,
            "approval_sla_hours": round(self.approval_sla.total_seconds() / 3600, 1),
            "execution_sla_hours": round(self.execution_sla.total_seconds() / 3600, 1),
            "completion_sla_hours": round(self.completion_sla.total_seconds() / 3600, 1),
            "due_soon_fraction": self.due_soon_fraction,
            "escalation_mult": self.escalation_mult,
            "version": self.version,
            "assumed": self.assumed,
        }


# ---------------------------------------------------------------------------
# Default Policy Set — engineering demo values
# ---------------------------------------------------------------------------
ASSUMED_SLA_POLICIES: Dict[str, SlaPolicy] = {
    "Critical": SlaPolicy(
        severity="Critical",
        approval_sla=timedelta(hours=6),
        execution_sla=timedelta(hours=12),
        completion_sla=timedelta(hours=24),
        due_soon_fraction=0.75,
        escalation_mult=1.5,
        version="assumed-demo-v1.0",
    ),
    "Major": SlaPolicy(
        severity="Major",
        approval_sla=timedelta(hours=24),
        execution_sla=timedelta(hours=48),
        completion_sla=timedelta(hours=72),
        due_soon_fraction=0.80,
        escalation_mult=1.5,
        version="assumed-demo-v1.0",
    ),
    "Minor": SlaPolicy(
        severity="Minor",
        approval_sla=timedelta(hours=72),
        execution_sla=timedelta(hours=120),
        completion_sla=timedelta(hours=168),
        due_soon_fraction=0.85,
        escalation_mult=1.5,
        version="assumed-demo-v1.0",
    ),
}

# Canonical severity normalisation (accept multiple aliases)
_SEVERITY_MAP: Dict[str, str] = {
    "critical": "Critical",
    "p0": "Critical",
    "p0 - emergency": "Critical",
    "major": "Major",
    "p1": "Major",
    "p1 - urgent": "Major",
    "minor": "Minor",
    "p2": "Minor",
    "p2 - routine": "Minor",
}


def resolve_policy(severity: str) -> SlaPolicy:
    """Returns the SlaPolicy for a given severity string (case-insensitive, alias-aware)."""
    canonical = _SEVERITY_MAP.get(severity.lower().strip(), "Major")
    return ASSUMED_SLA_POLICIES[canonical]


def evaluate_defect_sla(
    severity: str,
    reported_at: datetime,
    evaluated_at: Optional[datetime] = None,
    sla_type: str = "completion",
) -> Dict[str, Any]:
    """
    High-level helper: evaluates SLA status for a defect.

    Args:
        severity:     Defect severity string.
        reported_at:  When the defect was first reported.
        evaluated_at: Point of evaluation (default: now).
        sla_type:     'completion' | 'approval' | 'execution'

    Returns:
        Dict ready for JSON serialisation.
    """
    policy = resolve_policy(severity)
    timing = policy.evaluate(reported_at, evaluated_at, sla_type)
    eval_time = evaluated_at or datetime.utcnow()

    return {
        "severity": severity,
        "policy": policy.to_dict(),
        "sla_type": sla_type,
        "reported_at": reported_at.isoformat(),
        "evaluated_at": eval_time.isoformat(),
        "deadline": timing.deadline.isoformat(),
        "due_soon_at": timing.due_soon_at.isoformat(),
        "escalated_at": timing.escalated_at.isoformat(),
        "elapsed_hours": round(timing.elapsed.total_seconds() / 3600, 2),
        "hours_remaining": timing.hours_remaining,
        "escalation_level": timing.escalation_level,
        "sla_status": timing.sla_label,
        "is_overdue": timing.is_overdue,
        "is_due_soon": timing.is_due_soon,
        "assumed_policy": True,
        "policy_version": policy.version,
    }
