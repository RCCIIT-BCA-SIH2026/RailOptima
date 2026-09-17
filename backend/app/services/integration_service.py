import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models import (
    Asset, Defect, MaintenanceTask, Train, TrainSchedule,
    RailwaySection, Department, IntegrationLog, Alert, Block
)
from backend.integrations import MockTMSClient, MockSMMSClient, MockTDMSClient, MockCOAClient
from ml.priority_engine import priority_engine

class RailwayIntegrationService:
    """
    Railway Integration Service:
    Normalizes heterogenous external telemetry from Indian Railways systems
    (TMS, SMMS, TDMS, COA) into the standardized internal PostgreSQL relational schema.
    Clearly marks all ingested records with SIMULATED DEMO DATA annotations.
    """

    DATA_MODE = "SIMULATED DEMO DATA"

    @classmethod
    def convert_external_defect_to_internal(
        cls,
        raw: Dict[str, Any],
        dept_id: int,
        sec_id: int,
        asset_id: int,
        track_density_gmt: float,
        asset_health: float
    ) -> Defect:
        """Converts raw external defect record into internal Defect ORM model."""
        prio_score = priority_engine.calculate_defect_priority(
            severity=raw.get("severity", "Major"),
            defect_type=raw.get("defect_type", "P-Way Defect"),
            asset_health=asset_health,
            track_density_gmt=track_density_gmt,
            speed_restriction=raw.get("speed_restriction_imposed", 0)
        )

        return Defect(
            defect_code=f"DEF-{raw.get('source_system', 'EXT')}-{random.randint(100000, 999999)}",
            asset_id=asset_id,
            department_id=dept_id,
            section_id=sec_id,
            defect_type=raw.get("defect_type", "Track Defect")[:100],
            severity=raw.get("severity", "Major"),
            reported_at=datetime.fromisoformat(raw["reported_at"]) if "reported_at" in raw else datetime.utcnow(),
            reported_by_system=raw.get("source_system", "EXT"),
            status="Open",
            calculated_priority_score=prio_score,
            speed_restriction_imposed=raw.get("speed_restriction_imposed", 0)
        )

    @classmethod
    def convert_external_asset_to_internal(
        cls,
        raw: Dict[str, Any],
        dept_id: int,
        sec_id: int
    ) -> Asset:
        """Converts raw external asset record into internal Asset ORM model."""
        sec_code = raw.get("section_code", "SEC-01")
        return Asset(
            asset_code=f"AST-{raw.get('source_system', 'EXT')}-{sec_code}-{random.randint(1000, 9999)}",
            department_id=dept_id,
            section_id=sec_id,
            asset_type=raw.get("asset_type", "Track")[:50],
            asset_name=raw.get("asset_name", "Railway Asset")[:250],
            km_location=float(raw.get("km_location", 10.5)),
            installation_date=datetime.utcnow() - timedelta(days=365),
            health_score=float(raw.get("health_score", 85.0)),
            status="Operational" if raw.get("health_score", 85.0) > 70 else "Degraded"
        )

    @classmethod
    def convert_external_task_to_internal(
        cls,
        raw: Dict[str, Any],
        dept_id: int,
        sec_id: int
    ) -> MaintenanceTask:
        """Converts raw external maintenance task into internal MaintenanceTask ORM model."""
        dur_mins = raw.get("estimated_duration_minutes", 180)
        dur_hrs = round(dur_mins / 60.0, 2)
        return MaintenanceTask(
            task_code=f"TSK-{raw.get('source_system', 'EXT')}-{random.randint(100000, 999999)}",
            department_id=dept_id,
            section_id=sec_id,
            title=raw.get("title", "Routine Maintenance")[:150],
            description=f"Ingested from {raw.get('source_system', 'EXT')} Gateway ({cls.DATA_MODE})",
            estimated_duration_hours=dur_hrs,
            track_possession_required=raw.get("required_track_possession", True),
            power_block_required=raw.get("required_power_block", False),
            traffic_block_required=raw.get("required_traffic_block", True),
            required_resources=raw.get("min_resources_needed", {"gang_men": 6}),
            status="Pending"
        )

    @classmethod
    def convert_external_train_to_internal(
        cls,
        raw: Dict[str, Any],
        sec_id: int
    ) -> Train:
        """Converts raw external COA train record into internal Train ORM model."""
        prio = 1 if ("Rajdhani" in raw.get("train_type", "") or "Vande" in raw.get("train_name", "")) else (4 if raw.get("is_freight") else 2)
        return Train(
            train_no=str(raw.get("train_no", f"T-{random.randint(10000, 99999)}"))[:10],
            train_name=raw.get("train_name", "Express Train")[:100],
            train_type=raw.get("train_type", "Superfast")[:30],
            priority_level=prio,
            max_speed=int(raw.get("current_speed_kmh", 110)) or 110,
            is_freight=raw.get("is_freight", False)
        )

    @classmethod
    def convert_external_block_to_internal(
        cls,
        raw: Dict[str, Any],
        sec_id: int,
        dept_id: int
    ) -> Block:
        """Converts raw external COA available block into internal Block ORM model."""
        start_time = datetime.fromisoformat(raw["start_time"]) if "start_time" in raw else datetime.utcnow()
        end_time = datetime.fromisoformat(raw["end_time"]) if "end_time" in raw else start_time + timedelta(hours=3)
        return Block(
            block_code=f"BLK-{raw.get('source_system', 'COA')}-{random.randint(100000, 999999)}",
            section_id=sec_id,
            block_type=raw.get("window_type", "Traffic").replace("_Block", ""),
            requested_start_time=start_time,
            requested_end_time=end_time,
            status="Proposed",
            lead_department_id=dept_id,
            total_tasks_count=1
        )

    @classmethod
    def get_system_telemetry(cls, db: Session) -> Dict[str, Any]:
        """Returns consolidated health, sync status, and telemetry across all 4 systems."""
        systems = [
            MockTMSClient.ping_system_health(),
            MockSMMSClient.ping_system_health(),
            MockTDMSClient.ping_system_health(),
            MockCOAClient.ping_system_health()
        ]

        recent_logs = db.query(IntegrationLog).order_by(IntegrationLog.timestamp.desc()).limit(15).all()

        log_data = []
        for l in recent_logs:
            log_data.append({
                "id": l.id,
                "system_name": l.system_name,
                "sync_type": l.sync_type,
                "records_synced": l.records_synced,
                "status": l.status,
                "timestamp": l.timestamp.isoformat()
            })

        return {
            "systems": systems,
            "recent_sync_logs": log_data,
            "data_mode": cls.DATA_MODE,
            "timestamp": datetime.utcnow().isoformat()
        }

    @classmethod
    def sync_and_normalize(cls, system_name: str, db: Session, count: int = 10) -> Dict[str, Any]:
        """
        Executes normalization pipeline for the specified external system.
        Inserts normalized records into PostgreSQL and logs the transaction.
        """
        sys_code = system_name.upper()
        now = datetime.utcnow()
        ingested_count = 0

        # Department resolution
        dept_code_map = {"TMS": "ENG", "SMMS": "SNT", "TDMS": "TRD", "COA": "OPT"}
        dept_code = dept_code_map.get(sys_code, "ENG")
        dept = db.query(Department).filter(Department.code == dept_code).first()
        dept_id = dept.id if dept else 1

        default_section = db.query(RailwaySection).first()
        default_section_id = default_section.id if default_section else 1

        if sys_code == "TMS":
            # 1. Ingest & Normalize Defects from TMS
            raw_defects = MockTMSClient.fetch_defects(count=count)
            for raw in raw_defects:
                sec = db.query(RailwaySection).filter(RailwaySection.section_code == raw.get("section_code")).first()
                sec_id = sec.id if sec else default_section_id
                asset = db.query(Asset).filter(Asset.section_id == sec_id, Asset.department_id == dept_id).first()

                new_defect = cls.convert_external_defect_to_internal(
                    raw=raw,
                    dept_id=dept_id,
                    sec_id=sec_id,
                    asset_id=asset.id if asset else 1,
                    track_density_gmt=sec.current_traffic_density if sec else 55.0,
                    asset_health=asset.health_score if asset else 75.0
                )
                db.add(new_defect)
                ingested_count += 1

        elif sys_code == "SMMS":
            # 2. Ingest & Normalize Defects from SMMS
            raw_defects = MockSMMSClient.fetch_defects(count=count)
            for raw in raw_defects:
                sec = db.query(RailwaySection).filter(RailwaySection.section_code == raw.get("section_code")).first()
                sec_id = sec.id if sec else default_section_id
                asset = db.query(Asset).filter(Asset.section_id == sec_id, Asset.department_id == dept_id).first()

                new_defect = cls.convert_external_defect_to_internal(
                    raw=raw,
                    dept_id=dept_id,
                    sec_id=sec_id,
                    asset_id=asset.id if asset else 1,
                    track_density_gmt=sec.current_traffic_density if sec else 55.0,
                    asset_health=asset.health_score if asset else 80.0
                )
                db.add(new_defect)
                ingested_count += 1

        elif sys_code == "TDMS":
            # 3. Ingest & Normalize Defects from TDMS
            raw_defects = MockTDMSClient.fetch_defects(count=count)
            for raw in raw_defects:
                sec = db.query(RailwaySection).filter(RailwaySection.section_code == raw.get("section_code")).first()
                sec_id = sec.id if sec else default_section_id
                asset = db.query(Asset).filter(Asset.section_id == sec_id, Asset.department_id == dept_id).first()

                new_defect = cls.convert_external_defect_to_internal(
                    raw=raw,
                    dept_id=dept_id,
                    sec_id=sec_id,
                    asset_id=asset.id if asset else 1,
                    track_density_gmt=sec.current_traffic_density if sec else 55.0,
                    asset_health=asset.health_score if asset else 82.0
                )
                db.add(new_defect)
                ingested_count += 1

        elif sys_code == "COA":
            # 4. Ingest & Normalize Live Trains from COA
            raw_trains = MockCOAClient.fetch_trains(count=count)
            for raw in raw_trains:
                sec = db.query(RailwaySection).filter(RailwaySection.section_code == raw.get("current_section")).first()
                sec_id = sec.id if sec else default_section_id
                
                # Check if train already exists
                existing = db.query(Train).filter(Train.train_no == str(raw.get("train_no"))).first()
                if not existing:
                    new_train = cls.convert_external_train_to_internal(raw, sec_id)
                    db.add(new_train)
                ingested_count += 1

        else:
            raise ValueError(f"Unknown railway system '{system_name}'")

        # Create immutable integration log
        ilog = IntegrationLog(
            system_name=sys_code,
            sync_type="Automatic Normalization",
            records_synced=ingested_count,
            status="Success",
            timestamp=now
        )
        db.add(ilog)
        db.commit()

        return {
            "system": sys_code,
            "status": "Success",
            "records_ingested": ingested_count,
            "records_normalized_and_ingested": ingested_count,
            "normalized_at": ilog.timestamp.isoformat(),
            "pipeline": "Normalizer -> Schema Mapper -> PostgreSQL -> IntegrationLog",
            "data_mode": cls.DATA_MODE
        }

integration_service = RailwayIntegrationService()
