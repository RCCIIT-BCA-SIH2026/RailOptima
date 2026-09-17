import pytest
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.optimization.conflict_detector import ConflictDetector
from backend.optimization.block_optimizer import ORToolsBlockOptimizer
from backend.optimization.alternative_generator import AlternativeGenerator

def test_conflict_detector_spatial_overlap():
    now = datetime.utcnow()
    blocks = [
        {
            "id": 101,
            "block_code": "BLK-01",
            "section_id": 1,
            "start_time": now,
            "end_time": now + timedelta(hours=3),
            "block_type": "Traffic"
        },
        {
            "id": 102,
            "block_code": "BLK-02",
            "section_id": 1, # Same section
            "start_time": now + timedelta(hours=1), # Overlapping
            "end_time": now + timedelta(hours=4),
            "block_type": "Power"
        }
    ]
    overlaps = ConflictDetector.detect_block_overlaps(blocks)
    assert len(overlaps) == 1
    assert overlaps[0]["conflict_type"] == "Spatial_Overlap"
    assert overlaps[0]["severity"] == "High"

def test_conflict_detector_train_clash():
    now = datetime.utcnow()
    blocks = [
        {
            "id": 201,
            "block_code": "BLK-03",
            "section_id": 2,
            "start_time": now,
            "end_time": now + timedelta(hours=3)
        }
    ]
    train_schedules = [
        {
            "train_id": 55,
            "train_no": "22436",
            "train_name": "Vande Bharat Express",
            "section_id": 2,
            "scheduled_entry_time": now + timedelta(minutes=45),
            "scheduled_exit_time": now + timedelta(minutes=75),
            "train_priority": 1
        }
    ]
    clashes = ConflictDetector.detect_train_path_clashes(blocks, train_schedules)
    assert len(clashes) == 1
    assert clashes[0]["conflict_type"] == "Train_Path_Clash"
    assert clashes[0]["severity"] == "High"

def test_conflict_detector_resource_contention():
    now = datetime.utcnow()
    assignments = [
        {"resource_id": 10, "resource_code": "RES-BCM-01", "block_id": 1, "start_time": now, "end_time": now + timedelta(hours=3)},
        {"resource_id": 10, "resource_code": "RES-BCM-01", "block_id": 2, "start_time": now + timedelta(hours=1), "end_time": now + timedelta(hours=4)}
    ]
    contentions = ConflictDetector.detect_resource_contention(assignments)
    assert len(contentions) == 1
    assert contentions[0]["conflict_type"] == "Resource_Contention"

def test_or_tools_block_optimizer():
    optimizer = ORToolsBlockOptimizer(time_limit_seconds=5)
    sample_tasks = [
        {"id": 1, "section_id": 1, "department_id": 1, "department_code": "ENG", "title": "Track Tamping", "duration_minutes": 180, "priority_score": 92.0},
        {"id": 2, "section_id": 1, "department_id": 3, "department_code": "TRD", "title": "OHE Catenary Inspection", "duration_minutes": 150, "priority_score": 85.0},
        {"id": 3, "section_id": 2, "department_id": 2, "department_code": "SNT", "title": "Point Machine Overhaul", "duration_minutes": 120, "priority_score": 74.0}
    ]
    res = optimizer.optimize(tasks=sample_tasks, train_schedules=[], resources=[], horizon_hours=24)
    assert res["solver_status"] in ["OPTIMAL", "FEASIBLE"]
    assert res["total_blocks_created"] > 0
    assert res["defects_cleared"] == 3
    assert len(res["blocks"]) > 0

def test_alternative_generator():
    sample_tasks = [
        {"id": 1, "section_id": 1, "department_id": 1, "department_code": "ENG", "title": "Track Deep Screening", "duration_minutes": 180, "priority_score": 88.0},
        {"id": 2, "section_id": 1, "department_id": 3, "department_code": "TRD", "title": "OHE Wire Renewal", "duration_minutes": 180, "priority_score": 82.0}
    ]
    alternatives = AlternativeGenerator.generate_alternatives(tasks=sample_tasks, train_schedules=[], resources=[], horizon_hours=24)
    assert len(alternatives) == 3
    
    # Check Alternative 1: Balanced (Recommended)
    alt1 = alternatives[0]
    assert alt1["strategy_code"] == "BALANCED"
    assert alt1["is_recommended"] is True

    # Check Alternative 2: Aggressive Maintenance
    alt2 = alternatives[1]
    assert alt2["strategy_code"] == "AGGRESSIVE"

    # Check Alternative 3: Zero Passenger Disruption
    alt3 = alternatives[2]
    assert alt3["strategy_code"] == "ZERO_PASSENGER_DISRUPTION"
    assert alt3["passenger_delay_minutes"] == 0

