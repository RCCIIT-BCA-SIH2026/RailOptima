from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.common import MLUnifiedQueryRequest, MLUnifiedQueryResponse
from backend.app.services.unified_ml_query_service import UnifiedMLQueryService
from backend.app.api.deps import get_current_user_optional

router = APIRouter()

@router.post(
    "/query",
    response_model=MLUnifiedQueryResponse,
    summary="Execute Unified ML Data Query across all 90 Attributes & Priority Telemetry"
)
def execute_ml_unified_query(
    payload: Optional[MLUnifiedQueryRequest] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Executes a multi-domain ML data query. Accepts entity IDs (train, track, asset, task, block),
    query strings, or telemetry overrides. Resolves and returns all 90 Data Attributes organized into 8 domains,
    highlights the Top 25 Priority ML Features, and executes inference through all trained ML engines.
    """
    req_data = payload.model_dump() if payload else {}
    try:
        res = UnifiedMLQueryService.execute_unified_query(
            db=db,
            query=req_data.get("query"),
            train_id=req_data.get("train_id"),
            train_no=req_data.get("train_no"),
            track_id=req_data.get("track_id"),
            section_code=req_data.get("section_code"),
            asset_id=req_data.get("asset_id"),
            asset_code=req_data.get("asset_code"),
            task_id=req_data.get("task_id"),
            task_code=req_data.get("task_code"),
            block_id=req_data.get("block_id"),
            block_code=req_data.get("block_code"),
            telemetry_override=req_data.get("telemetry_override"),
            current_user=current_user
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unified ML Query execution failed: {str(e)}"
        )

@router.get(
    "/query",
    response_model=MLUnifiedQueryResponse,
    summary="Execute Unified ML Query via GET parameters"
)
def execute_ml_unified_query_get(
    q: Optional[str] = Query(None, description="Freeform query string or entity identifier"),
    train_no: Optional[str] = Query(None, description="Train Number e.g. 12002"),
    asset_code: Optional[str] = Query(None, description="Asset Code e.g. TRK-MAIN-001"),
    section_code: Optional[str] = Query(None, description="Section Code e.g. NDLS-TKD-UP"),
    task_code: Optional[str] = Query(None, description="Task Code e.g. TSK-ENG-2026-0001"),
    block_code: Optional[str] = Query(None, description="Block Code e.g. BLK-NDLS-TKD-001"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """GET convenience route for Unified ML Query."""
    try:
        res = UnifiedMLQueryService.execute_unified_query(
            db=db,
            query=q,
            train_no=train_no,
            asset_code=asset_code,
            section_code=section_code,
            task_code=task_code,
            block_code=block_code,
            current_user=current_user
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unified ML Query execution failed: {str(e)}"
        )

@router.get("/mongodb-status", summary="Get MongoDB Atlas Cluster Connection Status & Collection Metrics")
def get_mongodb_status():
    """Returns live connection metrics, database statistics, and collection counts from MongoDB Atlas Cluster."""
    from backend.app.core.mongodb import get_mongodb_cluster_status
    from backend.app.services.mongodb_repository_service import MongoDBRepositoryService
    status_data = get_mongodb_cluster_status()
    counts = MongoDBRepositoryService.get_all_collection_counts()
    status_data["collection_document_counts"] = counts
    return status_data

@router.post("/seed-mongodb", summary="Seed / Reset MongoDB Atlas Collections")
def seed_mongodb():
    """Seeds trains, tracks, assets, telemetry, and AI governance data into MongoDB Atlas Cluster."""
    from backend.scripts.init_mongodb_atlas import seed_mongodb_atlas
    success = seed_mongodb_atlas()
    if success:
        return {"status": "SUCCESS", "message": "Successfully seeded MongoDB Atlas cluster collections."}
    raise HTTPException(status_code=500, detail="Failed to seed MongoDB Atlas cluster.")

