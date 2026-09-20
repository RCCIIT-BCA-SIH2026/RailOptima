import os
import sys
import logging
from datetime import datetime, timedelta
import pymongo
from pymongo.server_api import ServerApi

# Add workspace root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_mongodb_atlas")

def seed_mongodb_atlas():
    mongo_uri = getattr(settings, "MONGODB_URI", None) or getattr(settings, "MONGODB_URL", None)
    if not mongo_uri:
        mongo_uri = "mongodb+srv://ankitkarmakar200512_db_user:iaRBstUjDm2HrFq3@railoptima.uhkmnya.mongodb.net/railway_planner?retryWrites=true&w=majority"

    logger.info("Connecting to MongoDB Atlas Cluster...")
    client = pymongo.MongoClient(mongo_uri, server_api=ServerApi('1'), serverSelectionTimeoutMS=8000)

    try:
        client.admin.command('ping')
        logger.info("Pinged MongoDB Atlas deployment successfully!")
    except Exception as e:
        logger.error("Failed to ping MongoDB Atlas: %s", e)
        return False

    db = client["railway_planner"]
    now = datetime.utcnow()

    # 1. Trains Collection
    trains_col = db["trains"]
    trains_col.delete_many({})
    trains_seed = [
        {
            "train_id": 1,
            "train_no": "12002",
            "train_name": "Bhopal Shatabdi Express",
            "train_type": "Shatabdi",
            "origin": "New Delhi (NDLS)",
            "destination": "Bhopal Junction (BPL)",
            "current_location": "KM 142.500 (NDLS-TKD-UP)",
            "current_station": "New Delhi (NDLS)",
            "next_station": "Tughlakabad (TKD)",
            "scheduled_arrival": (now + timedelta(hours=2)).isoformat(),
            "scheduled_departure": (now - timedelta(hours=1)).isoformat(),
            "current_delay_minutes": 12,
            "current_speed_kmph": 110.0,
            "historical_delay_avg_minutes": 8.4,
            "priority_level": 1,
            "is_freight": False
        },
        {
            "train_id": 2,
            "train_no": "22436",
            "train_name": "Vande Bharat Express",
            "train_type": "Vande_Bharat",
            "origin": "New Delhi (NDLS)",
            "destination": "Varanasi Junction (BSB)",
            "current_location": "KM 88.200 (NDLS-AGC)",
            "current_station": "New Delhi (NDLS)",
            "next_station": "Agra Cantt (AGC)",
            "scheduled_arrival": (now + timedelta(hours=3)).isoformat(),
            "scheduled_departure": (now - timedelta(minutes=30)).isoformat(),
            "current_delay_minutes": 0,
            "current_speed_kmph": 130.0,
            "historical_delay_avg_minutes": 2.1,
            "priority_level": 1,
            "is_freight": False
        },
        {
            "train_id": 3,
            "train_no": "G-8821",
            "train_name": "Container Freight Special",
            "train_type": "Freight",
            "origin": "Tughlakabad ICD (TKD)",
            "destination": "Jawaharlal Nehru Port (JNPT)",
            "current_location": "KM 165.000 (TKD-VGLJ)",
            "current_station": "Tughlakabad (TKD)",
            "next_station": "Mathura Junction (MTJ)",
            "scheduled_arrival": (now + timedelta(hours=6)).isoformat(),
            "scheduled_departure": (now - timedelta(hours=2)).isoformat(),
            "current_delay_minutes": 45,
            "current_speed_kmph": 65.0,
            "historical_delay_avg_minutes": 35.0,
            "priority_level": 4,
            "is_freight": True
        }
    ]
    trains_col.insert_many(trains_seed)
    logger.info("Seeded %d trains to MongoDB Atlas.", len(trains_seed))

    # 2. Tracks & Sections Collection
    tracks_col = db["tracks_and_sections"]
    tracks_col.delete_many({})
    tracks_seed = [
        {
            "track_id": "TRK-NDLS-TKD-LINE1",
            "section_code": "NDLS-TKD-UP",
            "railway_zone_region": "Northern Zone (NR / NCR)",
            "track_condition": "Degraded - Maintenance Advised",
            "rail_wear_mm": 2.85,
            "track_vibration_level": 0.62,
            "track_defect_history_count": 4,
            "last_inspection_date": (now - timedelta(days=12)).strftime("%Y-%m-%d"),
            "inspection_score": 82.5,
            "track_availability_pct": 94.2,
            "current_block_status": "Clear (No Active Block)",
            "max_speed_kmph": 130,
            "line_capacity": 60,
            "current_traffic_density_gmt": 62.0
        },
        {
            "track_id": "TRK-TKD-AGC-LINE2",
            "section_code": "TKD-AGC-DOWN",
            "railway_zone_region": "North Central Zone (NCR)",
            "track_condition": "Good Operational Condition",
            "rail_wear_mm": 1.20,
            "track_vibration_level": 0.25,
            "track_defect_history_count": 1,
            "last_inspection_date": (now - timedelta(days=5)).strftime("%Y-%m-%d"),
            "inspection_score": 94.0,
            "track_availability_pct": 98.5,
            "current_block_status": "Clear",
            "max_speed_kmph": 160,
            "line_capacity": 64,
            "current_traffic_density_gmt": 55.0
        }
    ]
    tracks_col.insert_many(tracks_seed)
    logger.info("Seeded %d tracks to MongoDB Atlas.", len(tracks_seed))

    # 3. Assets Collection
    assets_col = db["assets"]
    assets_col.delete_many({})
    assets_seed = [
        {
            "asset_code": "TRK-MAIN-001",
            "asset_name": "Turnout Point Machine #104B",
            "asset_type": "Turnout Point Machine",
            "department_code": "ENG",
            "section_code": "NDLS-TKD-UP",
            "km_location": 142.500,
            "installation_date": "2019-04-15",
            "last_maintenance_date": (now - timedelta(days=18)).strftime("%Y-%m-%d"),
            "days_since_maintenance": 18,
            "previous_failures_count": 2,
            "failure_frequency_per_year": 0.45,
            "asset_health_score": 68.5,
            "current_defects_count": 1,
            "status": "Degraded"
        },
        {
            "asset_code": "OHE-MAST-88A",
            "asset_name": "25kV OHE Catenary Portal Mast",
            "asset_type": "OHE_Mast",
            "department_code": "TRD",
            "section_code": "NDLS-TKD-UP",
            "km_location": 143.100,
            "installation_date": "2018-11-20",
            "last_maintenance_date": (now - timedelta(days=35)).strftime("%Y-%m-%d"),
            "days_since_maintenance": 35,
            "previous_failures_count": 0,
            "failure_frequency_per_year": 0.0,
            "asset_health_score": 91.0,
            "current_defects_count": 0,
            "status": "Operational"
        }
    ]
    assets_col.insert_many(assets_seed)
    logger.info("Seeded %d assets to MongoDB Atlas.", len(assets_seed))

    # 4. Sensor Telemetry Collection
    telemetry_col = db["sensor_telemetry"]
    telemetry_col.delete_many({})
    telemetry_seed = [
        {
            "entity_code": "TRK-MAIN-001",
            "rail_wear_mm": 2.85,
            "wheel_wear_percent": 34.5,
            "brake_pad_wear_percent": 42.0,
            "brake_pressure_psi": 84.5,
            "axle_temperature_c": 58.2,
            "bearing_temperature_c": 62.4,
            "battery_voltage": 24.1,
            "sensor_health_index": 92.0,
            "inspection_score": 82.5,
            "distance_travelled_km": 1420.0,
            "average_speed_kmph": 92.5,
            "delay_minutes": 12.0,
            "ambient_temperature_c": 32.0,
            "humidity_percent": 68.0,
            "rainfall_mm": 12.5,
            "timestamp": now.isoformat()
        }
    ]
    telemetry_col.insert_many(telemetry_seed)
    logger.info("Seeded %d sensor telemetry records to MongoDB Atlas.", len(telemetry_seed))

    # 5. AI Governance Collection
    ai_gov_col = db["ai_recommendations"]
    ai_gov_col.delete_many({})
    ai_gov_seed = [
        {
            "recommendation_id": "REC-GOV-2026-1001",
            "ai_recommendation": "Schedule Emergency Possession Block: Turnout Point Machine Detection Overhaul",
            "ai_confidence_pct": 94.5,
            "reason_explanation": [
                "Rail wear exceeded safety threshold (2.85mm vs 2.50mm limit)",
                "High traffic density corridor (62.0 GMT) with overdue maintenance SLA"
            ],
            "affected_asset_section": "TRK-MAIN-001 / NDLS-TKD-UP",
            "affected_department": "ENG",
            "recommendation_status": "PENDING_REVIEW",
            "reviewer_authorized_officer": "Divisional Railway Manager (DRM / Sr. DOM)",
            "approval_rejection_status": "Pending Authorized Officer Signoff",
            "created_at": now.isoformat()
        }
    ]
    ai_gov_col.insert_many(ai_gov_seed)
    logger.info("Seeded %d AI Governance recommendations to MongoDB Atlas.", len(ai_gov_seed))

    logger.info("MongoDB Atlas seeding complete! Collections: %s", db.list_collection_names())
    return True

if __name__ == "__main__":
    seed_mongodb_atlas()
