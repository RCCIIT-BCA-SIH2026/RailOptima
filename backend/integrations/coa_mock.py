import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

class MockCOAClient:
    """
    Mock Integration Adapter for Control Office Application (COA) - Traffic / Operating.
    Simulates live telemetry feeds for:
    - Train Timetable & Real-Time Tracking (100+ trains)
    - Corridor Capacities & GMT Densities
    - Available Maintenance Block Windows (50+ sections)
    - Goods / Freight Running Forecast (BOXN Coal, BCN Grains, BTPN POL, CONCOR Containers)
    Notice: Prominently marked as SIMULATED DEMO DATA.
    """

    SYSTEM_NAME = "COA"
    DEPARTMENT = "OPT"
    DATA_MODE = "SIMULATED DEMO DATA"

    REALISTIC_CORRIDORS = [
        {"code": "NDLS-AGC", "name": "New Delhi - Agra Cantt High Speed Trunk", "zone": "NCR", "div": "Agra", "dist": 195.0, "cap": 140, "util": 92.4, "max_speed": 160},
        {"code": "AGC-VGLJ", "name": "Agra Cantt - VGL Jhansi Trunk", "zone": "NCR", "div": "Jhansi", "dist": 215.0, "cap": 120, "util": 89.1, "max_speed": 130},
        {"code": "VGLJ-BPL", "name": "VGL Jhansi - Bhopal Jn Mainline", "zone": "WCR", "div": "Bhopal", "dist": 292.0, "cap": 110, "util": 86.5, "max_speed": 130},
        {"code": "BPL-ET", "name": "Bhopal Jn - Itarsi Jn Grand Trunk", "zone": "WCR", "div": "Bhopal", "dist": 92.0, "cap": 155, "util": 95.8, "max_speed": 130},
        {"code": "ET-NGP", "name": "Itarsi Jn - Nagpur Jn Central Corridor", "zone": "CR", "div": "Nagpur", "dist": 298.0, "cap": 105, "util": 84.2, "max_speed": 130},
        {"code": "CNB-PRYJ", "name": "Kanpur Central - Prayagraj Jn HDN-2", "zone": "NCR", "div": "Prayagraj", "dist": 194.0, "cap": 145, "util": 94.7, "max_speed": 130},
        {"code": "PRYJ-DDU", "name": "Prayagraj Jn - Pt. Deen Dayal Upadhyaya", "zone": "NCR", "div": "DDU", "dist": 153.0, "cap": 135, "util": 93.2, "max_speed": 130},
        {"code": "NDLS-CNB", "name": "New Delhi - Kanpur Central Fast Line", "zone": "NCR", "div": "Prayagraj", "dist": 440.0, "cap": 160, "util": 96.0, "max_speed": 130}
    ]

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

    REALISTIC_TRAIN_CATALOG = [
        ("22436", "Vande Bharat Express", "Premium_Superfast", "NDLS", "BSB", 130, 0, False, "WAP-7"),
        ("22435", "Vande Bharat Express", "Premium_Superfast", "BSB", "NDLS", 130, 0, False, "WAP-7"),
        ("20172", "Vande Bharat Express", "Premium_Superfast", "NZM", "RKMP", 160, 0, False, "WAP-7"),
        ("12002", "New Delhi Bhopal Shatabdi", "Shatabdi", "NDLS", "RKMP", 150, 0, False, "WAP-5"),
        ("12001", "Bhopal New Delhi Shatabdi", "Shatabdi", "RKMP", "NDLS", 145, 0, False, "WAP-5"),
        ("12302", "Howrah Rajdhani Express", "Rajdhani", "NDLS", "HWH", 130, 0, False, "WAP-7"),
        ("12301", "Howrah New Delhi Rajdhani", "Rajdhani", "HWH", "NDLS", 130, 0, False, "WAP-7"),
        ("12952", "Mumbai Tejas Rajdhani", "Rajdhani", "NDLS", "MMCT", 130, 2, False, "WAP-7"),
        ("12951", "Mumbai New Delhi Rajdhani", "Rajdhani", "MMCT", "NDLS", 130, 0, False, "WAP-7"),
        ("12424", "Dibrugarh Rajdhani Express", "Rajdhani", "NDLS", "DBRG", 125, 0, False, "WAP-7"),
        ("12616", "Grand Trunk Express", "Superfast", "NDLS", "MAS", 110, 12, False, "WAP-7"),
        ("12615", "Grand Trunk Express", "Superfast", "MAS", "NDLS", 105, 14, False, "WAP-7"),
        ("12622", "Tamil Nadu Express", "Superfast", "NDLS", "MAS", 110, 5, False, "WAP-7"),
        ("12626", "Kerala Express", "Superfast", "NDLS", "TVC", 105, 18, False, "WAP-7"),
        ("12722", "Dakshin Express", "Superfast", "NZM", "HYB", 100, 22, False, "WAP-7"),
        ("12138", "Punjab Mail", "Superfast", "FZR", "CSMT", 100, 8, False, "WAP-7"),
        ("12418", "Prayagraj Express", "Superfast", "NDLS", "PRYJ", 120, 0, False, "WAP-7"),
        ("12560", "Shiv Ganga Express", "Superfast", "NDLS", "BSB", 125, 0, False, "WAP-7"),
        ("12802", "Purushottam Express", "Superfast", "NDLS", "PURI", 110, 15, False, "WAP-7"),
        ("12394", "Sampoorna Kranti Express", "Superfast", "NDLS", "RJPB", 125, 4, False, "WAP-7"),
        ("14218", "Unchahar Express", "Mail_Express", "CDG", "PRG", 95, 25, False, "WAP-4"),
        ("12156", "Shaan-e-Bhopal Express", "Superfast", "NZM", "RKMP", 120, 0, False, "WAP-7"),
        ("64567", "Delhi - Palwal EMU Suburban", "Suburban", "NDLS", "PWL", 75, 4, False, "MEMU"),
        ("64568", "Palwal - Delhi EMU Suburban", "Suburban", "PWL", "NDLS", 75, 2, False, "MEMU"),
        ("G-4819", "BOXN Coal Rake (NTPC Dadri)", "Freight_Coal", "DDU", "DER", 65, 35, True, "WAG-9"),
        ("G-5120", "Singrauli Thermal Rake", "Freight_Coal", "SGRL", "TKD", 60, 42, True, "WAG-9"),
        ("G-9021", "CONCOR Multi-Modal Container Sp.", "Freight_Container", "TKD", "JNPT", 75, 0, True, "WAG-12B"),
        ("G-9144", "JNPT DFC Double Stack Container", "Freight_Container", "JNPT", "TKD", 80, 0, True, "WAG-12B"),
        ("G-7712", "BTPN Petroleum POL Rake (IOCL)", "Freight_POL", "MTJ", "ET", 60, 18, True, "WAG-9"),
        ("G-7840", "BPCL Bina Refinery Tanker", "Freight_POL", "BINA", "AGC", 62, 10, True, "WAG-9"),
        ("G-3304", "BCN Foodgrain Rake (FCI)", "Freight_Grain", "FZR", "DDU", 65, 0, True, "WAG-9"),
        ("G-3891", "IFFCO Fertilizer Rake (Urea)", "Freight_Fertilizer", "AONL", "BPL", 60, 20, True, "WAG-9"),
        ("G-6102", "Rapid Discharge Hopper (BOBRN)", "Freight_Coal", "PRYJ", "Dadri", 68, 15, True, "WAG-9"),
        ("G-2291", "SAIL Bokaro Finished Steel Rake", "Freight_Steel", "BKSC", "FDB", 58, 28, True, "WAG-9")
    ]

    @classmethod
    def fetch_trains(cls, count: int = 100) -> List[Dict[str, Any]]:
        """Generates realistic train timetable and real-time tracking data for at least 100 trains."""
        now = datetime.utcnow()
        results = []
        cat_len = len(cls.REALISTIC_TRAIN_CATALOG)
        
        for i in range(count):
            base = cls.REALISTIC_TRAIN_CATALOG[i % cat_len]
            tno_prefix = "" if i < cat_len else f"{10000 + i}"
            tno = base[0] if i < cat_len else f"T-{12000 + i}"
            tname = base[1] if i < cat_len else f"{base[1]} Link #{i // cat_len + 1}"
            ttype = base[2]
            orig = base[3]
            dest = base[4]
            max_spd = base[5]
            base_delay = base[6]
            is_fr = base[7]
            loco = base[8]

            sec = cls.REALISTIC_SECTIONS[i % len(cls.REALISTIC_SECTIONS)]
            spd = max(0, max_spd - (i % 5) * 5)
            delay = (base_delay + (i % 6) * 3) if not is_fr else (base_delay + (i % 10) * 5)

            # Timetable departure & arrival calculations
            sched_dep = (now - timedelta(hours=(i % 12) + 1, minutes=(i * 7) % 60)).strftime("%H:%M")
            sched_arr = (now + timedelta(hours=(i % 14) + 2, minutes=(i * 11) % 60)).strftime("%H:%M")

            status = "On-Time" if delay <= 5 else ("Minor Delay" if delay <= 20 else "Regulated")
            signal = "Green" if delay <= 5 else ("Double_Yellow" if delay <= 20 else "Yellow")

            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "train_no": tno,
                "train_name": tname,
                "train_type": ttype,
                "origin_station": orig,
                "destination_station": dest,
                "scheduled_departure": sched_dep,
                "scheduled_arrival": sched_arr,
                "current_section": sec,
                "current_speed_kmh": spd,
                "delay_minutes": delay,
                "is_freight": is_fr,
                "locomotive_type": loco,
                "punctuality_status": status,
                "signal_aspect": signal,
                "traffic_priority": "High (P0)" if "Rajdhani" in ttype or "Vande" in tname else ("Medium (P1)" if not is_fr else "Freight (P2)"),
                "timestamp": now.isoformat()
            })
        return results

    @classmethod
    def fetch_corridors(cls) -> List[Dict[str, Any]]:
        """Returns 8 realistic Indian Railways trunk corridors with operational capacities."""
        results = []
        for c in cls.REALISTIC_CORRIDORS:
            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "corridor_code": c["code"],
                "name": c["name"],
                "railway_zone": c["zone"],
                "division": c["div"],
                "distance_km": c["dist"],
                "line_capacity_trains_per_day": c["cap"],
                "current_utilization_pct": c["util"],
                "max_speed_kmh": c["max_speed"],
                "status": "High Density Network (HDN)"
            })
        return results

    @classmethod
    def fetch_blocks(cls, count: int = 50) -> List[Dict[str, Any]]:
        """Generates at least 50 available maintenance block possession windows."""
        now = datetime.utcnow()
        results = []
        window_types = ["Shadow_Block", "Traffic_Block", "Power_Block", "Integrated_Block"]
        dept_combos = [["ENG"], ["SNT"], ["TRD"], ["ENG", "TRD"], ["ENG", "SNT", "TRD"]]

        for i in range(count):
            sec = cls.REALISTIC_SECTIONS[i % len(cls.REALISTIC_SECTIONS)]
            corridor = sec.split("-")[0] + "-" + sec.split("-")[1]
            wtype = window_types[i % len(window_types)]
            depts = dept_combos[i % len(dept_combos)]
            
            # Start times spaced out over 24-48 hours
            start_offset_hrs = 1.0 + (i * 0.8)
            duration_hrs = round(2.0 + (i % 4) * 0.5, 1) # 2.0h to 3.5h
            start_dt = now + timedelta(hours=start_offset_hrs)
            end_dt = start_dt + timedelta(hours=duration_hrs)

            traffic_density = round(0.6 + (i % 6) * 0.3, 2) # trains per hour

            results.append({
                "source_system": cls.SYSTEM_NAME,
                "data_mode": cls.DATA_MODE,
                "block_window_id": f"BLK-AVAIL-2026-{100 + i}",
                "section_code": sec,
                "corridor_code": corridor,
                "window_type": wtype,
                "start_time": start_dt.isoformat(),
                "end_time": end_dt.isoformat(),
                "duration_hours": duration_hrs,
                "traffic_density_trains_per_hr": traffic_density,
                "recommended_departments": depts,
                "status": "Available_For_Possession",
                "notes": f"Optimal {wtype} window on {sec} with lowest traffic impact."
            })
        return results

    @classmethod
    def fetch_goods_forecast(cls, horizon_hours: int = 24) -> Dict[str, Any]:
        """Returns 24-48h goods freight train projections."""
        now = datetime.utcnow()
        freight_rakes = [
            {"rake_id": "RAKE-BOXN-101", "commodity": "Thermal Coal", "from_to": "Singrauli -> Dadri Thermal", "scheduled_eta": (now + timedelta(hours=2)).strftime("%H:%M"), "priority": "High (P0 Energy)"},
            {"rake_id": "RAKE-CONCOR-204", "commodity": "Container Exim", "from_to": "TKD -> Mundra Port", "scheduled_eta": (now + timedelta(hours=4)).strftime("%H:%M"), "priority": "Medium (P1)"},
            {"rake_id": "RAKE-BTPN-309", "commodity": "POL High Speed Diesel", "from_to": "IOCL Mathura -> Gwalior", "scheduled_eta": (now + timedelta(hours=5)).strftime("%H:%M"), "priority": "High (P0 Petroleum)"},
            {"rake_id": "RAKE-BCN-412", "commodity": "FCI Wheat Foodgrain", "from_to": "Ludhiana -> Mughalsarai", "scheduled_eta": (now + timedelta(hours=7)).strftime("%H:%M"), "priority": "Medium (P1)"},
            {"rake_id": "RAKE-BOXN-515", "commodity": "Coking Coal", "from_to": "DDU -> Bokaro Steel", "scheduled_eta": (now + timedelta(hours=9)).strftime("%H:%M"), "priority": "High (P0 Raw Material)"},
            {"rake_id": "RAKE-BOST-618", "commodity": "Finished Steel Rails", "from_to": "Bhilai Steel Plant -> New Delhi", "scheduled_eta": (now + timedelta(hours=11)).strftime("%H:%M"), "priority": "Medium (P1)"}
        ]

        return {
            "source_system": cls.SYSTEM_NAME,
            "data_mode": cls.DATA_MODE,
            "forecast_horizon_hours": horizon_hours,
            "total_projected_freight_trains": 48,
            "commodity_breakdown": {
                "Coal (BOXN/BOBRN)": 22,
                "Containers (CONCOR)": 12,
                "POL / Petroleum (BTPN)": 8,
                "Foodgrains & Fertilizer (BCN)": 6
            },
            "scheduled_rakes": freight_rakes,
            "optimal_possession_window": "01:30 - 04:45 (Lowest projected traffic density: 1.1 trains/hour)",
            "timestamp": now.isoformat()
        }

    @classmethod
    def fetch_bundle(cls, train_count: int = 100, block_count: int = 50, forecast_hours: int = 24) -> Dict[str, Any]:
        """Returns the full simulated COA dataset bundle: timetable, corridors, available blocks, goods forecast."""
        trains = cls.fetch_trains(count=train_count)
        corridors = cls.fetch_corridors()
        blocks = cls.fetch_blocks(count=block_count)
        goods_forecast = cls.fetch_goods_forecast(horizon_hours=forecast_hours)

        return {
            "system": cls.SYSTEM_NAME,
            "system_name": "Control Office Application",
            "department": cls.DEPARTMENT,
            "department_name": "Operating / Traffic Dispatching",
            "data_mode": cls.DATA_MODE,
            "disclaimer": "SIMULATED DEMO DATA - Mock Control Office Application Telemetry",
            "total_trains": len(trains),
            "total_corridors": len(corridors),
            "total_available_blocks": len(blocks),
            "trains": trains,
            "corridors": corridors,
            "available_blocks": blocks,
            "goods_train_forecast": goods_forecast
        }

    @classmethod
    def ping_system_health(cls) -> Dict[str, Any]:
        return {
            "system": cls.SYSTEM_NAME,
            "status": "Online (Simulated Gateway)",
            "latency_ms": 18,
            "last_heartbeat": datetime.utcnow().isoformat(),
            "data_mode": cls.DATA_MODE,
            "records_available": 3450
        }

    # Backward compatibility aliases
    fetch_live_train_locations = fetch_trains

    @classmethod
    def fetch_freight_forecast(cls, corridor_code: str = "NDLS-AGC") -> Dict[str, Any]:
        res = cls.fetch_goods_forecast(horizon_hours=24)
        return {
            "corridor_code": corridor_code,
            "projected_freight_rakes": res.get("total_projected_freight_trains", 48),
            "commodity_breakdown": res.get("commodity_breakdown", {}),
            "recommended_possession_window": res.get("optimal_possession_window"),
            "data_mode": cls.DATA_MODE
        }
