"""
Unit and Integration Tests for Multi-Department Coordination & Conflict Detection Engine.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.coordination.multi_dept_coordinator import MultiDepartmentCoordinator
from backend.conflicts.conflict_detector import RailwayConflictDetector


@pytest.fixture
def client():
    return TestClient(app)


def test_multi_department_canonical_coordination_example():
    """
    Validates the prompt's canonical example:
    - Engineering: Track maintenance
    - Traction: OHE inspection
    - Signal: Signal inspection
    Combined into single Integrated Shadow Block with substantial track hours saved.
    """
    rec = MultiDepartmentCoordinator.get_canonical_example("NDLS-TKD-UP")
    assert rec["section_code"] == "NDLS-TKD-UP"
    assert rec["block_type"] == "Integrated Shadow Block"
    assert set(rec["departments_involved"]) == {"ENG", "SNT", "TRD"}
    assert rec["tasks_count"] == 3

    # Total separate durations = 180 + 120 + 120 = 420 mins (7.0 hrs)
    assert rec["separate_total_minutes"] == 420
    # Combined duration = max(180, 120, 120) + 20m buffer = 200 mins (3.3 hrs)
    assert rec["combined_duration_minutes"] == 200
    # Track hours saved must be positive (> 3.0 hrs)
    assert rec["track_capacity_saved_hours"] >= 3.0
    # Train disruption reduction
    assert rec["train_disruption_reduction_pct"] >= 60

    # Safety checklist must contain 25kV power cut and S&T memo
    assert any("25kV" in c for c in rec["safety_checklist"])
    assert any("S&T" in c for c in rec["safety_checklist"])


def test_cross_department_compatibility_checking():
    """
    Tests pairwise compatibility logic between departmental tasks.
    """
    task_eng = {
        "title": "Mainline Turnout Tamping & Track Maintenance",
        "department": "ENG",
        "task_type": "Track Maintenance"
    }
    task_trd = {
        "title": "25kV Catenary Wire Dropper Inspection",
        "department": "TRD",
        "task_type": "OHE Inspection"
    }
    task_snt = {
        "title": "Point Machine Overhaul & Signal Alignment",
        "department": "SNT",
        "task_type": "Signal Inspection"
    }

    # ENG + TRD
    compat_eng_trd = MultiDepartmentCoordinator.check_task_pair_compatibility(task_eng, task_trd)
    assert compat_eng_trd["compatible"] is True
    assert compat_eng_trd["compatibility_score"] >= 80

    # ENG + SNT
    compat_eng_snt = MultiDepartmentCoordinator.check_task_pair_compatibility(task_eng, task_snt)
    assert compat_eng_snt["compatible"] is True
    assert compat_eng_snt["compatibility_score"] >= 80

    # Incompatible test: Live pantograph test + manual sleeper replacement
    task_incompatible_trd = {
        "title": "Dynamic Live Pantograph Energized Test Run",
        "department": "TRD"
    }
    task_incompatible_eng = {
        "title": "Manual Sleeper Replacement and Track Tie-bar Dismantling",
        "department": "ENG"
    }
    incompat = MultiDepartmentCoordinator.check_task_pair_compatibility(task_incompatible_trd, task_incompatible_eng)
    assert incompat["compatible"] is False
    assert incompat["compatibility_score"] == 0
    assert "PROHIBITED" in incompat["reason"]


def test_conflict_detector_all_six_categories():
    """
    Validates detection of all 6 required conflict types:
    1. Maintenance vs Train
    2. Maintenance vs Maintenance
    3. Block vs Block
    4. Department vs Department
    5. Resource vs Resource
    6. Safety Conflicts
    """
    result = RailwayConflictDetector.detect_all_conflicts()
    conflicts = result["conflicts"]
    summary = result["summary"]

    assert summary["total_conflicts"] >= 6
    assert summary["critical_count"] >= 1
    assert summary["high_count"] >= 1

    conflict_types_detected = {c["conflict_type"] for c in conflicts}
    required_types = {
        "Maintenance_vs_Train",
        "Maintenance_vs_Maintenance",
        "Block_vs_Block",
        "Department_vs_Department",
        "Resource_vs_Resource",
        "Safety_Conflict"
    }
    assert required_types.issubset(conflict_types_detected)

    # Validate each conflict has actionable recommended_resolution
    for c in conflicts:
        res = c.get("recommended_resolution")
        assert res is not None
        assert "action_code" in res
        assert "title" in res
        assert "details" in res


def test_api_get_conflicts_endpoints(client):
    """
    Tests GET /api/conflicts and GET /api/v1/conflicts with filters.
    """
    # Direct alias
    res1 = client.get("/api/conflicts")
    assert res1.status_code == 200
    data1 = res1.json()
    assert "summary" in data1
    assert len(data1["conflicts"]) >= 6

    # API v1 path
    res2 = client.get("/api/v1/conflicts")
    assert res2.status_code == 200

    # Severity filter
    res_crit = client.get("/api/conflicts?severity=Critical")
    assert res_crit.status_code == 200
    for c in res_crit.json()["conflicts"]:
        assert c["severity"] == "Critical"

    # Type filter
    res_type = client.get("/api/conflicts?conflict_type=Maintenance_vs_Train")
    assert res_type.status_code == 200
    for c in res_type.json()["conflicts"]:
        assert c["conflict_type"] == "Maintenance_vs_Train"


def test_api_post_conflicts_check_endpoint(client):
    """
    Tests POST /api/conflicts/check with daytime express collision and missing power block.
    """
    payload = {
        "section_code": "NDLS-TKD-UP",
        "start_time": "2026-09-17T09:00:00",
        "end_time": "2026-09-17T12:00:00",
        "block_type": "Traffic",
        "required_power_block": True
    }
    res = client.post("/api/conflicts/check", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["has_conflicts"] is True
    assert data["conflict_count"] >= 2
    assert data["risk_level"] in ("High", "Critical")
    assert data["can_proceed_safely"] is False
    assert len(data["recommended_resolutions"]) >= 2


def test_api_coordination_opportunities_and_combine(client):
    """
    Tests GET /api/coordination/opportunities and POST /api/coordination/combine-blocks.
    """
    # Opportunities
    res_opp = client.get("/api/coordination/opportunities?section_code=NDLS-TKD-UP")
    assert res_opp.status_code == 200
    data_opp = res_opp.json()
    assert "total_opportunities" in data_opp
    assert len(data_opp["recommendations"]) >= 1

    # Combine blocks
    res_comb = client.post("/api/coordination/combine-blocks", json={
        "section_code": "NDLS-TKD-UP",
        "tasks": []
    })
    assert res_comb.status_code == 200
    data_comb = res_comb.json()
    assert "Combined Integrated Shadow Block successfully formulated" in data_comb["message"]
    assert data_comb["block"]["block_type"] == "Integrated Shadow Block"


def test_api_resolve_conflict_endpoint(client):
    """
    Tests POST /api/conflicts/{id}/resolve.
    """
    res = client.post("/api/conflicts/CONF-2026-MVT-001/resolve?action_code=RESCHEDULE_TO_NIGHT_WINDOW")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Resolved"
    assert data["action_applied"] == "RESCHEDULE_TO_NIGHT_WINDOW"
    assert data["conflict_id"] == "CONF-2026-MVT-001"

