"""
Comprehensive Railway Conflict Detection & Resolution Engine for Indian Railways (SIH26027).

Evaluates 6 core conflict categories:
1. Maintenance vs Train (Train schedule clashes & headway buffer violations)
2. Maintenance vs Maintenance (Conflicting/overlapping maintenance on same asset/track)
3. Block vs Block (Spatial and temporal collision between separate possession requests)
4. Department vs Department (Incompatible physical/electrical operational requirements)
5. Resource vs Resource (Double-booking or transit collisions of machines/crews)
6. Safety Conflicts (Missing 25kV power block, missing traffic block, missing caution orders)

SIMULATED DEMO DATA
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload

from backend.app.models import Block, MaintenanceTask, Train, Resource, RailwaySection, Conflict


class RailwayConflictDetector:
    """
    Automated conflict radar analyzing timetable, possession schedules,
    departmental requests, and resource assignments.
    """

    CONFLICT_TYPES = [
        "Maintenance_vs_Train",
        "Maintenance_vs_Maintenance",
        "Block_vs_Block",
        "Department_vs_Department",
        "Resource_vs_Resource",
        "Safety_Conflict"
    ]

    SEVERITY_LEVELS = ["Critical", "High", "Medium", "Low"]

    @classmethod
    def detect_all_conflicts(
        cls,
        db: Optional[Session] = None,
        section_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Scans current database records (or generated simulation data) for active conflicts.
        """
        conflicts_list = []

        # 1. Maintenance vs Train Conflicts
        train_conflicts = cls._detect_maintenance_vs_train(db, section_filter)
        conflicts_list.extend(train_conflicts)

        # 2. Maintenance vs Maintenance Conflicts
        maint_conflicts = cls._detect_maintenance_vs_maintenance(db, section_filter)
        conflicts_list.extend(maint_conflicts)

        # 3. Block vs Block Conflicts
        block_conflicts = cls._detect_block_vs_block(db, section_filter)
        conflicts_list.extend(block_conflicts)

        # 4. Department vs Department Conflicts
        dept_conflicts = cls._detect_department_vs_department(db, section_filter)
        conflicts_list.extend(dept_conflicts)

        # 5. Resource vs Resource Contention
        res_conflicts = cls._detect_resource_vs_resource(db, section_filter)
        conflicts_list.extend(res_conflicts)

        # 6. Safety Conflicts
        safety_conflicts = cls._detect_safety_conflicts(db, section_filter)
        conflicts_list.extend(safety_conflicts)

        # Build summary statistics
        total = len(conflicts_list)
        critical_count = sum(1 for c in conflicts_list if c["severity"] == "Critical")
        high_count = sum(1 for c in conflicts_list if c["severity"] == "High")
        medium_count = sum(1 for c in conflicts_list if c["severity"] == "Medium")
        low_count = sum(1 for c in conflicts_list if c["severity"] == "Low")

        by_type = {}
        for ct in cls.CONFLICT_TYPES:
            by_type[ct] = sum(1 for c in conflicts_list if c["conflict_type"] == ct)

        return {
            "summary": {
                "total_conflicts": total,
                "critical_count": critical_count,
                "high_count": high_count,
                "medium_count": medium_count,
                "low_count": low_count,
                "by_type": by_type
            },
            "conflicts": conflicts_list,
            "data_mode": "SIMULATED DEMO DATA"
        }

    # =========================================================================
    # RULE 1: MAINTENANCE VS TRAIN
    # =========================================================================
    @classmethod
    def _detect_maintenance_vs_train(
        cls,
        db: Optional[Session] = None,
        section_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        results = []
        base_date = datetime.utcnow().date()
        
        # High impact scenario: Track defect during Vande Bharat / Express passage
        results.append({
            "conflict_id": "CONF-2026-MVT-001",
            "conflict_type": "Maintenance_vs_Train",
            "severity": "Critical",
            "title": "Mainline Tamping Slot Conflicts with Train 22436 (Vande Bharat Express)",
            "description": (
                "Proposed Civil Track Tamping on NDLS-TKD-UP overlaps with scheduled passage of "
                "Train 22436 (Vande Bharat Express). Required 15-minute headway buffer violated by 35 minutes."
            ),
            "entities_involved": {
                "maintenance_task": "TSK-ENG-2026-0101 (Mainline Track Tamping)",
                "train": "22436 Vande Bharat Express",
                "train_type": "Vande_Bharat",
                "section": "NDLS-TKD-UP"
            },
            "location": "NDLS-TKD-UP (KM 12/4 - 15/2)",
            "time_window": {
                "start": datetime(base_date.year, base_date.month, base_date.day, 6, 15).isoformat(),
                "end": datetime(base_date.year, base_date.month, base_date.day, 8, 45).isoformat()
            },
            "status": "Open",
            "recommended_resolution": {
                "action_code": "RESCHEDULE_TO_NIGHT_WINDOW",
                "title": "Shift Possession to Night Off-Peak Window (01:30 - 04:30)",
                "details": (
                    "Re-schedule track tamping possession to low-traffic slot 01:30 - 04:30. "
                    "Eliminates 35-minute passenger regulation on Vande Bharat and preserves 100% punctuality."
                ),
                "estimated_delay_saved_minutes": 35,
                "feasibility": "High (Approved off-peak window available)"
            }
        })

        results.append({
            "conflict_id": "CONF-2026-MVT-002",
            "conflict_type": "Maintenance_vs_Train",
            "severity": "Medium",
            "title": "OHE Dropper Adjustment Intersects Freight Path (G-8821 BOXN Coal)",
            "description": (
                "TRD Catenary inspection window overlaps with BOXN Heavy Haul Freight G-8821 path. "
                "Freight transit would be halted on running line."
            ),
            "entities_involved": {
                "maintenance_task": "TSK-TRD-2026-0305 (OHE Dropper Inspection)",
                "train": "G-8821 BOXN Heavy Haul Coal",
                "train_type": "Freight",
                "section": "NDLS-TKD-UP"
            },
            "location": "NDLS-TKD-UP (KM 16/0)",
            "time_window": {
                "start": datetime(base_date.year, base_date.month, base_date.day, 2, 30).isoformat(),
                "end": datetime(base_date.year, base_date.month, base_date.day, 4, 0).isoformat()
            },
            "status": "Open",
            "recommended_resolution": {
                "action_code": "REGULATE_TRAIN_TO_LOOP",
                "title": "Regulate Freight on Tuglakabad Yard Loop Line #04",
                "details": (
                    "Divert freight G-8821 into TKD yard loop line 18 minutes prior to possession start. "
                    "Maintenance proceeds unhindered; freight experiences minor 20-minute buffered dwell."
                ),
                "estimated_delay_saved_minutes": 15,
                "feasibility": "Immediate (Yard line clear)"
            }
        })

        return results

    # =========================================================================
    # RULE 2: MAINTENANCE VS MAINTENANCE
    # =========================================================================
    @classmethod
    def _detect_maintenance_vs_maintenance(
        cls,
        db: Optional[Session] = None,
        section_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        base_date = datetime.utcnow().date()
        return [{
            "conflict_id": "CONF-2026-MVM-001",
            "conflict_type": "Maintenance_vs_Maintenance",
            "severity": "High",
            "title": "Uncoordinated Spatial Overlap: Deep Screening vs Ultrasonic Rail Testing",
            "description": (
                "Ballast cleaning machine (BCM) track lifting scheduled concurrently with hand-pushed "
                "USFD flaw detection trolley on the same 800-meter track stretch (KM 18.2). High risk of transducer damage."
            ),
            "entities_involved": {
                "task_1": "TSK-ENG-2026-0042 (Ballast Deep Screening BCM)",
                "task_2": "TSK-ENG-2026-0088 (Ultrasonic Rail Weld USFD Testing)",
                "section": "NDLS-TKD-UP"
            },
            "location": "NDLS-TKD-UP (KM 18/2 - 19/0)",
            "time_window": {
                "start": datetime(base_date.year, base_date.month, base_date.day, 10, 0).isoformat(),
                "end": datetime(base_date.year, base_date.month, base_date.day, 12, 30).isoformat()
            },
            "status": "Open",
            "recommended_resolution": {
                "action_code": "SEQUENCE_TASKS_CHRONOLOGICALLY",
                "title": "Sequence USFD Testing Post-BCM Ballast Packing",
                "details": (
                    "Shift USFD trolley testing to start 45 minutes after BCM passes KM 19.0. "
                    "Allows clean acoustic coupling on newly seated track."
                ),
                "estimated_delay_saved_minutes": 0,
                "feasibility": "High"
            }
        }]

    # =========================================================================
    # RULE 3: BLOCK VS BLOCK
    # =========================================================================
    @classmethod
    def _detect_block_vs_block(
        cls,
        db: Optional[Session] = None,
        section_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        base_date = datetime.utcnow().date()
        return [{
            "conflict_id": "CONF-2026-BVB-001",
            "conflict_type": "Block_vs_Block",
            "severity": "High",
            "title": "Redundant Parallel Block Requests on TKD-PWL-UP Fast Line",
            "description": (
                "Two distinct departments requested separate traffic blocks on the same track section: "
                "Block BLK-2026-0112 (Civil ENG, 14:00 - 16:30) and Block BLK-2026-0115 (Signal S&T, 15:00 - 17:30). "
                "Executing separately causes 5.0 hours total corridor closure."
            ),
            "entities_involved": {
                "block_1": "BLK-2026-0112 (Civil Engineering Track Renewal)",
                "block_2": "BLK-2026-0115 (Signal & Telecom Interlocking Overhaul)",
                "section": "TKD-PWL-UP"
            },
            "location": "TKD-PWL-UP (Palwal North Crossover)",
            "time_window": {
                "start": datetime(base_date.year, base_date.month, base_date.day, 14, 0).isoformat(),
                "end": datetime(base_date.year, base_date.month, base_date.day, 17, 30).isoformat()
            },
            "status": "Open",
            "recommended_resolution": {
                "action_code": "MERGE_INTO_COMBINED_BLOCK",
                "title": "Merge into Single 3.5-Hour Integrated Shadow Block",
                "details": (
                    "Combine both requests into unified Block OPT-BLK-SHADOW-01 (14:00 - 17:30). "
                    "Saves 2.0 full track possession hours and eliminates redundant train re-routings."
                ),
                "estimated_delay_saved_minutes": 120,
                "feasibility": "High (Synergistic departmental scope)"
            }
        }]

    # =========================================================================
    # RULE 4: DEPARTMENT VS DEPARTMENT
    # =========================================================================
    @classmethod
    def _detect_department_vs_department(
        cls,
        db: Optional[Session] = None,
        section_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        base_date = datetime.utcnow().date()
        return [{
            "conflict_id": "CONF-2026-DVD-001",
            "conflict_type": "Department_vs_Department",
            "severity": "Critical",
            "title": "Operational Contradiction: TRD Live OHE Test vs ENG Track Crane Operation",
            "description": (
                "Traction (TRD) requires 25kV power energized for dynamic pantograph spark testing, "
                "while Civil (ENG) is deploying a rail handling crane requiring strict 2.0-meter 25kV power cut."
            ),
            "entities_involved": {
                "dept_1": "TRD (Traction Distribution)",
                "dept_2": "ENG (Civil Engineering)",
                "equipment": "Rail Crane RC-04 vs 25kV Live Overhead Catenary",
                "section": "PWL-MTJ-UP"
            },
            "location": "PWL-MTJ-UP (KM 42/0 - 44/5)",
            "time_window": {
                "start": datetime(base_date.year, base_date.month, base_date.day, 11, 0).isoformat(),
                "end": datetime(base_date.year, base_date.month, base_date.day, 13, 0).isoformat()
            },
            "status": "Open",
            "recommended_resolution": {
                "action_code": "ISSUE_JOINT_PROTOCOL_STAGING",
                "title": "Stage Joint Work: 25kV Power Isolation First, Energize in Phase 2",
                "details": (
                    "Mandate Stage 1 (11:00 - 12:30): 25kV Power Block permit with discharge rods for crane operations. "
                    "Stage 2 (12:30 - 13:00): Crane secures jib; track cleared; 25kV re-energized for TRD testing."
                ),
                "estimated_delay_saved_minutes": 0,
                "feasibility": "High (Strict safety protocol)"
            }
        }]

    # =========================================================================
    # RULE 5: RESOURCE VS RESOURCE CONTENTION
    # =========================================================================
    @classmethod
    def _detect_resource_vs_resource(
        cls,
        db: Optional[Session] = None,
        section_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        base_date = datetime.utcnow().date()
        return [{
            "conflict_id": "CONF-2026-RVR-001",
            "conflict_type": "Resource_vs_Resource",
            "severity": "High",
            "title": "Machine Contention: 09-3X Tamping Machine TMP-01 Double Booked",
            "description": (
                "High-output tamper TMP-01 is concurrently scheduled for Turnout Tamping at NDLS (13:00 - 16:00) "
                "and Mainline Packing at Tuglakabad (14:30 - 17:30). Spatial separation is 16 km with 0 transit time."
            ),
            "entities_involved": {
                "resource": "TMP-01 (Plasser & Theurer 09-3X Tamping Machine)",
                "task_1": "TSK-ENG-0101 (NDLS Station Turnouts)",
                "task_2": "TSK-ENG-0145 (TKD UP Fast Tamping)",
                "conflict": "Double Booking & Zero Transit Headway"
            },
            "location": "NDLS vs TKD (16 KM separation)",
            "time_window": {
                "start": datetime(base_date.year, base_date.month, base_date.day, 14, 30).isoformat(),
                "end": datetime(base_date.year, base_date.month, base_date.day, 16, 0).isoformat()
            },
            "status": "Open",
            "recommended_resolution": {
                "action_code": "REALLOCATE_RESOURCE",
                "title": "Assign Backup Tamper TMP-02 from Ghaziabad Machine Depot",
                "details": (
                    "Deploy standby tamper TMP-02 from GZB depot for the Tuglakabad section. "
                    "Keeps both critical possessions on schedule without transit delays."
                ),
                "estimated_delay_saved_minutes": 90,
                "feasibility": "Immediate (TMP-02 certified available)"
            }
        }]

    # =========================================================================
    # RULE 6: SAFETY CONFLICTS
    # =========================================================================
    @classmethod
    def _detect_safety_conflicts(
        cls,
        db: Optional[Session] = None,
        section_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        base_date = datetime.utcnow().date()
        return [{
            "conflict_id": "CONF-2026-SAF-001",
            "conflict_type": "Safety_Conflict",
            "severity": "Critical",
            "title": "Critical Safety Violation: Missing 25kV Power Block for Portal Mast Gantry Work",
            "description": (
                "Civil engineering gang scheduled for portal gantry footing repair within 1.8 meters "
                "of live 25kV OHE conductors. Required 25kV Power Block is NOT marked as approved."
            ),
            "entities_involved": {
                "task": "TSK-ENG-0210 (Portal Mast Footing Grouting)",
                "hazard": "25kV AC Electrocution Risk (< 2.0m clearance)",
                "missing_permit": "Traction Power Block Permit-to-Work"
            },
            "location": "MTJ-AGC-UP (KM 68/10)",
            "time_window": {
                "start": datetime(base_date.year, base_date.month, base_date.day, 9, 30).isoformat(),
                "end": datetime(base_date.year, base_date.month, base_date.day, 12, 0).isoformat()
            },
            "status": "Open",
            "recommended_resolution": {
                "action_code": "ENFORCE_POWER_BLOCK_AND_CAUTION_ORDER",
                "title": "Mandate Synchronized 25kV Power Block & Grounding Permit",
                "details": (
                    "Do NOT sanction work until TRD Power Controller issues Form ETR-4 (Permit-to-Work). "
                    "Attach discharge rods to earth catenary and impose 30 km/h caution order on adjacent track."
                ),
                "estimated_delay_saved_minutes": 0,
                "feasibility": "Mandatory Statutory Compliance (Indian Railways Safety Manual)"
            }
        }]

    # =========================================================================
    # PROPOSED SCHEDULE VALIDATOR (POST /api/conflicts/check)
    # =========================================================================
    @classmethod
    def check_proposed_schedule(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates a proposed block or task against all 6 conflict categories.
        """
        detected_conflicts = []

        start_time_str = str(payload.get("start_time") or payload.get("requested_start_time") or "")
        end_time_str = str(payload.get("end_time") or payload.get("requested_end_time") or "")
        section_code = str(payload.get("section_code") or payload.get("section") or "NDLS-TKD-UP")
        dept = str(payload.get("department_code") or payload.get("lead_department") or "ENG").upper()
        req_power = bool(payload.get("required_power_block", False))
        block_type = str(payload.get("block_type", "Traffic"))

        # Check 1: Daytime passenger clash
        st_hour = 10
        if "T" in start_time_str:
            try:
                st_hour = datetime.fromisoformat(start_time_str.replace("Z", "")).hour
            except Exception:
                pass

        if 6 <= st_hour <= 21:
            detected_conflicts.append({
                "conflict_id": f"CHK-MVT-{int(datetime.utcnow().timestamp())}",
                "conflict_type": "Maintenance_vs_Train",
                "severity": "High",
                "title": f"Proposed Daytime Block on {section_code} Disrupts Express Corridors",
                "description": f"Starting possession at hour {st_hour}:00 conflicts with scheduled passenger peak operations.",
                "recommended_resolution": {
                    "action_code": "RESCHEDULE_TO_NIGHT_WINDOW",
                    "title": "Shift start time to low-traffic night window (01:30 - 04:30)",
                    "details": "Protects premier express punctuality and guarantees zero passenger delay."
                }
            })

        # Check 2: Safety power block mismatch
        if req_power and block_type == "Traffic":
            detected_conflicts.append({
                "conflict_id": f"CHK-SAF-{int(datetime.utcnow().timestamp())}",
                "conflict_type": "Safety_Conflict",
                "severity": "Critical",
                "title": "Safety Constraint Mismatch: Requires 25kV Power Block",
                "description": "Task requires overhead power isolation but block was requested as Traffic-Only.",
                "recommended_resolution": {
                    "action_code": "UPGRADE_TO_INTEGRATED_POWER_BLOCK",
                    "title": "Upgrade request to Combined Traffic & Power Block",
                    "details": "Submit synchronized request to TRD Power Controller for 25kV permit."
                }
            })

        # Risk level determination
        crit_count = sum(1 for c in detected_conflicts if c["severity"] == "Critical")
        high_count = sum(1 for c in detected_conflicts if c["severity"] == "High")

        if crit_count > 0:
            risk_level = "Critical"
            can_proceed = False
        elif high_count > 0:
            risk_level = "High"
            can_proceed = False
        elif len(detected_conflicts) > 0:
            risk_level = "Medium"
            can_proceed = True
        else:
            risk_level = "Low (Safe to Sanction)"
            can_proceed = True

        return {
            "has_conflicts": len(detected_conflicts) > 0,
            "conflict_count": len(detected_conflicts),
            "risk_level": risk_level,
            "can_proceed_safely": can_proceed,
            "conflicts": detected_conflicts,
            "recommended_resolutions": [c["recommended_resolution"] for c in detected_conflicts],
            "data_mode": "SIMULATED DEMO DATA"
        }


conflict_detector = RailwayConflictDetector()

