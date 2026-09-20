"""
RailOptima MongoDB Atlas Integration Module
===========================================
Enterprise document telemetry, AI chat memory persistence, and audit streaming
connected to MongoDB Atlas cluster (railoptima.uhkmnya.mongodb.net).
"""

import logging
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional
import pymongo
from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError, ConnectionFailure

from backend.app.core.config import settings

logger = logging.getLogger("railoptima.mongodb")

class MongoDBManager:
    """
    Thread-safe, resilient MongoDB Atlas Client Manager.
    Operates non-blockingly so primary database operations (SQLite/PostgreSQL)
    remain uninterrupted if network/TLS restrictions occur.
    """

    def __init__(self):
        self.uri = settings.MONGODB_URI or settings.MONGODB_URL
        self._client: Optional[MongoClient] = None
        self._db_name = "railway_planner"
        self._is_connected = False
        self._last_error = ""
        self._lock = threading.Lock()
        self._init_client()

    def _init_client(self):
        if not self.uri:
            self._last_error = "MONGODB_URI not configured."
            logger.warning("MongoDB Atlas URI not set in environment.")
            return

        try:
            # Set short connection timeouts so it never hangs application startup
            self._client = MongoClient(
                self.uri,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000,
                socketTimeoutMS=2000,
                maxPoolSize=20,
                minPoolSize=1,
                retryWrites=True,
                w="majority"
            )
            logger.info("MongoDB Atlas client initialized.")
        except Exception as e:
            self._last_error = str(e)
            logger.warning(f"MongoDB Atlas initialization notice: {e}")

    def get_database(self):
        """Returns the railway_planner database object if available."""
        if self._client:
            return self._client[self._db_name]
        return None

    def check_connection(self) -> Dict[str, Any]:
        """Pings the MongoDB Atlas cluster and returns status metrics."""
        if not self._client:
            return {
                "status": "disconnected",
                "connected": False,
                "host": settings.MONGODB_HOST,
                "database": self._db_name,
                "error": self._last_error or "Client not initialized",
                "collections": []
            }

        try:
            # Quick ping command
            self._client.admin.command('ping')
            self._is_connected = True
            db = self.get_database()
            cols = db.list_collection_names() if db is not None else []
            return {
                "status": "connected",
                "connected": True,
                "host": settings.MONGODB_HOST,
                "database": self._db_name,
                "user": settings.MONGODB_USER,
                "collections": cols,
                "collections_count": len(cols)
            }
        except (ServerSelectionTimeoutError, ConnectionFailure) as ce:
            self._is_connected = False
            self._last_error = str(ce)
            return {
                "status": "unreachable",
                "connected": False,
                "host": settings.MONGODB_HOST,
                "database": self._db_name,
                "error": f"Atlas connection timeout / IP whitelist pending: {str(ce)[:120]}...",
                "collections": []
            }
        except Exception as e:
            self._is_connected = False
            self._last_error = str(e)
            return {
                "status": "error",
                "connected": False,
                "host": settings.MONGODB_HOST,
                "database": self._db_name,
                "error": str(e),
                "collections": []
            }

    # -------------------------------------------------------------------------
    # Asynchronous & Non-Blocking Document Persistence
    # -------------------------------------------------------------------------
    def log_chat_interaction(
        self,
        user_message: str,
        assistant_reply: str,
        tool_calls: Optional[List[Dict[str, Any]]] = None,
        provider: str = "gemini",
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Persists AI Chatbot conversation turns to MongoDB Atlas in background thread."""
        def _write():
            try:
                db = self.get_database()
                if db is None:
                    return
                doc = {
                    "timestamp": datetime.utcnow(),
                    "user_message": user_message,
                    "assistant_reply": assistant_reply,
                    "tool_calls": tool_calls or [],
                    "provider": provider,
                    "metadata": metadata or {},
                    "system": "RailOptima RAG Agent"
                }
                db["rag_chat_logs"].insert_one(doc)
                logger.debug("Logged chat turn to MongoDB Atlas.")
            except Exception as e:
                logger.debug(f"MongoDB chat logging skipped: {e}")

        threading.Thread(target=_write, daemon=True).start()

    def log_telemetry(self, section_code: str, metric_type: str, payload: Dict[str, Any]):
        """Persists real-time spatial/sensor telemetry to MongoDB Atlas in background thread."""
        def _write():
            try:
                db = self.get_database()
                if db is None:
                    return
                doc = {
                    "timestamp": datetime.utcnow(),
                    "section_code": section_code,
                    "metric_type": metric_type,
                    "payload": payload
                }
                db["telemetry_logs"].insert_one(doc)
            except Exception as e:
                logger.debug(f"MongoDB telemetry logging skipped: {e}")

        threading.Thread(target=_write, daemon=True).start()

    def log_audit_event(self, action: str, entity_type: str, entity_id: Any, details: Dict[str, Any]):
        """Streams block approval/rejection and optimization events to MongoDB Atlas."""
        def _write():
            try:
                db = self.get_database()
                if db is None:
                    return
                doc = {
                    "timestamp": datetime.utcnow(),
                    "action": action,
                    "entity_type": entity_type,
                    "entity_id": str(entity_id),
                    "details": details
                }
                db["block_audit_stream"].insert_one(doc)
            except Exception as e:
                logger.debug(f"MongoDB audit logging skipped: {e}")

        threading.Thread(target=_write, daemon=True).start()

    def get_recent_chat_logs(self, limit: int = 15) -> List[Dict[str, Any]]:
        """Retrieves recent AI conversation logs from MongoDB Atlas."""
        try:
            db = self.get_database()
            if db is None:
                return []
            cursor = db["rag_chat_logs"].find({}, {"_id": 0}).sort("timestamp", pymongo.DESCENDING).limit(limit)
            return list(cursor)
        except Exception as e:
            logger.warning(f"Failed to fetch chat logs from MongoDB: {e}")
            return []

    def get_recent_telemetry(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieves recent sensor/spatial telemetry from MongoDB Atlas."""
        try:
            db = self.get_database()
            if db is None:
                return []
            cursor = db["telemetry_logs"].find({}, {"_id": 0}).sort("timestamp", pymongo.DESCENDING).limit(limit)
            return list(cursor)
        except Exception as e:
            logger.warning(f"Failed to fetch telemetry from MongoDB: {e}")
            return []


# Global MongoDB Manager Singleton
mongodb_manager = MongoDBManager()
