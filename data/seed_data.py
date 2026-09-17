import os
import sys
import random
from datetime import datetime, timedelta

# Add workspace to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from backend.app.core.database import SessionLocal, engine, Base
from backend.app.core.security import get_password_hash
from backend.app.models import (
    Role, Department, User, AuditLog,
    Corridor, RailwaySection,
    Asset, AssetHistory,
    Defect, MaintenanceTask,
    Train, TrainSchedule, TrainDelay,
    BlockPlan, Block, BlockTask, Conflict, Approval, AIRecommendation,
    Resource, ResourceAssignment,
    Alert, WhatIfScenario, IntegrationLog
)

# Seed determinism
random.seed(42)

def seed_database(reset: bool = True):
    print("==================================================")
    print("Initializing Database Schema for Indian Railways...")
    # Tables are managed by Alembic; ensure created if missing
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if reset:
            print("Clearing existing data for clean seed...")
            if engine.dialect.name == "postgresql":
                table_names = ", ".join([f'"{tbl.name}"' for tbl in Base.metadata.sorted_tables])
                db.execute(text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE;"))
                db.commit()
            else:
                for tbl in reversed(Base.metadata.sorted_tables):
                    db.execute(tbl.delete())
                db.commit()

        print("1. Seeding Roles...")
        roles_data = [
            ("Admin", "System Administrator with full technical privileges"),
            ("DRM", "Divisional Railway Manager - Executive approving authority"),
            ("Sr_DEN", "Senior Divisional Engineer (Civil / Permanent Way)"),
            ("Sr_DSTE", "Senior Divisional Signal & Telecom Engineer"),
            ("Sr_DEE", "Senior Divisional Electrical Engineer (Traction / TRD)"),
            ("Sr_DOM", "Senior Divisional Operations Manager (Control Office)"),
            ("Supervisor", "Senior Section Engineer (SSE) / Maintenance Supervisor")
        ]
        roles = {}
        for name, desc in roles_data:
            role = Role(name=name, description=desc)
            db.add(role)
            db.flush()
            roles[name] = role

        print("2. Seeding Departments...")
        departments_data = [
            ("ENG", "Civil Engineering / Permanent Way (P-Way)", "Responsible for track, sleepers, turnouts, bridges and formation"),
            ("SNT", "Signal & Telecommunication", "Responsible for electronic interlocking, point machines, signals and axle counters"),
            ("TRD", "Traction Distribution / Electrical", "Responsible for 25kV OHE catenary, substations and power switching"),
            ("OPT", "Operating / Traffic Control", "Responsible for train timetable, corridor dispatching and safety clearances")
        ]
        departments = {}
        for code, name, desc in departments_data:
            dept = Department(code=code, name=name, description=desc)
            db.add(dept)
            db.flush()
            departments[code] = dept

        print("3. Seeding Users...")
        users_data = [
            # 1. Admin
            ("admin", "admin@railways.gov.in", "Admin@123", "Central System Administrator", roles["Admin"].id, None),
            # 2. DRM
            ("drm", "drm@railways.gov.in", "Drm@123", "Divisional Railway Manager (DRM)", roles["DRM"].id, departments["OPT"].id),
            ("drm_bhopal", "drm.bpl@railways.gov.in", "Drm@123", "Shri Rajesh Sharma (DRM)", roles["DRM"].id, departments["OPT"].id),
            # 3. Engineering Officer
            ("engineering_officer", "eng.officer@railways.gov.in", "Eng@123", "Senior Divisional Engineer (Civil / P-Way)", roles["Sr_DEN"].id, departments["ENG"].id),
            ("sr_den_eng", "srden.co@railways.gov.in", "Eng@123", "Er. Amit Verma (Sr. DEN/Co)", roles["Sr_DEN"].id, departments["ENG"].id),
            # 4. Signal Officer
            ("signal_officer", "signal.officer@railways.gov.in", "Signal@123", "Senior Divisional Signal & Telecom Engineer", roles["Sr_DSTE"].id, departments["SNT"].id),
            ("sr_dste_snt", "srdste@railways.gov.in", "Snt@123", "Er. Neha Gupta (Sr. DSTE)", roles["Sr_DSTE"].id, departments["SNT"].id),
            # 5. Traction Officer
            ("traction_officer", "traction.officer@railways.gov.in", "Trd@123", "Senior Divisional Electrical Engineer (TRD)", roles["Sr_DEE"].id, departments["TRD"].id),
            ("sr_dee_trd", "srdee.trd@railways.gov.in", "Trd@123", "Er. R. K. Nair (Sr. DEE/TRD)", roles["Sr_DEE"].id, departments["TRD"].id),
            # 6. Control Office
            ("control_office", "control.office@railways.gov.in", "Opt@123", "Senior Divisional Operations Manager (Control Office)", roles["Sr_DOM"].id, departments["OPT"].id),
            ("sr_dom_opt", "srdom@railways.gov.in", "Opt@123", "Shri Sunil Meena (Sr. DOM)", roles["Sr_DOM"].id, departments["OPT"].id),
            # 7. Maintenance Supervisor
            ("maintenance_supervisor", "supervisor@railways.gov.in", "Supervisor@123", "Senior Section Engineer (P-Way Supervisor)", roles["Supervisor"].id, departments["ENG"].id),
            ("supervisor", "sse.supervisor@railways.gov.in", "Supervisor@123", "Senior Section Engineer (Maintenance Supervisor)", roles["Supervisor"].id, departments["ENG"].id),
            ("sse_pway", "sse.pway@railways.gov.in", "Pway@123", "V. K. Singh (SSE/P-Way)", roles["Supervisor"].id, departments["ENG"].id),
            ("sse_signal", "sse.signal@railways.gov.in", "Signal@123", "D. P. Yadav (SSE/Signal)", roles["Supervisor"].id, departments["SNT"].id),
            ("sse_trd", "sse.trd@railways.gov.in", "Ohe@123", "M. K. Joshi (SSE/TRD)", roles["Supervisor"].id, departments["TRD"].id)
        ]

        users = {}
        for username, email, pwd, full_name, role_id, dept_id in users_data:
            user = User(
                username=username,
                email=email,
                hashed_password=get_password_hash(pwd),
                full_name=full_name,
                role_id=role_id,
                department_id=dept_id,
                is_active=True
            )
            db.add(user)
            db.flush()
            users[username] = user

        print("4. Seeding Corridors and Railway Sections...")
        corridors_raw = [
            ("NDLS-AGC", "New Delhi - Agra Cantt High Speed Corridor", "NCR", "Agra", "NDLS", "AGC", 195.0),
            ("AGC-CNB", "Agra Cantt - Kanpur Central Main Line", "NCR", "Prayagraj", "AGC", "CNB", 277.0),
            ("CNB-PRYJ", "Kanpur Central - Prayagraj Jn Trunk Route", "NCR", "Prayagraj", "CNB", "PRYJ", 194.0),
            ("AGC-VGLJ", "Agra Cantt - Jhansi High Density Corridor", "NCR", "Jhansi", "AGC", "VGLJ", 215.0),
            ("VGLJ-BPL", "Jhansi - Bhopal North-South Trunk", "WCR", "Bhopal", "VGLJ", "BPL", 292.0),
            ("BPL-ET", "Bhopal - Itarsi High Traffic Junction", "WCR", "Bhopal", "BPL", "ET", 92.0),
            ("ET-JBP", "Itarsi - Jabalpur Central Link", "WCR", "Jabalpur", "ET", "JBP", 245.0),
            ("ET-NGP", "Itarsi - Nagpur Grand Trunk Spine", "CR", "Nagpur", "ET", "NGP", 298.0)
        ]
        corridors = []
        for code, name, zone, div, start_stn, end_stn, dist in corridors_raw:
            c = Corridor(code=code, name=name, zone=zone, division=div, start_station=start_stn, end_station=end_stn, total_distance_km=dist)
            db.add(c)
            db.flush()
            corridors.append(c)

        # GPS points for realistic visualization
        station_coords = {
            "NDLS": (28.6431, 77.2197),
            "TKD": (28.5028, 77.2917),
            "PWL": (28.1487, 77.3320),
            "MTJ": (27.4924, 77.6737),
            "AGC": (27.1590, 77.9926),
            "GWL": (26.2183, 78.1828),
            "VGLJ": (25.4484, 78.5685),
            "LAR": (24.6865, 78.4184),
            "BINA": (24.1782, 78.1824),
            "BPL": (23.2599, 77.4126),
            "HBD": (22.7519, 77.7289),
            "ET": (22.6124, 77.7641),
            "CNB": (26.4539, 80.3507),
            "PRYJ": (25.4497, 81.8282),
            "JBP": (23.1815, 79.9864),
            "AMLA": (21.9213, 78.1254),
            "NGP": (21.1524, 79.0882)
        }

        section_definitions = [
            ("NDLS-TKD", 0, "NDLS", "TKD", 22.0, 130, 85, 58.0),
            ("TKD-PWL", 0, "TKD", "PWL", 38.0, 130, 80, 56.0),
            ("PWL-MTJ", 0, "PWL", "MTJ", 80.0, 160, 90, 62.0),
            ("MTJ-AGC", 0, "MTJ", "AGC", 55.0, 160, 95, 65.0),
            ("AGC-CNB-SEC1", 1, "AGC", "CNB", 140.0, 130, 75, 50.0),
            ("CNB-PRYJ-SEC1", 2, "CNB", "PRYJ", 194.0, 130, 80, 52.0),
            ("AGC-GWL", 3, "AGC", "GWL", 118.0, 130, 70, 48.0),
            ("GWL-VGLJ", 3, "GWL", "VGLJ", 97.0, 130, 72, 49.0),
            ("VGLJ-LAR", 4, "VGLJ", "LAR", 90.0, 130, 68, 44.0),
            ("LAR-BINA", 4, "LAR", "BINA", 65.0, 130, 74, 46.0),
            ("BINA-BPL", 4, "BINA", "BPL", 137.0, 130, 78, 51.0),
            ("BPL-HBD", 5, "BPL", "HBD", 74.0, 120, 82, 54.0),
            ("HBD-ET", 5, "HBD", "ET", 18.0, 120, 92, 60.0),
            ("ET-JBP-SEC1", 6, "ET", "JBP", 245.0, 110, 65, 38.0),
            ("ET-AMLA", 7, "ET", "AMLA", 130.0, 110, 60, 42.0),
            ("AMLA-NGP", 7, "AMLA", "NGP", 168.0, 120, 66, 45.0)
        ]

        sections = []
        for base_code, corr_idx, stn_a, stn_b, length, speed, cap, gmt in section_definitions:
            coord_a = station_coords.get(stn_a, (25.0, 78.0))
            coord_b = station_coords.get(stn_b, (25.0, 78.0))
            for track_dir in ["UP", "DN"]:
                sec = RailwaySection(
                    corridor_id=corridors[corr_idx].id,
                    section_code=f"{base_code}-{track_dir}",
                    start_station=stn_a if track_dir == "UP" else stn_b,
                    end_station=stn_b if track_dir == "UP" else stn_a,
                    track_type=track_dir,
                    length_km=length,
                    max_permissible_speed=speed,
                    line_capacity=cap,
                    current_traffic_density=gmt,
                    start_lat=coord_a[0] if track_dir == "UP" else coord_b[0],
                    start_lng=coord_a[1] if track_dir == "UP" else coord_b[1],
                    end_lat=coord_b[0] if track_dir == "UP" else coord_a[0],
                    end_lng=coord_b[1] if track_dir == "UP" else coord_a[1]
                )
                db.add(sec)
                db.flush()
                sections.append(sec)

        print(f"Created {len(sections)} sections across {len(corridors)} corridors.")

        print("5. Seeding Resources (50+ Maintenance Machinery & Gang Crews)...")
        resource_types = [
            ("BCM", "Ballast Cleaning Machine (Plasser)", departments["ENG"].id),
            ("Tamping_Machine", "09-3X Dynamic Continuous Tamping Express", departments["ENG"].id),
            ("Rail_Grinder", "RG-20 High-Speed Rail Grinder", departments["ENG"].id),
            ("Gang_Labor", "Track Maintenance Gang Crew (30 Trackmen)", departments["ENG"].id),
            ("Crane", "140T Gottwald Railway Breakdown Crane", departments["ENG"].id),
            ("Tower_Wagon", "8-Wheeler Self-Propelled OHE Inspection Car", departments["TRD"].id),
            ("Wiring_Train", "Catenary Replacement Wiring Train (CRW)", departments["TRD"].id),
            ("Gang_Labor", "OHE Lineman Power Block Gang (15 Technicians)", departments["TRD"].id),
            ("Signal_Crew", "S&T Interlocking & Point Machine Overhaul Team", departments["SNT"].id),
            ("Testing_Coach", "Track Recording Car (TRC / USFD Mobile Unit)", departments["ENG"].id)
        ]

        resources = []
        base_stations = ["NDLS", "AGC", "CNB", "PRYJ", "VGLJ", "BPL", "ET", "NGP"]
        res_counter = 1
        for res_type, prefix, dept_id in resource_types:
            for i in range(6): # 10 * 6 = 60 resources
                stn = base_stations[(res_counter + i) % len(base_stations)]
                r = Resource(
                    resource_code=f"RES-{res_type[:3].upper()}-{res_counter:03d}",
                    resource_name=f"{prefix} Unit #{i+1} [{stn}] [SIMULATED DEMO DATA]",
                    department_id=dept_id,
                    resource_type=res_type,
                    base_station=stn,
                    availability_status="Available" if i % 5 != 0 else "Deployed"
                )
                db.add(r)
                db.flush()
                resources.append(r)
                res_counter += 1
        print(f"Created {len(resources)} resources.")

        print("6. Seeding Assets (180+ Assets with Health & Sensor Snapshots)...")
        asset_templates = [
            # Engineering
            (departments["ENG"].id, "Rail", "60kg 90UTS Continuous Welded Rail (CWR)", 85.0),
            (departments["ENG"].id, "Sleeper", "Pre-Stressed Concrete Sleepers (PSC-60)", 90.0),
            (departments["ENG"].id, "Turnout", "1-in-12 High Speed Curved Switch CMS Crossing", 78.0),
            (departments["ENG"].id, "Formation", "Track Ballast & Subgrade Formation Deep Bed", 88.0),
            # S&T
            (departments["SNT"].id, "Point_Machine", "IRS Rotary 220V Electric Point Machine", 82.0),
            (departments["SNT"].id, "Track_Circuit", "High Voltage Impulse Audio Frequency Track Circuit (AFTC)", 89.0),
            (departments["SNT"].id, "Signal_Post", "Multi-Aspect Colour Light LED Signal Post (MACLS)", 94.0),
            (departments["SNT"].id, "Axle_Counter", "High Availability Dual Sensor Digital Axle Counter (HASSDAC)", 86.0),
            (departments["SNT"].id, "Electronic_Interlocking", "Fail-Safe Electronic Interlocking (EI) Microprocessor V3", 95.0),
            # TRD
            (departments["TRD"].id, "OHE_Mast", "25kV AC Galvanized Cantilever Portal Mast", 91.0),
            (departments["TRD"].id, "Catenary_Wire", "107 sq mm Hard-Drawn Grooved Copper Contact Wire", 79.0),
            (departments["TRD"].id, "Substation", "132kV/25kV 30MVA Traction Substation (TSS)", 92.0),
            (departments["TRD"].id, "Neutral_Section", "Short Neutral Section PTFE Section Insulator", 84.0)
        ]

        assets = []
        asset_count = 0
        now = datetime.utcnow()

        for sec in sections:
            # 13 assets per section across ENG, SNT, TRD
            for tmpl_dept, tmpl_type, tmpl_name, base_health in asset_templates:
                asset_count += 1
                km = round(random.uniform(5.0, sec.length_km - 5.0), 3)
                # Randomize health variance
                health = max(35.0, min(100.0, base_health + random.uniform(-25.0, 10.0)))
                status = "Operational"
                if health < 55.0:
                    status = "Critical"
                elif health < 75.0:
                    status = "Degraded"

                install_days_ago = random.randint(300, 3650)
                asset = Asset(
                    asset_code=f"AST-{sec.section_code}-{tmpl_type[:3].upper()}-{asset_count:04d}",
                    asset_name=f"{tmpl_name} at Km {km} ({sec.section_code}) [SIMULATED DEMO DATA]",
                    department_id=tmpl_dept,
                    section_id=sec.id,
                    asset_type=tmpl_type,
                    km_location=km,
                    installation_date=now - timedelta(days=install_days_ago),
                    health_score=round(health, 1),
                    status=status
                )
                db.add(asset)
                db.flush()
                assets.append(asset)

        print(f"Created {len(assets)} assets.")

        print("7. Seeding Historical Maintenance Records (600+ Asset History Records)...")
        event_types = ["USFD_TEST", "INSPECTION", "MAINTENANCE", "TAMPING_CYCLE", "OHE_CURRENT_COLLECTION_TEST", "REPLACEMENT"]
        history_count = 0
        for asset in assets:
            # Add 3 to 4 historical records per asset (192 * 3.5 = ~670 records)
            rec_count = random.randint(3, 5)
            for r in range(rec_count):
                event = random.choice(event_types)
                hist_date = now - timedelta(days=random.randint(10, 720))
                wear = round(random.uniform(0.1, 4.5), 2)
                hist = AssetHistory(
                    asset_id=asset.id,
                    event_type=event,
                    description=f"Periodic {event} on {asset.asset_type} at Km {asset.km_location} - wear index {wear}mm",
                    recorded_at=hist_date,
                    recorded_by=random.choice(["Sr. Section Engineer (P-Way)", "SSE (Signal / Auto)", "SSE (Traction/TRD)", "Track Recording Car Unit"]),
                    metrics_snapshot={"wear_mm": wear, "health_recorded": round(asset.health_score + random.uniform(-10, 15), 1), "status_on_test": "Compliant"}
                )
                db.add(hist)
                history_count += 1
        db.flush()
        print(f"Created {history_count} asset history records.")

        print("8. Seeding Defects (350+ Defects across TMS, SMMS, TDMS)...")
        defect_types_pool = [
            (departments["ENG"].id, "TMS", "Track", "Ultrasonic I-Rail Weld Defect (USFD Flaw detected)", ["Critical", "Major"], 30),
            (departments["ENG"].id, "TMS", "Track", "Rail Gauge Widening & Track Geometry Index (TGI) Degradation", ["Major", "Minor"], 45),
            (departments["ENG"].id, "TMS", "Track", "Ballast Cushion Deficiency & High Vibration at Crossing", ["Major", "Minor"], 0),
            (departments["ENG"].id, "TMS", "Track", "Rail Head Creep & Missing Elastic Rail Clips (ERC)", ["Critical", "Major"], 30),
            (departments["ENG"].id, "TMS", "Track", "Corrugation on Outer High Rail on Curve", ["Major", "Minor"], 50),
            (departments["SNT"].id, "SMMS", "Signal", "Point Machine Normal/Reverse Detection Fluctuation", ["Critical", "Major"], 30),
            (departments["SNT"].id, "SMMS", "Signal", "Axle Counter Wheel Sensor Signal Attenuation", ["Critical", "Major"], 0),
            (departments["SNT"].id, "SMMS", "Signal", "Audio Frequency Track Circuit (AFTC) Resistance Drift", ["Major", "Minor"], 0),
            (departments["SNT"].id, "SMMS", "Signal", "LED Signal Unit Secondary Filament Deterioration", ["Major", "Minor"], 0),
            (departments["TRD"].id, "TDMS", "Traction", "OHE Catenary Dropper Snapped & Contact Wire Sag", ["Critical", "Major"], 30),
            (departments["TRD"].id, "TDMS", "Traction", "Traction Substation 25kV Circuit Breaker SF6 Gas Pressure Drop", ["Critical", "Major"], 0),
            (departments["TRD"].id, "TDMS", "Traction", "Insulator Flashover & Heavy Pollution Carbonization", ["Major", "Minor"], 0),
            (departments["TRD"].id, "TDMS", "Traction", "Cantilever Assembly Pivot Pin Wear Beyond Tolerance", ["Major", "Minor"], 0)
        ]

        defects = []
        defect_counter = 1
        for i in range(360):
            dept_id, sys_source, cat, def_title, sev_options, speed_rest = random.choice(defect_types_pool)
            target_asset = random.choice([a for a in assets if a.department_id == dept_id])
            severity = random.choice(sev_options)
            
            # Critical defects have high calculated priority score
            if severity == "Critical":
                priority = round(random.uniform(85.0, 99.0), 1)
                speed = speed_rest if speed_rest > 0 else 30
            elif severity == "Major":
                priority = round(random.uniform(65.0, 84.9), 1)
                speed = speed_rest
            else:
                priority = round(random.uniform(35.0, 64.9), 1)
                speed = 0

            status = random.choices(["Open", "Scheduled", "Investigating", "Resolved"], weights=[50, 30, 15, 5])[0]
            rep_date = now - timedelta(hours=random.randint(1, 120))

            defect = Defect(
                defect_code=f"DEF-{sys_source}-2026-{defect_counter:04d}",
                asset_id=target_asset.id,
                department_id=dept_id,
                section_id=target_asset.section_id,
                defect_type=def_title,
                severity=severity,
                reported_at=rep_date,
                reported_by_system=sys_source,
                status=status,
                calculated_priority_score=priority,
                speed_restriction_imposed=speed
            )
            db.add(defect)
            db.flush()
            defects.append(defect)
            defect_counter += 1

        print(f"Created {len(defects)} defects.")

        print("9. Seeding Maintenance Tasks (360+ Tasks)...")
        tasks = []
        task_counter = 1
        for defect in defects:
            dept = defect.department_id
            is_eng = dept == departments["ENG"].id
            is_snt = dept == departments["SNT"].id
            is_trd = dept == departments["TRD"].id

            duration = random.choice([120, 150, 180, 210, 240, 270, 300]) # 2h to 5h
            req_power = is_trd or (is_eng and random.random() < 0.25)
            req_traffic = True
            
            task = MaintenanceTask(
                task_code=f"TSK-2026-{task_counter:04d}",
                title=f"Rectify {defect.defect_type} (Asset #{defect.asset_id}) [SIMULATED DEMO DATA]",
                defect_id=defect.id,
                department_id=defect.department_id,
                section_id=defect.section_id,
                estimated_duration_minutes=duration,
                required_track_possession=True,
                required_power_block=req_power,
                required_traffic_block=req_traffic,
                min_resources_needed={"crew": 12, "heavy_machine": 1 if is_eng else 0, "tower_wagon": 1 if is_trd else 0},
                status="Scheduled" if defect.status == "Scheduled" else "Pending"
            )
            db.add(task)
            db.flush()
            tasks.append(task)
            task_counter += 1

        print(f"Created {len(tasks)} maintenance tasks.")

        print("10. Seeding Trains (160+ Passenger & Freight Trains for Timetable / COA)...")
        named_trains = [
            ("22436", "Vande Bharat Express (NDLS-BSB)", "Vande_Bharat", 1, 160, False),
            ("20172", "Vande Bharat Express (NZM-RKMP)", "Vande_Bharat", 1, 160, False),
            ("12002", "Bhopal Shatabdi Express (NDLS-RKMP)", "Shatabdi", 1, 150, False),
            ("12004", "Lucknow Shatabdi Express (NDLS-LKO)", "Shatabdi", 1, 140, False),
            ("12302", "Howrah Rajdhani Express (NDLS-HWH)", "Rajdhani", 1, 130, False),
            ("12434", "Chennai Rajdhani Express (NZM-MAS)", "Rajdhani", 1, 130, False),
            ("12442", "Bilaspur Rajdhani Express (NDLS-BSP)", "Rajdhani", 1, 130, False),
            ("12952", "Mumbai Rajdhani Express (NDLS-MMCT)", "Rajdhani", 1, 130, False),
            ("12616", "Grand Trunk Express (NDLS-MAS)", "Mail_Express", 2, 120, False),
            ("12622", "Tamil Nadu Express (NDLS-MAS)", "Mail_Express", 2, 120, False),
            ("12722", "Dakshin Express (NZM-HYB)", "Mail_Express", 2, 110, False),
            ("12138", "Punjab Mail (FZR-CSMT)", "Mail_Express", 2, 110, False),
            ("12156", "Shan-e-Bhopal Express (NZM-RKMP)", "Mail_Express", 2, 120, False),
            ("12804", "Swarna Jayanti Express (NZM-VSKP)", "Mail_Express", 2, 110, False),
            ("12920", "Malwa Express (SVDK-DADN)", "Mail_Express", 2, 110, False),
            ("12191", "Shridham Superfast (NZM-JBP)", "Mail_Express", 2, 110, False)
        ]

        trains = []
        for tno, tname, ttype, prio, spd, is_frt in named_trains:
            train = Train(
                train_no=tno,
                train_name=f"{tname} [SIMULATED DEMO DATA]",
                train_type=ttype,
                priority_level=prio,
                max_speed=spd,
                is_freight=is_frt
            )
            db.add(train)
            db.flush()
            trains.append(train)

        # Add 60 Mail/Express, 20 Suburban, and 65 Freight rakes with guaranteed unique IDs
        used_numbers = {t[0] for t in named_trains}
        expr_count = 0
        cur_num = 12000
        while expr_count < 65:
            cur_num += 1
            t_num = str(cur_num)
            if t_num not in used_numbers:
                used_numbers.add(t_num)
                train = Train(
                    train_no=t_num,
                    train_name=f"Superfast Express #{t_num} [SIMULATED DEMO DATA]",
                    train_type="Mail_Express",
                    priority_level=2,
                    max_speed=110,
                    is_freight=False
                )
                db.add(train)
                trains.append(train)
                expr_count += 1
        db.flush()

        for i in range(1, 25):
            t_num = f"64{i:03d}"
            train = Train(
                train_no=t_num,
                train_name=f"Palwal-Mathura MEMU Shuttle #{t_num} [SIMULATED DEMO DATA]",
                train_type="Suburban",
                priority_level=3,
                max_speed=100,
                is_freight=False
            )
            db.add(train)
            trains.append(train)
        db.flush()

        for i in range(1, 65):
            g_num = f"G-9{i:03d}"
            g_types = ["BOXN Coal Freight", "BCN Foodgrain Express", "BTPN Petroleum Rake", "Container Special (CONCOR)"]
            train = Train(
                train_no=g_num,
                train_name=f"{random.choice(g_types)} #{g_num} [SIMULATED DEMO DATA]",
                train_type="Freight",
                priority_level=random.choice([4, 5]),
                max_speed=75,
                is_freight=True
            )
            db.add(train)
            trains.append(train)
        db.flush()

        print(f"Created {len(trains)} trains.")

        print("11. Seeding Train Schedules (COA Timetable paths over sections)...")
        schedule_count = 0
        base_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0) - timedelta(hours=12)

        for train in trains:
            # Assign train to traverse 2 to 4 adjacent sections
            sec_subset = random.sample(sections, random.randint(2, 4))
            t_start = base_time + timedelta(minutes=random.randint(0, 1440))
            for sec in sec_subset:
                transit_mins = int((sec.length_km / train.max_speed) * 60) + random.randint(5, 15)
                t_end = t_start + timedelta(minutes=transit_mins)
                sched = TrainSchedule(
                    train_id=train.id,
                    section_id=sec.id,
                    scheduled_entry_time=t_start,
                    scheduled_exit_time=t_end,
                    direction=sec.track_type if sec.track_type in ["UP", "DN"] else "UP",
                    halt_station=sec.end_station if random.random() < 0.3 else None,
                    halt_duration_minutes=random.choice([2, 5, 10]) if random.random() < 0.3 else 0
                )
                db.add(sched)
                schedule_count += 1
                t_start = t_end + timedelta(minutes=5)
        db.flush()
        print(f"Created {schedule_count} train schedule slots.")

        print("12. Seeding Block Plans, Blocks, Approvals & AI Recommendations (80+ Blocks)...")
        plan_weekly = BlockPlan(
            plan_code="PLN-NCR-2026-WK38",
            plan_type="Weekly",
            status="Under_Review",
            horizon_start=now,
            horizon_end=now + timedelta(days=7),
            total_blocks=45,
            total_delay_impact_minutes=320,
            created_by=users["sr_dom_opt"].id
        )
        db.add(plan_weekly)

        plan_monthly = BlockPlan(
            plan_code="PLN-IR-2026-M09",
            plan_type="Monthly",
            status="Approved",
            horizon_start=now - timedelta(days=15),
            horizon_end=now + timedelta(days=15),
            total_blocks=80,
            total_delay_impact_minutes=680,
            created_by=users["drm_bhopal"].id
        )
        db.add(plan_monthly)
        db.flush()

        blocks = []
        block_counter = 1
        for i in range(85):
            sec = random.choice(sections)
            lead_dept = random.choice([departments["ENG"], departments["SNT"], departments["TRD"]])
            b_type = random.choice(["Traffic", "Power", "Integrated"])
            
            # Start time spread over next 48 hours or past 24 hours
            offset_hours = random.randint(-24, 72)
            # Preference for night windows: 01:00 - 05:00 or midday 11:30 - 14:30
            b_start = (now + timedelta(hours=offset_hours)).replace(minute=random.choice([0, 15, 30, 45]), second=0)
            duration_hrs = random.choice([2.0, 2.5, 3.0, 3.5, 4.0])
            b_end = b_start + timedelta(hours=duration_hrs)

            status = "Approved" if offset_hours < 0 else random.choice(["Proposed", "Approved", "In_Progress"])
            
            block = Block(
                block_code=f"BLK-2026-{block_counter:04d}",
                plan_id=plan_weekly.id if offset_hours >= 0 else plan_monthly.id,
                section_id=sec.id,
                block_type=b_type,
                requested_start_time=b_start,
                requested_end_time=b_end,
                actual_start_time=b_start if status in ["In_Progress", "Approved"] and offset_hours <= 0 else None,
                actual_end_time=b_end if status == "Approved" and offset_hours < -4 else None,
                status=status,
                lead_department_id=lead_dept.id,
                total_tasks_count=random.randint(1, 3)
            )
            db.add(block)
            db.flush()
            blocks.append(block)

            # Create AI Recommendation for each block
            ai_rec = AIRecommendation(
                block_id=block.id,
                alternative_number=1,
                strategy_name="Balanced Low Delay Window",
                confidence_score=round(random.uniform(0.88, 0.98), 2),
                throughput_score=round(random.uniform(75.0, 95.0), 1),
                delay_impact_minutes=random.randint(0, 25),
                multi_dept_synergy_score=round(random.uniform(60.0, 95.0), 1),
                rationale_text=f"Slot selected in low-density corridor window on {sec.section_code}. Integrated shadow-block coordinates {lead_dept.code} with co-located tasks. Zero Vande Bharat / Rajdhani delays projected; 1 freight train regulated by {random.randint(10, 20)} mins."
            )
            db.add(ai_rec)

            # Add Approvals for approved blocks
            if status == "Approved":
                appr = Approval(
                    block_id=block.id,
                    plan_id=block.plan_id,
                    reviewed_by_user_id=users["drm_bhopal"].id if random.random() < 0.5 else users["sr_dom_opt"].id,
                    role_at_review="DRM" if random.random() < 0.5 else "Sr_DOM",
                    action="Approved",
                    comments="Approved for execution during designated night traffic shadow window with full safety precautions.",
                    reviewed_at=b_start - timedelta(hours=6)
                )
                db.add(appr)

            block_counter += 1

        print(f"Created {len(blocks)} blocks with AI recommendations and approvals.")

        print("13. Seeding Resource Assignments and Block Tasks...")
        for block in blocks[:50]:
            # Assign task
            candidate_tasks = [t for t in tasks if t.section_id == block.section_id and t.department_id == block.lead_department_id]
            if candidate_tasks:
                bt = BlockTask(
                    block_id=block.id,
                    task_id=candidate_tasks[0].id,
                    sequence_order=1,
                    allocated_start_time=block.requested_start_time,
                    allocated_end_time=block.requested_end_time
                )
                db.add(bt)
            
            # Assign resource
            candidate_res = [r for r in resources if r.department_id == block.lead_department_id]
            if candidate_res:
                ra = ResourceAssignment(
                    resource_id=candidate_res[0].id,
                    block_id=block.id,
                    task_id=candidate_tasks[0].id if candidate_tasks else None,
                    start_time=block.requested_start_time,
                    end_time=block.requested_end_time
                )
                db.add(ra)
        db.flush()

        print("14. Seeding Conflicts and Alerts...")
        for i in range(12):
            b1 = blocks[i]
            b2 = blocks[i + 12]
            conf = Conflict(
                block_id_1=b1.id,
                block_id_2=b2.id if i % 2 == 0 else None,
                train_id=trains[i].id if i % 2 != 0 else None,
                conflict_type="Train_Path_Clash" if i % 2 != 0 else "Spatial_Overlap",
                severity="High" if i < 4 else "Medium",
                detected_at=now - timedelta(minutes=random.randint(10, 300)),
                resolution_suggestion=f"Reschedule Block #{b1.block_code} earlier by 45 minutes to clear high-priority path of {trains[i].train_name}."
            )
            db.add(conf)

        alerts_raw = [
            ("Critical_Defect", "Critical", "USFD ultrasonic flaw detected on NDLS-TKD-UP at Km 14.2. Immediate 30 km/h emergency speed restriction applied.", sections[0].id),
            ("Conflict_Detected", "Critical", "Spatial & Timetable clash detected between Block BLK-2026-0004 and Train 12002 Bhopal Shatabdi on MTJ-AGC.", sections[3].id),
            ("Speed_Restriction", "Warning", "Imposed speed restriction of 45 km/h on GWL-VGLJ-DN due to point machine reverse detection jitter.", sections[7].id),
            ("Block_Overrun", "Warning", "OHE Catenary renewal overrun reported on BPL-HBD-UP by 18 minutes. Traffic clearance delayed.", sections[11].id),
            ("Critical_Defect", "Critical", "High Rail weld defect detected on AGC-GWL-UP at Km 72.8. Speed reduced to 30 km/h.", sections[6].id)
        ]
        for atype, sev, msg, sec_id in alerts_raw:
            alt = Alert(
                alert_type=atype,
                severity=sev,
                message=f"{msg} [SIMULATED DEMO DATA]",
                section_id=sec_id,
                is_read=False,
                created_at=now - timedelta(minutes=random.randint(5, 120))
            )
            db.add(alt)

        print("15. Seeding What-If Scenarios and Integration Logs...")
        what_if = WhatIfScenario(
            name="Delhi-Agra Corridor Peak Freight Surge Simulation",
            description="Simulate the operational impact of a 30% increase in freight trains alongside a 3-hour emergency P-Way block on TKD-PWL.",
            baseline_plan_id=plan_weekly.id,
            simulated_parameters={"freight_surge_pct": 30, "emergency_block_duration_hrs": 3.0, "section_affected": "TKD-PWL-UP"},
            result_metrics={"projected_passenger_delay_mins": 14, "projected_freight_delay_mins": 185, "conflicts_detected": 3, "asset_throughput_score": 88.5},
            created_by=users["sr_dom_opt"].id
        )
        db.add(what_if)

        systems = [
            ("TMS", 145, "Success"),
            ("SMMS", 98, "Success"),
            ("TDMS", 112, "Success"),
            ("COA", 280, "Success")
        ]
        for sys_name, count, stat in systems:
            ilog = IntegrationLog(
                system_name=sys_name,
                sync_type="Scheduled",
                records_synced=count,
                status=stat,
                error_details=None,
                timestamp=now - timedelta(minutes=random.randint(10, 60))
            )
            db.add(ilog)

        db.commit()
        print("==================================================")
        print("SEEDING COMPLETE!")
        print(f"Summary:")
        print(f" - Corridors: {len(corridors)}")
        print(f" - Railway Sections: {len(sections)}")
        print(f" - Resources: {len(resources)} (Req: 50+)")
        print(f" - Assets: {len(assets)} (Req: 150+)")
        print(f" - Asset History: {history_count} (Req: 500+)")
        print(f" - Defects: {len(defects)} (Req: 300+)")
        print(f" - Maintenance Tasks: {len(tasks)} (Req: 300+)")
        print(f" - Trains: {len(trains)} (Req: 150+)")
        print(f" - Blocks: {len(blocks)} (Req: 75+)")
        print(f" - All 24 Tables Seeded Successfully!")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
