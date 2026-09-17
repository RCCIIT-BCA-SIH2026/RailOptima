import pytest
import os
import sys

# Ensure workspace root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.database import SessionLocal, engine, Base
from backend.app.models import (
    Role, Department, User, AuditLog,
    Corridor, RailwaySection,
    Asset, AssetHistory,
    Defect, MaintenanceTask,
    Train, TrainSchedule, TrainDelay,
    BlockPlan, Block, BlockTask, Conflict, Approval, AIRecommendation,
    Resource, ResourceAssignment,
    Alert, WhatIfScenario, IntegrationLog
)
from data.seed_data import seed_database

@pytest.fixture(scope="session", autouse=True)
def run_seed():
    seed_database()

def test_database_tables_count():
    # Verify all 24 required tables exist in metadata
    expected_tables = {
        "roles", "departments", "users", "audit_logs",
        "corridors", "railway_sections",
        "assets", "asset_history",
        "defects", "maintenance_tasks",
        "trains", "train_schedules", "train_delays",
        "block_plans", "blocks", "block_tasks", "conflicts", "approvals", "ai_recommendations",
        "resources", "resource_assignments",
        "alerts", "what_if_scenarios", "integration_logs"
    }
    actual_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(actual_tables), f"Missing tables: {expected_tables - actual_tables}"
    assert len(expected_tables) == 24, "Must have exactly 24 tables"

def test_minimum_data_thresholds():
    db = SessionLocal()
    try:
        # Check minimums specified in project requirements
        asset_count = db.query(Asset).count()
        defect_count = db.query(Defect).count()
        task_count = db.query(MaintenanceTask).count()
        train_count = db.query(Train).count()
        block_count = db.query(Block).count()
        resource_count = db.query(Resource).count()
        history_count = db.query(AssetHistory).count()

        print("\nVerified Data Counts:")
        print(f"Assets: {asset_count} (>=150)")
        print(f"Defects: {defect_count} (>=300)")
        print(f"Tasks: {task_count} (>=300)")
        print(f"Trains: {train_count} (>=150)")
        print(f"Blocks: {block_count} (>=75)")
        print(f"Resources: {resource_count} (>=50)")
        print(f"Asset History: {history_count} (>=500)")

        assert asset_count >= 150, f"Expected >= 150 assets, got {asset_count}"
        assert defect_count >= 300, f"Expected >= 300 defects, got {defect_count}"
        assert task_count >= 300, f"Expected >= 300 maintenance tasks, got {task_count}"
        assert train_count >= 150, f"Expected >= 150 trains, got {train_count}"
        assert block_count >= 75, f"Expected >= 75 blocks, got {block_count}"
        assert resource_count >= 50, f"Expected >= 50 resources, got {resource_count}"
        assert history_count >= 500, f"Expected >= 500 historical records, got {history_count}"

    finally:
        db.close()

def test_roles_and_departments():
    db = SessionLocal()
    try:
        roles = db.query(Role).all()
        departments = db.query(Department).all()
        users = db.query(User).all()

        role_names = {r.name for r in roles}
        dept_codes = {d.code for d in departments}

        assert "Admin" in role_names
        assert "DRM" in role_names
        assert "Sr_DEN" in role_names
        assert "Sr_DSTE" in role_names
        assert "Sr_DEE" in role_names
        assert "Sr_DOM" in role_names
        assert "Supervisor" in role_names

        assert {"ENG", "SNT", "TRD", "OPT"}.issubset(dept_codes)
        assert len(users) >= 8
    finally:
        db.close()

def test_relationships_and_foreign_keys():
    db = SessionLocal()
    try:
        # Check asset -> section -> corridor navigation
        sample_asset = db.query(Asset).first()
        assert sample_asset is not None
        assert sample_asset.section is not None
        assert sample_asset.section.corridor is not None
        assert sample_asset.department is not None

        # Check defect -> asset -> maintenance task navigation
        sample_defect = db.query(Defect).first()
        assert sample_defect is not None
        assert sample_defect.asset is not None
        assert sample_defect.department is not None

        # Check block -> AI recommendation navigation
        sample_block = db.query(Block).first()
        assert sample_block is not None
        assert len(sample_block.ai_recommendations) > 0
        assert sample_block.ai_recommendations[0].strategy_name is not None

    finally:
        db.close()

