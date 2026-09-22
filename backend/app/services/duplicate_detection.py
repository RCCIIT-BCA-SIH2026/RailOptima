"""
duplicate_detection.py  —  Advisory Defect Duplicate Detection
===============================================================
Ported and adapted from Pashupatastra (AryanRajguru22/Pashupatastra-sih26027).

WHAT A DUPLICATE IS HERE
    Two field workers independently reporting what may be the same defect.
    This is NOT the same as a retried HTTP request (handled by idempotency).
    A possible duplicate ALWAYS creates a second record — this engine only
    attaches an advisory flag that a human reviewer can act on.

NON-NEGOTIABLE RULE
    Detection NEVER deletes, merges, rejects, or modifies any report.
    It produces an advisory record, immutably stored alongside the defect.
    A worker who walked to a fault and filed a report must never see it
    vanish because an algorithm found it "familiar."

THE RULE  (deterministic-proximity-1.0)
    An existing, non-terminal defect is flagged as a possible duplicate iff
    ALL of these signals fire simultaneously:

    SAME_DEPT       same department_id
    SAME_SECTION    same section_id
    SAME_SEVERITY   same severity tier
    SAME_TYPE       same defect_type
    LOCATION_NEAR   location strings share ≥60% token similarity  (fuzzy)
    TIME_NEAR       reported within `window_hours` of each other (default 72h)

    Deliberately conservative: it would rather miss a duplicate than
    incorrectly flag two separate defects and create confusion.

THRESHOLDS (all injectable via DuplicatePolicy)
    window_hours    72      — reports older than 3 days are out of scope
    similarity_pct  0.60    — Jaccard token similarity threshold
    max_candidates  10      — look at the 10 most recent open defects only
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger("railoptima.duplicate_detection")

DUPLICATE_RULE_VERSION = "deterministic-proximity-1.0"

SIGNAL_SAME_DEPT = "SAME_DEPT"
SIGNAL_SAME_SECTION = "SAME_SECTION"
SIGNAL_SAME_SEVERITY = "SAME_SEVERITY"
SIGNAL_SAME_TYPE = "SAME_TYPE"
SIGNAL_LOCATION_NEAR = "LOCATION_NEAR"
SIGNAL_TIME_NEAR = "TIME_NEAR"

_ALL_SIGNALS = (
    SIGNAL_SAME_DEPT,
    SIGNAL_SAME_SECTION,
    SIGNAL_SAME_SEVERITY,
    SIGNAL_SAME_TYPE,
    SIGNAL_LOCATION_NEAR,
    SIGNAL_TIME_NEAR,
)

# Terminal statuses — defects in these states are excluded from candidate pool
TERMINAL_STATUSES = frozenset({"Resolved", "Closed", "Cancelled"})


@dataclass(frozen=True)
class DuplicatePolicy:
    """
    Configurable thresholds for the duplicate detection rule.

    All instances are immutable after construction.
    """
    window_hours: float = 72.0
    similarity_pct: float = 0.60
    max_candidates: int = 10
    rule_version: str = DUPLICATE_RULE_VERSION

    def window_delta(self) -> timedelta:
        return timedelta(hours=self.window_hours)


DEFAULT_POLICY = DuplicatePolicy()


@dataclass
class DuplicateCandidate:
    """Represents a single existing defect that may be a duplicate."""
    existing_id: int
    existing_code: str
    signals_matched: List[str]
    signals_total: int
    similarity_score: float       # fraction of signals that matched [0-1]
    location_similarity: float    # Jaccard token similarity [0-1]
    is_likely_duplicate: bool
    rule_version: str


@dataclass
class DuplicateAssessment:
    """
    Full advisory assessment for a newly-created defect.

    has_likely_duplicates: True  → at least one strong candidate found
    candidates:           List of DuplicateCandidate (ordered by similarity desc)
    advisory:             Human-readable advisory message
    rule_version:         Version of the detection algorithm used
    """
    has_likely_duplicates: bool
    candidates: List[DuplicateCandidate]
    advisory: str
    rule_version: str
    assumed: bool = True  # policy thresholds are engineering demo values

    def to_dict(self) -> Dict[str, Any]:
        return {
            "has_likely_duplicates": self.has_likely_duplicates,
            "candidate_count": len(self.candidates),
            "candidates": [
                {
                    "existing_id": c.existing_id,
                    "existing_code": c.existing_code,
                    "signals_matched": c.signals_matched,
                    "similarity_score": c.similarity_score,
                    "location_similarity": round(c.location_similarity, 3),
                    "is_likely_duplicate": c.is_likely_duplicate,
                }
                for c in self.candidates
            ],
            "advisory": self.advisory,
            "rule_version": self.rule_version,
            "assumed_thresholds": self.assumed,
        }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _tokenise(text: Optional[str]) -> frozenset:
    """Splits a location/description string into lowercase word tokens."""
    if not text:
        return frozenset()
    return frozenset(re.findall(r"[a-z0-9]+", text.lower()))


def _jaccard(a: frozenset, b: frozenset) -> float:
    """Jaccard similarity between two token sets. Returns 0.0 if both empty."""
    if not a and not b:
        return 1.0      # both empty → treated as identical
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union > 0 else 0.0


def _check_signals(
    new_defect: Dict[str, Any],
    existing_defect: Dict[str, Any],
    policy: DuplicatePolicy,
    reported_at: datetime,
) -> DuplicateCandidate:
    """
    Evaluates all 6 signals for a (new, existing) defect pair.
    Returns a DuplicateCandidate with matched signals recorded.
    """
    matched: List[str] = []

    # SAME_DEPT
    if (new_defect.get("department_id") is not None
            and new_defect.get("department_id") == existing_defect.get("department_id")):
        matched.append(SIGNAL_SAME_DEPT)

    # SAME_SECTION
    if (new_defect.get("section_id") is not None
            and new_defect.get("section_id") == existing_defect.get("section_id")):
        matched.append(SIGNAL_SAME_SECTION)

    # SAME_SEVERITY
    if (str(new_defect.get("severity", "")).lower()
            == str(existing_defect.get("severity", "")).lower()):
        matched.append(SIGNAL_SAME_SEVERITY)

    # SAME_TYPE
    if (str(new_defect.get("defect_type", "")).lower()
            == str(existing_defect.get("defect_type", "")).lower()):
        matched.append(SIGNAL_SAME_TYPE)

    # LOCATION_NEAR (Jaccard token similarity)
    loc_a = _tokenise(new_defect.get("location"))
    loc_b = _tokenise(existing_defect.get("location"))
    loc_sim = _jaccard(loc_a, loc_b)
    if loc_sim >= policy.similarity_pct:
        matched.append(SIGNAL_LOCATION_NEAR)

    # TIME_NEAR — existing defect reported within window of new defect
    existing_reported = existing_defect.get("reported_at")
    if isinstance(existing_reported, datetime):
        time_gap = abs((reported_at - existing_reported).total_seconds())
        if time_gap <= policy.window_delta().total_seconds():
            matched.append(SIGNAL_TIME_NEAR)

    is_likely = len(matched) == len(_ALL_SIGNALS)   # ALL signals must match
    similarity_score = len(matched) / len(_ALL_SIGNALS)

    return DuplicateCandidate(
        existing_id=existing_defect.get("id", -1),
        existing_code=str(existing_defect.get("defect_code", "UNKNOWN")),
        signals_matched=matched,
        signals_total=len(_ALL_SIGNALS),
        similarity_score=round(similarity_score, 3),
        location_similarity=loc_sim,
        is_likely_duplicate=is_likely,
        rule_version=DUPLICATE_RULE_VERSION,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def assess_duplicate(
    new_defect: Dict[str, Any],
    existing_defects: List[Dict[str, Any]],
    reported_at: Optional[datetime] = None,
    policy: DuplicatePolicy = DEFAULT_POLICY,
) -> DuplicateAssessment:
    """
    Evaluates a newly-reported defect against a list of recent open defects
    to produce an advisory duplicate assessment.

    Args:
        new_defect:       Dict with at least: department_id, section_id,
                          severity, defect_type, location.
        existing_defects: List of recent non-terminal defects (serialized dicts).
                          Should already be filtered to non-terminal statuses.
        reported_at:      Reporting timestamp of the new defect (default: now).
        policy:           DuplicatePolicy with configurable thresholds.

    Returns:
        DuplicateAssessment — advisory only, never modifies anything.
    """
    if reported_at is None:
        reported_at = datetime.utcnow()

    # Filter: only consider non-terminal defects within the time window
    window_start = reported_at - policy.window_delta()
    candidates: List[DuplicateCandidate] = []

    for existing in existing_defects[:policy.max_candidates]:
        # Skip terminal statuses
        if str(existing.get("status", "")).strip() in TERMINAL_STATUSES:
            continue

        # Skip defects outside the time window
        existing_reported = existing.get("reported_at")
        if isinstance(existing_reported, datetime):
            if existing_reported < window_start:
                continue

        result = _check_signals(new_defect, existing, policy, reported_at)
        candidates.append(result)

    # Sort by similarity score descending (most likely duplicates first)
    candidates.sort(key=lambda c: c.similarity_score, reverse=True)

    likely = [c for c in candidates if c.is_likely_duplicate]
    has_likely = len(likely) > 0

    if has_likely:
        advisory = (
            f"⚠ ADVISORY: {len(likely)} possible duplicate(s) detected. "
            f"Most similar: {likely[0].existing_code} (signals: {', '.join(likely[0].signals_matched)}). "
            f"No action taken — human review required. Rule: {DUPLICATE_RULE_VERSION}."
        )
    elif candidates and candidates[0].similarity_score >= 0.5:
        advisory = (
            f"ℹ NOTICE: Partial similarity found with {candidates[0].existing_code} "
            f"({candidates[0].similarity_score*100:.0f}% signal match). "
            f"Defect recorded. Monitor for patterns. Rule: {DUPLICATE_RULE_VERSION}."
        )
    else:
        advisory = f"✓ No duplicates detected. Rule: {DUPLICATE_RULE_VERSION}."

    return DuplicateAssessment(
        has_likely_duplicates=has_likely,
        candidates=candidates,
        advisory=advisory,
        rule_version=DUPLICATE_RULE_VERSION,
    )
