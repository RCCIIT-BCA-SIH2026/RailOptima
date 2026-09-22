"""
asset_prognostics.py  —  Asset Prognostics API Endpoints
=========================================================
New API endpoints for the Deep Learning Asset Prognostics Engine
(RailTrackDefectDNN / AssetDegradationML fallback).

Endpoints:
  POST /api/ai/prognostics         Single asset telemetry inference
  POST /api/ai/prognostics/batch   Batch inference for multiple assets
  GET  /api/ai/prognostics/health  Engine status & backend info
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.asset import Asset
from backend.app.api.deps import get_current_user_optional
from backend.app.models.user import User

logger = logging.getLogger("railoptima.prognostics_endpoint")

router = APIRouter()

# ---------------------------------------------------------------------------
# Lazy-import the engine so the router can load even if ML deps are missing
# ---------------------------------------------------------------------------
def _get_engine():
    try:
        from ml.asset_prognostics_dnn import prognostics_engine
        return prognostics_engine
    except ImportError as exc:
        logger.error("Could not load asset_prognostics_dnn: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class AssetTelemetryInput(BaseModel):
    """
    Single-asset telemetry input for the prognostics engine.
    All fields have sensible Indian Railways trunk-route defaults.
    """
    # Asset identifier (optional — used to enrich response from DB)
    asset_id: Optional[int] = Field(None, description="DB asset ID to auto-fill telemetry from records.")

    # Telemetry features
    gmt_tonnage: float = Field(45.0, description="Gross Million Tonnes per annum on section.", ge=0.0)
    asset_age_years: float = Field(8.0, description="Asset age in years since commissioning.", ge=0.0)
    operating_temp_c: float = Field(32.0, description="Ambient rail temperature °C.")
    curvature_deg: float = Field(1.0, description="Track curvature in degrees.", ge=0.0)
    days_since_maintenance: float = Field(30.0, description="Days since last inspection/tamping.", ge=0.0)
    prior_flaw_count: float = Field(1.0, description="Historical count of prior defects.", ge=0.0)
    has_speed_restriction: bool = Field(False, description="Active Permanent Speed Restriction.")
    traffic_density_trains_per_day: float = Field(140.0, description="Trains per day on section.", ge=0.0)
    coastal_salinity_factor: float = Field(0.0, description="Salinity exposure [0-1]. 1 = coastal/brackish.", ge=0.0, le=1.0)


class PrognosticsResult(BaseModel):
    failure_probability_7d: float
    expected_delay_cascade_mins: float
    remaining_useful_life_gmt: float
    risk_tier: str
    backend_used: str


class AssetPrognosticsResponse(BaseModel):
    asset_id: Optional[int] = None
    asset_code: Optional[str] = None
    asset_name: Optional[str] = None
    prognostics: PrognosticsResult
    model_note: str = (
        "Predictions use synthetic RDSO-calibrated training data. "
        "Results are engineering estimates, not certified IR safety assessments."
    )


class BatchTelemetryInput(BaseModel):
    records: List[AssetTelemetryInput] = Field(..., min_length=1, max_length=100)


class BatchPrognosticsResponse(BaseModel):
    total_records: int
    results: List[AssetPrognosticsResponse]
    backend_used: str


class PrognosticsHealthResponse(BaseModel):
    status: str
    backend: str
    torch_available: bool
    sklearn_available: bool
    model_note: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _telemetry_to_dict(t: AssetTelemetryInput) -> Dict[str, Any]:
    return {
        "gmt_tonnage": t.gmt_tonnage,
        "asset_age_years": t.asset_age_years,
        "operating_temp_c": t.operating_temp_c,
        "curvature_deg": t.curvature_deg,
        "days_since_maintenance": t.days_since_maintenance,
        "prior_flaw_count": t.prior_flaw_count,
        "has_speed_restriction": t.has_speed_restriction,
        "traffic_density_trains_per_day": t.traffic_density_trains_per_day,
        "coastal_salinity_factor": t.coastal_salinity_factor,
    }


def _enrich_from_db(asset_id: int, db: Session) -> Dict[str, Optional[str]]:
    """Fetches asset metadata from DB to enrich the response."""
    try:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if asset:
            return {
                "asset_code": asset.asset_code,
                "asset_name": asset.asset_name,
                "health_score": asset.health_score,
            }
    except Exception:
        pass
    return {"asset_code": None, "asset_name": None, "health_score": None}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/health", response_model=PrognosticsHealthResponse)
def prognostics_health():
    """Returns the current backend status of the Asset Prognostics Engine."""
    import importlib.util
    torch_ok = importlib.util.find_spec("torch") is not None
    sklearn_ok = importlib.util.find_spec("sklearn") is not None

    engine = _get_engine()
    backend = engine.backend if engine else "unavailable"
    health_status = "healthy" if engine else "degraded"

    return PrognosticsHealthResponse(
        status=health_status,
        backend=backend,
        torch_available=torch_ok,
        sklearn_available=sklearn_ok,
        model_note=(
            "RailTrackDefectDNN (PyTorch) active." if torch_ok
            else "sklearn fallback active." if sklearn_ok
            else "Formula fallback active."
        ),
    )


@router.post("", response_model=AssetPrognosticsResponse)
def predict_asset_prognostics(
    payload: AssetTelemetryInput,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Runs the Asset Prognostics DNN on a single asset telemetry record.

    Returns:
    - **failure_probability_7d**: probability of in-service failure within 7 days
    - **expected_delay_cascade_mins**: predicted passenger delay cascade
    - **remaining_useful_life_gmt**: Remaining Useful Life in Gross Million Tonnes
    - **risk_tier**: human-readable risk category with recommended action window
    """
    engine = _get_engine()
    if engine is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Asset Prognostics Engine is currently unavailable.",
        )

    # If asset_id provided, auto-fill health_score into days_since_maintenance proxy
    enrichment: Dict[str, Optional[str]] = {"asset_code": None, "asset_name": None}
    if payload.asset_id:
        enrichment = _enrich_from_db(payload.asset_id, db)
        # Auto-adjust days_since_maintenance if health_score available
        hs = enrichment.get("health_score")
        if hs and payload.days_since_maintenance == 30.0:
            # Higher health score → shorter time since maintenance
            payload = payload.model_copy(update={"days_since_maintenance": max(1.0, (100.0 - float(hs)) * 0.9)})

    feat = _telemetry_to_dict(payload)

    try:
        result = engine.predict(feat)
    except Exception as exc:
        logger.error("Prognostics inference error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prognostics inference failed: {str(exc)}",
        )

    return AssetPrognosticsResponse(
        asset_id=payload.asset_id,
        asset_code=enrichment.get("asset_code"),
        asset_name=enrichment.get("asset_name"),
        prognostics=PrognosticsResult(**result),
    )


@router.post("/batch", response_model=BatchPrognosticsResponse)
def predict_asset_prognostics_batch(
    payload: BatchTelemetryInput,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Runs the Asset Prognostics Engine on up to 100 asset telemetry records.

    Useful for dashboard-level bulk risk scoring across all assets.
    """
    engine = _get_engine()
    if engine is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Asset Prognostics Engine is currently unavailable.",
        )

    results: List[AssetPrognosticsResponse] = []
    for record in payload.records:
        enrichment: Dict[str, Optional[str]] = {"asset_code": None, "asset_name": None}
        if record.asset_id:
            enrichment = _enrich_from_db(record.asset_id, db)

        feat = _telemetry_to_dict(record)
        try:
            pred = engine.predict(feat)
        except Exception as exc:
            logger.warning("Skipping record asset_id=%s due to error: %s", record.asset_id, exc)
            continue

        results.append(
            AssetPrognosticsResponse(
                asset_id=record.asset_id,
                asset_code=enrichment.get("asset_code"),
                asset_name=enrichment.get("asset_name"),
                prognostics=PrognosticsResult(**pred),
            )
        )

    return BatchPrognosticsResponse(
        total_records=len(results),
        results=results,
        backend_used=engine.backend,
    )
