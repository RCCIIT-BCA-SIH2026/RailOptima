"""
MongoDB Atlas Telemetry & AI Memory API Endpoints
================================================
Endpoints providing visibility into MongoDB Atlas cluster status,
RAG conversation archives, and real-time document telemetry.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from backend.app.core.mongodb import mongodb_manager
from backend.app.core.config import settings

router = APIRouter()

class TelemetryPayload(BaseModel):
    section_code: str
    metric_type: str = "vibration_telemetry"
    payload: Dict[str, Any]

@router.get("/status", summary="MongoDB Atlas Cluster Status & Health")
def get_mongodb_status() -> Dict[str, Any]:
    """Returns connection health and stats for the MongoDB Atlas cluster."""
    status = mongodb_manager.check_connection()
    return {
        "cluster_host": settings.MONGODB_HOST,
        "database": "railway_planner",
        "auth_user": settings.MONGODB_USER,
        "connection": status
    }

@router.get("/chat-history", summary="Fetch Archived AI Chat Sessions")
def get_chat_history(limit: int = 15) -> Dict[str, Any]:
    """Retrieves recent RAG agent conversation turns archived in MongoDB Atlas."""
    logs = mongodb_manager.get_recent_chat_logs(limit=limit)
    return {
        "count": len(logs),
        "logs": logs
    }

@router.get("/telemetry", summary="Fetch Streamed Telemetry Logs")
def get_telemetry_logs(limit: int = 20) -> Dict[str, Any]:
    """Retrieves real-time sensor and spatial telemetry stored in MongoDB Atlas."""
    logs = mongodb_manager.get_recent_telemetry(limit=limit)
    return {
        "count": len(logs),
        "logs": logs
    }

@router.post("/telemetry", summary="Log Telemetry Stream into MongoDB Atlas")
def record_telemetry(data: TelemetryPayload) -> Dict[str, Any]:
    """Asynchronously records a telemetry document into MongoDB Atlas."""
    mongodb_manager.log_telemetry(
        section_code=data.section_code,
        metric_type=data.metric_type,
        payload=data.payload
    )
    return {
        "status": "queued",
        "message": f"Telemetry for {data.section_code} queued for MongoDB Atlas persistence."
    }
