import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

class MockTMSClient:
    """
    Mock Integration Adapter for Track Management System (TMS) - Civil / Permanent Way.
    Simulates live telemetry feeds for:
    - Track assets (Rails, Sleepers, Turnouts, Level Crossings, Bridges)
    - Track defects (USFD ultrasonic flaw detection, Gauge deviations, TGI deficits)
    - P-Way scheduled maintenance tasks (BCM deep screening, tamping, rail grinding)
    Notice: Prominently marked as SIMULATED DEMO DATA.
    """

    SYSTEM_NAME = "TMS"
    DEPARTMENT = "ENG"
    DATA_MODE = "SIMULATED DEMO DATA"

    REALISTIC_SECTIONS = [
        "NDLS-TKD-UP", "NDLS-TKD-DN",
        "TKD-PWL-UP", "TKD-PWL-DN",
        "PWL-MTJ-UP", "PWL-MTJ-DN",
        "MTJ-AGC-UP", "MTJ-AGC-DN",
        "AGC-DHO-UP", "AGC-DHO-DN",
        "DHO-GWL-UP", "DHO-GWL-DN",
        "GWL-VGLJ-UP", "GWL-VGLJ-DN",
        "VGLJ-BPL-UP", "VGLJ-BPL-DN",
        "BPL-ET-UP", "BPL-ET-DN",
        "ET-NGP-UP", "ET-NGP-DN",
        "CNB-PRYJ-SEC1-UP", "CNB-PRYJ-SEC1-DN",
        "CNB-PRYJ-SEC2-UP", "CNB-PRYJ-SEC2-DN",
        "PRYJ-DDU-UP", "PRYJ-DDU-DN"
    ]

    @classmethod
    def fetch_assets(cls, count: int = 50) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        asset_templates = [
            ("Rail", "60kg UIC 90UTS Premium Continuous Welded Rail (CWR)", 85.0),
            ("Sleeper", "Pre-stressed Concrete (PSC) Monoblock Sleeper Trackbed", 92.5),
            ("Turnout", "1 in 12 Curved Switch Heavy Diamond Crossing", 78.0),
            ("Level_Crossing", "Manned Interlocked Level Crossing Gate (Class Special)", 88.0),
            ("Bridge", "Ballasted Deck Steel Girder Bridge (Under-slung)", 95.0),
            ("Rail", "52kg 90UTS Flash Butt Welded Track Section", 82.0),
            ("Turnout", "1 in 8.5 Thick Web Switch (TWS) High-Speed Turnout", 89.0),
            ("Curve", "2.5 Degree Transition Curve with 140mm Cant", 84.0),
            ("SEJ", "Switch Expansion Joint (SEJ 80mm Gap Capacity)", 80.0),
            ("Trackbed", "Blanketing Layer with Geo-textile Membrane", 91.0)
        ]
        results = []
        for i in range(count):
            atype, aname, base_h = asset_templates[i % len(asset_templates)]
            sec = cls.REALISTIC_SECTIONS[i % len(cls.REALISTIC_SECTIONS)]
            km = round(10.0 + (i * 3.7) % 190.0, 3)
            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "external_asset_id": f"TMS-AST-{1000 + i}",
                "asset_code": f"AST-TMS-{sec}-{i:04d}",
                "asset_name": f"{aname} at Km {km} ({sec})",
                "asset_type": atype,
                "section_code": sec,
                "km_location": km,
                "health_score": round(max(30.0, base_h + (i % 7) - 3.5), 1),
                "last_inspected": (now - timedelta(days=(i * 3) % 45 + 1)).isoformat(),
                "status": "Operational" if base_h > 75 else "Degraded"
            })
        return results

    @classmethod
    def fetch_defects(cls, count: int = 80) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        defect_types = [
            ("Ultrasonic I-Rail Weld Flaw (USFD 70° Probe Indication)", "Critical", 30),
            ("Gauge Widening beyond IR-PWM limits (+6mm on curve)", "Major", 45),
            ("Missing Elastic Rail Clip (ERC) Cluster (12 consecutive clips)", "Critical", 30),
            ("Ballast Cushion Choking & Mud Pumping at Level Crossing", "Major", 0),
            ("Switch Rail Toe Wear on 1:12 Turnout Tongue Rail", "Major", 45),
            ("Track Geometry Index (TGI) Twist Deficit (Twist > 4mm/m)", "Minor", 0),
            ("Rail Head Squat & Corrugation Defect (>0.5mm depth)", "Major", 45),
            ("Fishplated Joint Bolt Fractured & Gap Opening (>10mm)", "Critical", 20),
            ("Loose Creep Anchor / Sleeper Void under PSC Sleeper", "Minor", 0),
            ("Cess Erosion & Ballast Deficiency on High Embankment", "Minor", 0),
            ("Scabbing and Wheel Burn on Low Rail in Sharp Curve", "Major", 45),
            ("Check Rail Clearance Inadequate on Level Crossing Gate", "Critical", 30)
        ]
        results = []
        for i in range(count):
            dtype, sev, speed = defect_types[i % len(defect_types)]
            sec = cls.REALISTIC_SECTIONS[i % len(cls.REALISTIC_SECTIONS)]
            km = round(12.0 + (i * 2.3) % 185.0, 3)
            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "external_defect_id": f"TMS-DEF-{10000 + i}",
                "defect_type": dtype,
                "severity": sev,
                "section_code": sec,
                "km_location": km,
                "speed_restriction_imposed": speed,
                "inspection_method": "Continuous Ultrasonic Testing (SPURT Car / USFD)",
                "reported_at": (now - timedelta(minutes=(i * 18) % 720 + 10)).isoformat()
            })
        return results

    # Alias for legacy compatibility
    fetch_latest_defects = fetch_defects

    @classmethod
    def fetch_maintenance(cls, count: int = 80) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        task_templates = [
            ("Deep Screening & Ballast Cleaning by BCM", 240, True, False, True, {"BCM": 1, "gang_men": 16}),
            ("Track Tamping & Lining by 09-3X Dynamic Express", 180, True, False, True, {"Tamping_Machine": 1, "gang_men": 8}),
            ("Flash Butt Weld Joint Renewal & Rail Exchange", 150, True, False, True, {"gang_men": 14}),
            ("Switch Expansion Joint (SEJ) Gap Adjustment & Packing", 120, True, False, False, {"gang_men": 6}),
            ("Rail Grinding Machine (RGM) Surface Reprofiling", 210, True, False, True, {"Rail_Grinder": 1, "gang_men": 6}),
            ("Through Rail Renewal (TRR) 60kg 90UTS Welded Rails", 300, True, False, True, {"gang_men": 24}),
            ("Through Sleeper Renewal (TSR) PSC Monoblock Sleepers", 240, True, False, True, {"gang_men": 18}),
            ("De-stressing of Continuous Welded Rail (CWR/LWR)", 180, True, False, True, {"gang_men": 12}),
            ("Level Crossing Gate Overhaul & Road Surface Renewal", 120, True, False, False, {"gang_men": 8}),
            ("Ballast Regulation by BRM Dynamic Regulator", 150, True, False, True, {"BRM_Machine": 1, "gang_men": 6})
        ]
        results = []
        for i in range(count):
            title, dur, t_block, p_block, traffic, res = task_templates[i % len(task_templates)]
            sec = cls.REALISTIC_SECTIONS[i % len(cls.REALISTIC_SECTIONS)]
            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "external_task_id": f"TMS-TSK-{10000 + i}",
                "title": f"{title} on {sec}",
                "section_code": sec,
                "estimated_duration_minutes": dur,
                "required_track_possession": t_block,
                "required_power_block": p_block,
                "required_traffic_block": traffic,
                "min_resources_needed": res,
                "scheduled_window": (now + timedelta(hours=(i * 2) % 72 + 4)).isoformat()
            })
        return results

    @classmethod
    def fetch_bundle(cls, asset_count: int = 50, defect_count: int = 80, maintenance_count: int = 80) -> Dict[str, Any]:
        """Returns the full simulated TMS dataset bundle."""
        assets = cls.fetch_assets(count=asset_count)
        defects = cls.fetch_defects(count=defect_count)
        tasks = cls.fetch_maintenance(count=maintenance_count)
        return {
            "system": cls.SYSTEM_NAME,
            "system_name": "Track Management System",
            "department": cls.DEPARTMENT,
            "department_name": "Civil Engineering / Permanent Way",
            "data_mode": cls.DATA_MODE,
            "disclaimer": "SIMULATED DEMO DATA - Mock Track Management System API Feed",
            "total_assets": len(assets),
            "total_defects": len(defects),
            "total_maintenance_tasks": len(tasks),
            "assets": assets,
            "defects": defects,
            "maintenance_tasks": tasks
        }

    @classmethod
    def ping_system_health(cls) -> Dict[str, Any]:
        return {
            "system": cls.SYSTEM_NAME,
            "status": "Online (Simulated Gateway)",
            "latency_ms": 24,
            "last_heartbeat": datetime.utcnow().isoformat(),
            "data_mode": cls.DATA_MODE,
            "records_available": 1420
        }
