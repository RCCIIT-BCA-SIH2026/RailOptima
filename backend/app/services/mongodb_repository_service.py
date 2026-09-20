import logging
from typing import Dict, Any, List, Optional
from backend.app.core.mongodb import get_mongo_db

logger = logging.getLogger("railway.services.mongodb_repository")

class MongoDBRepositoryService:
    """Repository service to query and write entities directly to MongoDB Atlas."""

    @staticmethod
    def get_train_by_identifier(identifier: str) -> Optional[Dict[str, Any]]:
        """Finds train document by train_no or train_id in MongoDB Atlas."""
        try:
            db = get_mongo_db()
            if db is not None:
                col = db["trains"]
                query = {"$or": [{"train_no": identifier}, {"train_name": {"$regex": identifier, "$options": "i"}}]}
                if identifier.isdigit():
                    query["$or"].append({"train_id": int(identifier)})
                doc = col.find_one(query)
                if doc:
                    doc.pop("_id", None)
                    return doc
        except Exception as e:
            logger.warning("MongoDB get_train_by_identifier failed: %s", e)
        return None

    @staticmethod
    def get_asset_by_identifier(identifier: str) -> Optional[Dict[str, Any]]:
        """Finds asset document by asset_code or asset_name in MongoDB Atlas."""
        try:
            db = get_mongo_db()
            if db is not None:
                col = db["assets"]
                doc = col.find_one({"$or": [{"asset_code": identifier}, {"asset_name": {"$regex": identifier, "$options": "i"}}]})
                if doc:
                    doc.pop("_id", None)
                    return doc
        except Exception as e:
            logger.warning("MongoDB get_asset_by_identifier failed: %s", e)
        return None

    @staticmethod
    def get_track_by_section_code(section_code: str) -> Optional[Dict[str, Any]]:
        """Finds track section document by section_code in MongoDB Atlas."""
        try:
            db = get_mongo_db()
            if db is not None:
                col = db["tracks_and_sections"]
                doc = col.find_one({"section_code": section_code})
                if doc:
                    doc.pop("_id", None)
                    return doc
        except Exception as e:
            logger.warning("MongoDB get_track_by_section_code failed: %s", e)
        return None

    @staticmethod
    def save_block_plan_in_mongo(plan_doc: Dict[str, Any], blocks_docs: List[Dict[str, Any]]) -> bool:
        """Saves selected block plan and its proposed blocks to MongoDB Atlas collections 'block_plans' and 'blocks'."""
        try:
            db = get_mongo_db()
            if db is not None:
                plans_col = db["block_plans"]
                plans_col.update_one(
                    {"plan_code": plan_doc["plan_code"]},
                    {"$set": plan_doc},
                    upsert=True
                )
                
                if blocks_docs:
                    blocks_col = db["blocks"]
                    for b in blocks_docs:
                        blocks_col.update_one(
                            {"block_code": b["block_code"]},
                            {"$set": b},
                            upsert=True
                        )
                    
                logger.info("Saved Block Plan %s with %d blocks to MongoDB Atlas.", plan_doc.get("plan_code"), len(blocks_docs))
                return True
        except Exception as e:
            logger.warning("Failed to save block plan in MongoDB Atlas: %s", e)
        return False

    @staticmethod
    def save_approval_record(approval_data: Dict[str, Any]) -> bool:
        """Saves an officer approval action record to MongoDB Atlas 'approvals' collection."""
        try:
            db = get_mongo_db()
            if db is not None:
                col = db["approvals"]
                col.insert_one(approval_data)
                logger.info("Saved approval record to MongoDB Atlas for block %s", approval_data.get("block_code"))
                return True
        except Exception as e:
            logger.warning("Failed to save approval record to MongoDB Atlas: %s", e)
        return False

    @staticmethod
    def update_block_status_in_mongo(block_id: int, block_code: str, new_status: str, extra_details: Optional[Dict[str, Any]] = None) -> bool:
        """Updates or inserts block status in MongoDB Atlas 'blocks' collection."""
        try:
            db = get_mongo_db()
            if db is not None:
                col = db["blocks"]
                update_fields = {
                    "status": new_status,
                    "updated_at": extra_details.get("timestamp") if extra_details else None
                }
                if extra_details:
                    update_fields.update(extra_details)

                col.update_one(
                    {"$or": [{"block_id": block_id}, {"block_code": block_code}]},
                    {"$set": update_fields},
                    upsert=True
                )

                # Also update corresponding recommendation in ai_recommendations collection
                rec_col = db["ai_recommendations"]
                rec_col.update_many(
                    {"$or": [{"block_id": block_id}, {"block_code": block_code}]},
                    {"$set": {"recommendation_status": new_status.upper(), "updated_at": extra_details.get("timestamp") if extra_details else None}}
                )

                logger.info("Updated block %s status to %s in MongoDB Atlas.", block_code, new_status)
                return True
        except Exception as e:
            logger.warning("Failed to update block status in MongoDB Atlas: %s", e)
        return False

    @staticmethod
    def save_audit_log_in_mongo(audit_data: Dict[str, Any]) -> bool:
        """Saves an audit log entry to MongoDB Atlas 'audit_logs' collection."""
        try:
            db = get_mongo_db()
            if db is not None:
                col = db["audit_logs"]
                col.insert_one(audit_data)
                logger.info("Saved audit log to MongoDB Atlas.")
                return True
        except Exception as e:
            logger.warning("Failed to save audit log to MongoDB Atlas: %s", e)
        return False

    @staticmethod
    def get_all_collection_counts() -> Dict[str, int]:
        """Returns document counts for all MongoDB Atlas collections."""
        counts = {}
        try:
            db = get_mongo_db()
            if db is not None:
                for col_name in db.list_collection_names():
                    counts[col_name] = db[col_name].count_documents({})
        except Exception as e:
            logger.warning("MongoDB get_all_collection_counts failed: %s", e)
        return counts

