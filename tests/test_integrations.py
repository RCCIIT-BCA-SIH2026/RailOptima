import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models import IntegrationLog, Defect, Asset, MaintenanceTask, Train, Block
from backend.app.services.integration_service import integration_service
from backend.integrations import MockTMSClient, MockSMMSClient, MockTDMSClient, MockCOAClient

client = TestClient(app)

@pytest.fixture
def db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_tms_root_and_bundle_endpoint():
    """Verify /api/integrations/tms returns full bundle with >=50 assets, >=80 defects, >=80 tasks."""
    res = client.get("/api/integrations/tms")
    assert res.status_code == 200
    data = res.json()
    assert data["system"] == "TMS"
    assert data["data_mode"] == "SIMULATED DEMO DATA"
    assert "SIMULATED DEMO DATA" in data["disclaimer"]
    assert data["total_assets"] >= 50
    assert data["total_defects"] >= 80
    assert data["total_maintenance_tasks"] >= 80
    assert len(data["assets"]) >= 50
    assert len(data["defects"]) >= 80
    assert len(data["maintenance_tasks"]) >= 80

def test_smms_root_and_bundle_endpoint():
    """Verify /api/integrations/smms returns full bundle with >=40 assets, >=70 defects, >=70 tasks."""
    res = client.get("/api/integrations/smms")
    assert res.status_code == 200
    data = res.json()
    assert data["system"] == "SMMS"
    assert data["data_mode"] == "SIMULATED DEMO DATA"
    assert data["total_assets"] >= 40
    assert data["total_defects"] >= 70
    assert data["total_maintenance_tasks"] >= 70
    assert len(data["assets"]) >= 40
    assert len(data["defects"]) >= 70
    assert len(data["maintenance_tasks"]) >= 70

def test_tdms_root_and_bundle_endpoint():
    """Verify /api/integrations/tdms returns full bundle with >=40 assets, >=70 defects, >=70 tasks."""
    res = client.get("/api/integrations/tdms")
    assert res.status_code == 200
    data = res.json()
    assert data["system"] == "TDMS"
    assert data["data_mode"] == "SIMULATED DEMO DATA"
    assert data["total_assets"] >= 40
    assert data["total_defects"] >= 70
    assert data["total_maintenance_tasks"] >= 70
    assert len(data["assets"]) >= 40
    assert len(data["defects"]) >= 70
    assert len(data["maintenance_tasks"]) >= 70

def test_coa_root_and_bundle_endpoint():
    """Verify /api/integrations/coa returns >=100 trains, corridors, >=50 available blocks, goods forecast."""
    res = client.get("/api/integrations/coa")
    assert res.status_code == 200
    data = res.json()
    assert data["system"] == "COA"
    assert data["data_mode"] == "SIMULATED DEMO DATA"
    assert data["total_trains"] >= 100
    assert data["total_corridors"] >= 8
    assert data["total_available_blocks"] >= 50
    assert len(data["trains"]) >= 100
    assert len(data["corridors"]) >= 8
    assert len(data["available_blocks"]) >= 50
    assert "goods_train_forecast" in data
    assert data["goods_train_forecast"]["total_projected_freight_trains"] >= 40

def test_cumulative_threshold_volumes():
    """Verify cumulative system volume thresholds (>=100 assets, >=200 defects, >=200 tasks, >=100 trains, >=50 blocks)."""
    tms = client.get("/api/integrations/tms").json()
    smms = client.get("/api/integrations/smms").json()
    tdms = client.get("/api/integrations/tdms").json()
    coa = client.get("/api/integrations/coa").json()

    total_assets = tms["total_assets"] + smms["total_assets"] + tdms["total_assets"]
    total_defects = tms["total_defects"] + smms["total_defects"] + tdms["total_defects"]
    total_tasks = tms["total_maintenance_tasks"] + smms["total_maintenance_tasks"] + tdms["total_maintenance_tasks"]
    total_trains = coa["total_trains"]
    total_blocks = coa["total_available_blocks"]

    assert total_assets >= 100, f"Expected >=100 assets, got {total_assets}"
    assert total_defects >= 200, f"Expected >=200 defects, got {total_defects}"
    assert total_tasks >= 200, f"Expected >=200 maintenance tasks, got {total_tasks}"
    assert total_trains >= 100, f"Expected >=100 trains, got {total_trains}"
    assert total_blocks >= 50, f"Expected >=50 blocks, got {total_blocks}"

def test_realistic_indian_railway_locations():
    """Verify realistic Indian Railways station, section, and corridor codes."""
    coa_corridors = client.get("/api/integrations/coa/corridors").json()["corridors"]
    corridor_codes = [c["corridor_code"] for c in coa_corridors]
    assert "NDLS-AGC" in corridor_codes
    assert "VGLJ-BPL" in corridor_codes
    assert "CNB-PRYJ" in corridor_codes

    tms_defects = client.get("/api/integrations/tms/defects?count=10").json()["defects"]
    for d in tms_defects:
        assert any(sec_prefix in d["section_code"] for sec_prefix in ["NDLS", "TKD", "PWL", "MTJ", "AGC", "VGLJ", "CNB", "PRYJ"])

def test_individual_sub_endpoints():
    """Verify individual sub-endpoints for each system."""
    res_tms_a = client.get("/api/integrations/tms/assets?count=10")
    assert res_tms_a.status_code == 200
    assert "SIMULATED" in res_tms_a.json()["data_mode"]

    res_smms_d = client.get("/api/integrations/smms/defects?count=10")
    assert res_smms_d.status_code == 200
    assert len(res_smms_d.json()["defects"]) == 10

    res_tdms_m = client.get("/api/integrations/tdms/maintenance?count=10")
    assert res_tdms_m.status_code == 200
    assert len(res_tdms_m.json()["maintenance_tasks"]) == 10

    res_coa_t = client.get("/api/integrations/coa/trains?count=20")
    assert res_coa_t.status_code == 200
    assert len(res_coa_t.json()["trains"]) == 20

def test_integration_service_converters(db: Session):
    """Verify integration service converters transform external models into internal ORM models."""
    raw_defect = {
        "source_system": "TMS",
        "defect_type": "Ultrasonic Flaw",
        "severity": "Critical",
        "speed_restriction_imposed": 30,
        "reported_at": "2026-09-16T12:00:00"
    }
    internal_defect = integration_service.convert_external_defect_to_internal(
        raw=raw_defect, dept_id=1, sec_id=1, asset_id=1, track_density_gmt=65.0, asset_health=70.0
    )
    assert isinstance(internal_defect, Defect)
    assert internal_defect.severity == "Critical"
    assert internal_defect.calculated_priority_score > 70.0

    raw_asset = {
        "source_system": "SMMS",
        "asset_type": "Point_Machine",
        "asset_name": "Electric Point Machine #14",
        "section_code": "NDLS-TKD-UP",
        "health_score": 88.0,
        "last_inspected": "2026-09-10T10:00:00"
    }
    internal_asset = integration_service.convert_external_asset_to_internal(raw_asset, dept_id=2, sec_id=1)
    assert isinstance(internal_asset, Asset)
    assert internal_asset.health_score == 88.0

    raw_train = {
        "train_no": "22436",
        "train_name": "Vande Bharat Express",
        "train_type": "Premium_Superfast",
        "origin_station": "NDLS",
        "destination_station": "BSB",
        "is_freight": False
    }
    internal_train = integration_service.convert_external_train_to_internal(raw_train, sec_id=1)
    assert isinstance(internal_train, Train)
    assert internal_train.train_no == "22436"
    assert internal_train.priority_level == 1

def test_normalization_and_audit_logging(db: Session):
    """Verify POST /api/integrations/sync/{system} ingests records and logs transaction."""
    init_logs = db.query(IntegrationLog).count()

    res = client.post("/api/integrations/sync/TMS?count=5")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Success"
    assert data["records_ingested"] == 5
    assert data["data_mode"] == "SIMULATED DEMO DATA"

    # Verify audit log was recorded
    assert db.query(IntegrationLog).count() == init_logs + 1
