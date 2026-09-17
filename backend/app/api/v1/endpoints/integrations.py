from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.services.integration_service import integration_service
from backend.integrations import MockTMSClient, MockSMMSClient, MockTDMSClient, MockCOAClient

router = APIRouter()

# ==============================================================================
# 1. TMS (Track Management System - Civil Engineering / P-Way)
# ==============================================================================

@router.get("/tms")
def get_tms_full_bundle(
    assets_count: int = Query(50, le=250),
    defects_count: int = Query(80, le=250),
    maintenance_count: int = Query(80, le=250)
):
    """
    Comprehensive Mock TMS API:
    Returns full bundle of Civil / Permanent Way assets, defects, and maintenance tasks.
    Marked as SIMULATED DEMO DATA.
    """
    return MockTMSClient.fetch_bundle(
        asset_count=assets_count,
        defect_count=defects_count,
        maintenance_count=maintenance_count
    )

@router.get("/tms/assets")
def get_tms_assets(count: int = Query(50, le=250)):
    """Simulated TMS API: Returns Civil / Permanent Way assets."""
    assets = MockTMSClient.fetch_assets(count=count)
    return {
        "system": "TMS",
        "system_full_name": "Track Management System (Civil / P-Way)",
        "total_assets": len(assets),
        "data_mode": MockTMSClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Track Management System Telemetry",
        "assets": assets
    }

@router.get("/tms/defects")
def get_tms_defects(count: int = Query(80, le=250)):
    """Simulated TMS API: Returns track defects (USFD flaw detection, gauge widening, TGI)."""
    defects = MockTMSClient.fetch_defects(count=count)
    return {
        "system": "TMS",
        "system_full_name": "Track Management System (Civil / P-Way)",
        "total_defects": len(defects),
        "data_mode": MockTMSClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Track Management System Telemetry",
        "defects": defects
    }

@router.get("/tms/maintenance")
def get_tms_maintenance(count: int = Query(80, le=250)):
    """Simulated TMS API: Returns P-Way scheduled maintenance tasks."""
    tasks = MockTMSClient.fetch_maintenance(count=count)
    return {
        "system": "TMS",
        "system_full_name": "Track Management System (Civil / P-Way)",
        "total_tasks": len(tasks),
        "data_mode": MockTMSClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Track Management System Telemetry",
        "maintenance_tasks": tasks
    }


# ==============================================================================
# 2. SMMS (Signalling Maintenance & Management System - S&T)
# ==============================================================================

@router.get("/smms")
def get_smms_full_bundle(
    assets_count: int = Query(40, le=250),
    defects_count: int = Query(70, le=250),
    maintenance_count: int = Query(70, le=250)
):
    """
    Comprehensive Mock SMMS API:
    Returns full bundle of Signalling assets, defects, and maintenance tasks.
    Marked as SIMULATED DEMO DATA.
    """
    return MockSMMSClient.fetch_bundle(
        asset_count=assets_count,
        defect_count=defects_count,
        maintenance_count=maintenance_count
    )

@router.get("/smms/assets")
def get_smms_assets(count: int = Query(40, le=250)):
    """Simulated SMMS API: Returns S&T assets (Point machines, AFTC, signals, axle counters)."""
    assets = MockSMMSClient.fetch_assets(count=count)
    return {
        "system": "SMMS",
        "system_full_name": "Signalling Maintenance & Management System (S&T)",
        "total_assets": len(assets),
        "data_mode": MockSMMSClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Signalling Maintenance & Management Feed",
        "assets": assets
    }

@router.get("/smms/defects")
def get_smms_defects(count: int = Query(70, le=250)):
    """Simulated SMMS API: Returns signalling defects and telemetry anomalies."""
    defects = MockSMMSClient.fetch_defects(count=count)
    return {
        "system": "SMMS",
        "system_full_name": "Signalling Maintenance & Management System (S&T)",
        "total_defects": len(defects),
        "data_mode": MockSMMSClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Signalling Maintenance & Management Feed",
        "defects": defects
    }

@router.get("/smms/maintenance")
def get_smms_maintenance(count: int = Query(70, le=250)):
    """Simulated SMMS API: Returns S&T scheduled maintenance tasks."""
    tasks = MockSMMSClient.fetch_maintenance(count=count)
    return {
        "system": "SMMS",
        "system_full_name": "Signalling Maintenance & Management System (S&T)",
        "total_tasks": len(tasks),
        "data_mode": MockSMMSClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Signalling Maintenance & Management Feed",
        "maintenance_tasks": tasks
    }


# ==============================================================================
# 3. TDMS (Traction Distribution Management System - Electrical / TRD)
# ==============================================================================

@router.get("/tdms")
def get_tdms_full_bundle(
    assets_count: int = Query(40, le=250),
    defects_count: int = Query(70, le=250),
    maintenance_count: int = Query(70, le=250)
):
    """
    Comprehensive Mock TDMS API:
    Returns full bundle of 25kV OHE assets, defects, and maintenance tasks.
    Marked as SIMULATED DEMO DATA.
    """
    return MockTDMSClient.fetch_bundle(
        asset_count=assets_count,
        defect_count=defects_count,
        maintenance_count=maintenance_count
    )

@router.get("/tdms/assets")
def get_tdms_assets(count: int = Query(40, le=250)):
    """Simulated TDMS API: Returns TRD assets (25kV OHE catenary, substations, masts)."""
    assets = MockTDMSClient.fetch_assets(count=count)
    return {
        "system": "TDMS",
        "system_full_name": "Traction Distribution Management System (Electrical / TRD)",
        "total_assets": len(assets),
        "data_mode": MockTDMSClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Traction Distribution Telemetry Feed",
        "assets": assets
    }

@router.get("/tdms/defects")
def get_tdms_defects(count: int = Query(70, le=250)):
    """Simulated TDMS API: Returns traction defects (catenary sag, wire wear, flashovers)."""
    defects = MockTDMSClient.fetch_defects(count=count)
    return {
        "system": "TDMS",
        "system_full_name": "Traction Distribution Management System (Electrical / TRD)",
        "total_defects": len(defects),
        "data_mode": MockTDMSClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Traction Distribution Telemetry Feed",
        "defects": defects
    }

@router.get("/tdms/maintenance")
def get_tdms_maintenance(count: int = Query(70, le=250)):
    """Simulated TDMS API: Returns TRD scheduled maintenance and tower wagon jobs."""
    tasks = MockTDMSClient.fetch_maintenance(count=count)
    return {
        "system": "TDMS",
        "system_full_name": "Traction Distribution Management System (Electrical / TRD)",
        "total_tasks": len(tasks),
        "data_mode": MockTDMSClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Traction Distribution Telemetry Feed",
        "maintenance_tasks": tasks
    }


# ==============================================================================
# 4. COA (Control Office Application - Operating / Traffic)
# ==============================================================================

@router.get("/coa")
def get_coa_full_bundle(
    train_count: int = Query(100, le=250),
    block_count: int = Query(50, le=100),
    forecast_hours: int = Query(24, le=72)
):
    """
    Comprehensive Mock COA API:
    Returns full bundle of Train Timetable, Corridors, Available Blocks, and Goods Forecast.
    Marked as SIMULATED DEMO DATA.
    """
    return MockCOAClient.fetch_bundle(
        train_count=train_count,
        block_count=block_count,
        forecast_hours=forecast_hours
    )

@router.get("/coa/trains")
def get_coa_trains(count: int = Query(100, le=250)):
    """Simulated COA API: Returns live train positions, speeds, and punctuality timetable."""
    trains = MockCOAClient.fetch_trains(count=count)
    return {
        "system": "COA",
        "system_full_name": "Control Office Application (Traffic Dispatching)",
        "total_trains": len(trains),
        "data_mode": MockCOAClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Control Office Application Telemetry",
        "trains": trains
    }

@router.get("/coa/corridors")
def get_coa_corridors():
    """Simulated COA API: Returns corridor capacity, speed limits, and traffic density."""
    corridors = MockCOAClient.fetch_corridors()
    return {
        "system": "COA",
        "system_full_name": "Control Office Application (Traffic Dispatching)",
        "total_corridors": len(corridors),
        "data_mode": MockCOAClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Control Office Application Telemetry",
        "corridors": corridors
    }

@router.get("/coa/blocks")
def get_coa_blocks(count: int = Query(50, le=100)):
    """Simulated COA API: Returns available maintenance block windows across sections."""
    blocks = MockCOAClient.fetch_blocks(count=count)
    return {
        "system": "COA",
        "system_full_name": "Control Office Application (Traffic Dispatching)",
        "total_blocks": len(blocks),
        "data_mode": MockCOAClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Control Office Application Telemetry",
        "blocks": blocks
    }

@router.get("/coa/goods-forecast")
def get_coa_goods_forecast(horizon_hours: int = Query(24, le=72)):
    """Simulated COA API: Returns 24-48h goods freight train forecast (BOXN, BCN, BTPN, CONCOR)."""
    forecast = MockCOAClient.fetch_goods_forecast(horizon_hours=horizon_hours)
    return {
        "system": "COA",
        "system_full_name": "Control Office Application (Traffic Dispatching)",
        "data_mode": MockCOAClient.DATA_MODE,
        "disclaimer": "SIMULATED DEMO DATA - Mock Control Office Application Telemetry",
        "forecast": forecast
    }


# ==============================================================================
# 5. System Health Status & Normalization Service
# ==============================================================================

@router.get("/status")
def get_integrations_status(db: Session = Depends(get_db)):
    """Returns connectivity, latency, and telemetry across TMS, SMMS, TDMS, and COA."""
    return integration_service.get_system_telemetry(db)

@router.post("/sync/{system_name}")
def trigger_system_sync(system_name: str, count: int = Query(10, le=50), db: Session = Depends(get_db)):
    """
    Executes normalization pipeline:
    1. Fetches raw data from external mock API
    2. Normalizes into internal schema (calculates AI priority, maps section)
    3. Persists records to PostgreSQL
    4. Records immutable IntegrationLog entry
    """
    try:
        result = integration_service.sync_and_normalize(system_name, db, count=count)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
