import os
import logging
from typing import Dict, Any, Optional
import pymongo
from pymongo import MongoClient
from backend.app.core.config import settings

logger = logging.getLogger("railway.core.mongodb")

_mongo_client: Optional[MongoClient] = None

def get_mongo_client() -> Optional[MongoClient]:
    """Returns singleton PyMongo MongoClient connected to MongoDB Atlas."""
    global _mongo_client
    if _mongo_client is not None:
        return _mongo_client

    mongo_uri = getattr(settings, "MONGODB_URI", None) or getattr(settings, "MONGODB_URL", None)
    if not mongo_uri:
        mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_URL")

    if not mongo_uri:
        logger.warning("No MONGODB_URI found in settings or environment.")
        return None

    try:
        _mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        # Test connection ping
        _mongo_client.admin.command('ping')
        logger.info("Successfully connected to MongoDB Atlas Cluster.")
        return _mongo_client
    except Exception as e:
        logger.error("Failed to connect to MongoDB Atlas Cluster: %s", e)
        _mongo_client = None
        return None

def get_mongo_db(db_name: str = "railway_planner"):
    """Returns database instance from MongoDB Atlas."""
    client = get_mongo_client()
    if client:
        return client[db_name]
    return None

def save_ml_query_log(query_data: Dict[str, Any]) -> bool:
    """Saves a unified ML query execution log to MongoDB Atlas 'unified_ml_queries' collection."""
    try:
        db = get_mongo_db()
        if db is not None:
            col = db["unified_ml_queries"]
            col.insert_one(query_data)
            logger.info("Saved unified ML query log to MongoDB Atlas.")
            return True
    except Exception as e:
        logger.warning("Failed to save ML query log to MongoDB Atlas: %s", e)
    return False

def get_mongodb_cluster_status() -> Dict[str, Any]:
    """Checks MongoDB Atlas cluster connection status and database statistics."""
    try:
        client = get_mongo_client()
        if client:
            info = client.server_info()
            db = client["railway_planner"]
            col_names = db.list_collection_names()
            return {
                "status": "CONNECTED",
                "cluster_version": info.get("version", "v8.0"),
                "ok": info.get("ok", 1.0),
                "database": "railway_planner",
                "collections": col_names,
                "host": getattr(settings, "MONGODB_HOST", "railoptima.uhkmnya.mongodb.net"),
                "atlas_sql_supported": True
            }
    except Exception as e:
        return {
            "status": "DISCONNECTED",
            "error": str(e),
            "atlas_sql_supported": False
        }
    return {
        "status": "NOT_CONFIGURED",
        "atlas_sql_supported": False
    }
