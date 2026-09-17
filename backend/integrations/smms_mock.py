import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

class MockSMMSClient:
    """
    Mock Integration Adapter for Signalling Maintenance & Management System (SMMS) - S&T.
    Simulates live telemetry feeds for:
    - S&T assets (Point Machines, Track Circuits, Electronic Interlocking, Signals, Axle Counters)
    - Signal defects (Detection failure, voltage drops, cable insulation degradation)
    - S&T scheduled maintenance tasks (Point machine overhaul, SSDAC calibration)
    Notice: Prominently marked as SIMULATED DEMO DATA.
    """

    SYSTEM_NAME = "SMMS"
    DEPARTMENT = "SNT"
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
        "PRYJ-DDU-UP", "PRYJ-DDU-DN"
    ]

    @classmethod
    def fetch_assets(cls, count: int = 40) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        asset_templates = [
            ("Point_Machine", "IRS Rotary Electric Point Machine (Type 143 / 220mm Throw)", 87.0),
            ("Track_Circuit", "High Voltage Impulse Audio Frequency Track Circuit (AFTC)", 91.0),
            ("Signal_Post", "Multi-Aspect 4-Aspect Color Light Signal Post (MACLS with LED Aspects)", 94.0),
            ("Electronic_Interlocking", "Fail-Safe Electronic Interlocking (EI) Microprocessor Dual-Voter Rack", 98.0),
            ("Axle_Counter", "High-Reliability Multi-Section Digital Axle Counter (MSDAC Sensor Head)", 93.0),
            ("IPS_Power", "Integrated Power Supply (IPS 110V DC) System for Signalling", 96.0),
            ("Block_Instrument", "Solid State Tokenless Block Instrument (UFSBI)", 95.0),
            ("Relay_Rack", "Q-Style Plug-In Signalling Relay Group (QN1 / QTA4)", 89.0)
        ]
        results = []
        for i in range(count):
            atype, aname, base_h = asset_templates[i % len(asset_templates)]
            sec = cls.REALISTIC_SECTIONS[i % len(cls.REALISTIC_SECTIONS)]
            km = round(5.0 + (i * 4.1) % 185.0, 3)
            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "external_asset_id": f"SMMS-AST-{2000 + i}",
                "asset_code": f"AST-SMMS-{sec}-{i:04d}",
                "asset_name": f"{aname} at Km {km} ({sec})",
                "asset_type": atype,
                "section_code": sec,
                "km_location": km,
                "health_score": round(max(35.0, base_h + (i % 5) - 2.5), 1),
                "operating_voltage": round(23.0 + (i % 10) * 0.15, 2),
                "last_calibrated": (now - timedelta(days=(i * 2) % 30 + 1)).isoformat(),
                "status": "Operational" if base_h > 75 else "Degraded"
            })
        return results

    @classmethod
    def fetch_defects(cls, count: int = 70) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        defect_types = [
            ("Point Machine Normal/Reverse Detection Deviation (>5mm gap)", "Critical", 30),
            ("Digital Axle Counter Signal Attenuation (Sensor #02 Phase Shift)", "Critical", 0),
            ("Track Circuit AFTC End Voltage Drop (<1.2V Drop)", "Major", 0),
            ("LED Signal Main Filament Current Deterioration Warning", "Major", 0),
            ("Signalling Underground Cable Insulation Drop (<1 Megaohm)", "Major", 15),
            ("Electronic Interlocking VDU Serial Communication Loss Warning", "Minor", 0),
            ("Track Feed Battery Charger Ripple Voltage Excessive (>5%)", "Minor", 0),
            ("Point Motor Operating Current Spike (>5.5 Amperes on throw)", "Major", 25),
            ("Single Section Digital Axle Counter (SSDAC) Reset Failure", "Critical", 20),
            ("Relay Interlocking Contact Resistance Above Permissible Limit", "Minor", 0)
        ]
        results = []
        for i in range(count):
            dtype, sev, speed = defect_types[i % len(defect_types)]
            sec = cls.REALISTIC_SECTIONS[i % len(cls.REALISTIC_SECTIONS)]
            km = round(8.0 + (i * 2.7) % 180.0, 3)
            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "external_defect_id": f"SMMS-DEF-{20000 + i}",
                "defect_type": dtype,
                "severity": sev,
                "section_code": sec,
                "km_location": km,
                "operating_time_seconds": round(4.5 + (i % 6) * 0.4, 2),
                "peak_current_amperes": round(3.2 + (i % 7) * 0.35, 2),
                "speed_restriction_imposed": speed,
                "reported_at": (now - timedelta(minutes=(i * 15) % 600 + 10)).isoformat()
            })
        return results

    # Alias for legacy compatibility
    fetch_latest_defects = fetch_defects

    @classmethod
    def fetch_maintenance(cls, count: int = 70) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        task_templates = [
            ("Point Machine Clutch Setting & Friction Current Calibration", 90, True, False, False, {"gang_men": 4}),
            ("AFTC Track Circuit Receiver Sensitivity & Tuning Calibration", 60, True, False, False, {"gang_men": 3}),
            ("Signal Sighting Committee Night Inspection & Focus Alignment", 120, False, False, False, {"gang_men": 2}),
            ("MSDAC Wheel Sensor Head Overhaul & Clamping Torque Test", 100, True, False, False, {"gang_men": 4}),
            ("Relay Room Electronic Interlocking Log Analysis & Diagnostics", 60, False, False, False, {"gang_men": 2}),
            ("Signalling Cable Meggering & Earth Leakage Detector Audit", 90, False, False, False, {"gang_men": 3}),
            ("Level Crossing Electric Lifting Barrier Overhaul & Interlock Test", 120, True, False, False, {"gang_men": 4}),
            ("Track Feed Battery Bank Equalizing Charge & Sp. Gravity Test", 60, False, False, False, {"gang_men": 2})
        ]
        results = []
        for i in range(count):
            title, dur, t_block, p_block, traffic, res = task_templates[i % len(task_templates)]
            sec = cls.REALISTIC_SECTIONS[i % len(cls.REALISTIC_SECTIONS)]
            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "external_task_id": f"SMMS-TSK-{20000 + i}",
                "title": f"{title} on {sec}",
                "section_code": sec,
                "estimated_duration_minutes": dur,
                "required_track_possession": t_block,
                "required_power_block": p_block,
                "required_traffic_block": traffic,
                "min_resources_needed": res,
                "scheduled_window": (now + timedelta(hours=(i * 2) % 60 + 4)).isoformat()
            })
        return results

    @classmethod
    def fetch_bundle(cls, asset_count: int = 40, defect_count: int = 70, maintenance_count: int = 70) -> Dict[str, Any]:
        """Returns the full simulated SMMS dataset bundle."""
        assets = cls.fetch_assets(count=asset_count)
        defects = cls.fetch_defects(count=defect_count)
        tasks = cls.fetch_maintenance(count=maintenance_count)
        return {
            "system": cls.SYSTEM_NAME,
            "system_name": "Signalling Maintenance & Management System",
            "department": cls.DEPARTMENT,
            "department_name": "Signal & Telecommunications (S&T)",
            "data_mode": cls.DATA_MODE,
            "disclaimer": "SIMULATED DEMO DATA - Mock Signalling Maintenance & Management System Feed",
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
            "latency_ms": 31,
            "last_heartbeat": datetime.utcnow().isoformat(),
            "data_mode": cls.DATA_MODE,
            "records_available": 1180
        }
