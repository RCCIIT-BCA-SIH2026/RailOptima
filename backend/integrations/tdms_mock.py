import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

class MockTDMSClient:
    """
    Mock Integration Adapter for Traction Distribution Management System (TDMS) - Electrical / TRD.
    Simulates live telemetry feeds for:
    - 25kV AC OHE assets (Catenary, Contact Wire, Masts, Traction Substations, Section Insulators)
    - Traction defects (Dropper sag, contact wire wear, hot spots, insulator flashover)
    - TRD scheduled maintenance tasks (Tower Wagon inspection, isolator overhaul)
    Notice: Prominently marked as SIMULATED DEMO DATA.
    """

    SYSTEM_NAME = "TDMS"
    DEPARTMENT = "TRD"
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
            ("OHE_Mast", "25kV AC Galvanized Steel Portal Mast Structure & Cantilever", 94.0),
            ("Substation", "132/25kV 30MVA Traction Substation (TSS Transformer #01)", 89.0),
            ("Contact_Wire", "107 sq mm Hard Drawn Grooved Copper Contact Wire", 84.0),
            ("Neutral_Section", "Short Neutral Section with PTFE Glazed Rod Insulators", 88.0),
            ("Isolator", "25kV Double Pole Motorized OHE Sectioning Post Isolator", 92.0),
            ("Catenary_Wire", "65 sq mm Cadmium Copper Catenary Messenger Wire", 90.0),
            ("Auto_Tensioning", "Auto Tensioning Device (ATD 3:1 Pulley Ratio with Weights)", 91.0),
            ("Feeding_Post", "25kV AC Track Feeding Post (FP) with Interrupters", 93.0)
        ]
        results = []
        for i in range(count):
            atype, aname, base_h = asset_templates[i % len(asset_templates)]
            sec = cls.REALISTIC_SECTIONS[i % len(cls.REALISTIC_SECTIONS)]
            km = round(8.0 + (i * 4.3) % 185.0, 3)
            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "external_asset_id": f"TDMS-AST-{3000 + i}",
                "asset_code": f"AST-TDMS-{sec}-{i:04d}",
                "asset_name": f"{aname} at Km {km} ({sec})",
                "asset_type": atype,
                "section_code": sec,
                "km_location": km,
                "health_score": round(max(30.0, base_h + (i % 6) - 3.0), 1),
                "contact_wire_diameter_mm": round(9.5 + (i % 8) * 0.25, 2),
                "catenary_tension_kg": 1000 + (i % 5) * 5 - 10,
                "last_inspected": (now - timedelta(days=(i * 2) % 35 + 1)).isoformat(),
                "status": "Operational" if base_h > 72 else "Degraded"
            })
        return results

    @classmethod
    def fetch_defects(cls, count: int = 70) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        defect_types = [
            ("OHE Catenary Dropper Broken (Dropper Sag exceeding 50mm)", "Critical", 30),
            ("Traction Substation 25kV Circuit Breaker SF6 Gas Pressure Low", "Critical", 0),
            ("Contact Wire Diameter Worn to 9.1mm (Critical Condemning Limit 8.25mm)", "Major", 0),
            ("Porcelain / Composite Insulator Flashover & Heavy Pollution Deposit", "Major", 0),
            ("Neutral Section PTFE Arc Trap Burn Marks & Pitting", "Major", 0),
            ("Cantilever Assembly Stay Arm Clamp Loose at Portal Mast", "Major", 25),
            ("Thermal Hot Spot on Feeder Jumper Connector (>85°C Delta)", "Major", 30),
            ("Auto Tensioning Device (ATD) Counterweight Over-Travel", "Minor", 0),
            ("Return Current Bond Disconnected on Traction Mast", "Minor", 0),
            ("Section Insulator Air Clearance Inadequate (<320mm)", "Critical", 20)
        ]
        results = []
        for i in range(count):
            dtype, sev, speed = defect_types[i % len(defect_types)]
            sec = cls.REALISTIC_SECTIONS[i % len(cls.REALISTIC_SECTIONS)]
            km = round(11.0 + (i * 2.5) % 182.0, 3)
            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "external_defect_id": f"TDMS-DEF-{30000 + i}",
                "defect_type": dtype,
                "severity": sev,
                "section_code": sec,
                "km_location": km,
                "contact_wire_height_m": round(5.50 + (i % 6) * 0.04, 2),
                "stagger_mm": -150 + (i * 12) % 300,
                "speed_restriction_imposed": speed,
                "reported_at": (now - timedelta(minutes=(i * 16) % 650 + 10)).isoformat()
            })
        return results

    # Alias for legacy compatibility
    fetch_latest_defects = fetch_defects

    @classmethod
    def fetch_maintenance(cls, count: int = 70) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        task_templates = [
            ("8-Wheeler Tower Wagon Contact Wire Height/Stagger Overhaul", 180, True, True, True, {"Tower_Wagon": 1, "gang_men": 6}),
            ("25kV Catenary Wire Dropper Replacement & Dynamic Tensioning", 120, True, True, True, {"Tower_Wagon": 1, "gang_men": 5}),
            ("Traction Substation Transformer SF6 Gas Leakage Test & AOH", 240, False, True, False, {"gang_men": 4}),
            ("Neutral Section PTFE Glide Strip Inspection & Cleaning", 90, True, True, True, {"Tower_Wagon": 1, "gang_men": 4}),
            ("OHE Foot Patrolling & Current Collection High Speed Test", 120, False, False, False, {"gang_men": 3}),
            ("Isolator Blade Contact Cleaning & Motorized Drive Alignment", 90, False, True, False, {"gang_men": 4}),
            ("Tree Trimming & Tree Branch Clearance along 25kV OHE", 150, True, True, True, {"Tower_Wagon": 1, "gang_men": 8}),
            ("Auto Tensioning Device (ATD) Pulley Lubrication & Calibration", 90, True, True, False, {"gang_men": 4})
        ]
        results = []
        for i in range(count):
            title, dur, t_block, p_block, traffic, res = task_templates[i % len(task_templates)]
            sec = cls.REALISTIC_SECTIONS[i % len(cls.REALISTIC_SECTIONS)]
            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "external_task_id": f"TDMS-TSK-{30000 + i}",
                "title": f"{title} on {sec}",
                "section_code": sec,
                "estimated_duration_minutes": dur,
                "required_track_possession": t_block,
                "required_power_block": p_block,
                "required_traffic_block": traffic,
                "min_resources_needed": res,
                "scheduled_window": (now + timedelta(hours=(i * 2) % 65 + 4)).isoformat()
            })
        return results

    @classmethod
    def fetch_bundle(cls, asset_count: int = 40, defect_count: int = 70, maintenance_count: int = 70) -> Dict[str, Any]:
        """Returns the full simulated TDMS dataset bundle."""
        assets = cls.fetch_assets(count=asset_count)
        defects = cls.fetch_defects(count=defect_count)
        tasks = cls.fetch_maintenance(count=maintenance_count)
        return {
            "system": cls.SYSTEM_NAME,
            "system_name": "Traction Distribution Management System",
            "department": cls.DEPARTMENT,
            "department_name": "Electrical / Traction Distribution (TRD)",
            "data_mode": cls.DATA_MODE,
            "disclaimer": "SIMULATED DEMO DATA - Mock Traction Distribution Management System Feed",
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
            "latency_ms": 28,
            "last_heartbeat": datetime.utcnow().isoformat(),
            "data_mode": cls.DATA_MODE,
            "records_available": 960
        }
