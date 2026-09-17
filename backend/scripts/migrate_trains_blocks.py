import os
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from backend.app.core.config import settings

def run_migration():
    print(f"Connecting to database: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # 1. Update trains table
        print("Migrating 'trains' table schema...")
        conn.execute(text("""
            ALTER TABLE trains 
            ADD COLUMN IF NOT EXISTS origin VARCHAR(100) DEFAULT 'New Delhi (NDLS)',
            ADD COLUMN IF NOT EXISTS destination VARCHAR(100) DEFAULT 'Bhopal Junction (BPL)',
            ADD COLUMN IF NOT EXISTS route VARCHAR(255) DEFAULT 'NDLS - AGC - GWL - VGLJ - BPL',
            ADD COLUMN IF NOT EXISTS scheduled_arrival TIMESTAMP WITHOUT TIME ZONE,
            ADD COLUMN IF NOT EXISTS scheduled_departure TIMESTAMP WITHOUT TIME ZONE,
            ADD COLUMN IF NOT EXISTS expected_arrival TIMESTAMP WITHOUT TIME ZONE,
            ADD COLUMN IF NOT EXISTS expected_departure TIMESTAMP WITHOUT TIME ZONE,
            ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'On Time';
        """))

        # 2. Update blocks table
        print("Migrating 'blocks' table schema...")
        conn.execute(text("""
            ALTER TABLE blocks 
            ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 180,
            ADD COLUMN IF NOT EXISTS work_type VARCHAR(100) DEFAULT 'Track Maintenance',
            ADD COLUMN IF NOT EXISTS affected_assets VARCHAR(255),
            ADD COLUMN IF NOT EXISTS affected_trains VARCHAR(255),
            ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'Approved';
        """))
        conn.commit()
        print("Table schemas altered successfully!")

        now = datetime.utcnow()

        # 3. Backfill trains
        print("Backfilling realistic data for trains...")
        stations_pairs = [
            ("New Delhi (NDLS)", "Bhopal Junction (BPL)", "NDLS - Mathura - Agra - Gwalior - Jhansi - Bhopal"),
            ("New Delhi (NDLS)", "Varanasi Junction (BSB)", "NDLS - Kanpur - Prayagraj - Varanasi"),
            ("Mumbai CSMT (CSMT)", "Nagpur Junction (NGP)", "CSMT - Kalyan - Igatpuri - Bhusawal - Akola - Badnera - Wardha - Nagpur"),
            ("Hazrat Nizamuddin (NZM)", "Chennai Central (MAS)", "NZM - Agra - Jhansi - Bhopal - Itarsi - Nagpur - Balharshah - Vijayawada - Chennai"),
            ("Howrah Junction (HWH)", "Mumbai CSMT (CSMT)", "HWH - Tatanagar - Rourkela - Bilaspur - Raipur - Nagpur - Bhusawal - CSMT"),
            ("New Delhi (NDLS)", "Bilaspur Junction (BSP)", "NDLS - Jhansi - Bhopal - Itarsi - Nagpur - Gondia - Raipur - Bilaspur"),
            ("Nagpur Junction (NGP)", "Pune Junction (PUNE)", "NGP - Wardha - Badnera - Akola - Bhusawal - Manmad - Daund - Pune"),
            ("New Delhi (NDLS)", "Bengaluru City (SBC)", "NDLS - Bhopal - Nagpur - Kazipet - Secunderabad - Dharmavaram - Bengaluru")
        ]

        train_rows = conn.execute(text("SELECT id, train_no, train_name, train_type, is_freight FROM trains")).fetchall()
        for i, row in enumerate(train_rows):
            t_id, t_no, t_name, t_type, is_freight = row
            pair = stations_pairs[i % len(stations_pairs)]
            orig, dest, route = pair

            # Generate timetable timings
            dep_hour = (6 + (i * 2)) % 24
            sched_dep = now.replace(hour=dep_hour, minute=(i * 7) % 60, second=0, microsecond=0)
            trip_hours = 8 if "Vande" in t_name or "Rajdhani" in t_name else (12 if not is_freight else 18)
            sched_arr = sched_dep + timedelta(hours=trip_hours)

            # Realistic delay & status
            if is_freight:
                delay = random.choice([0, 15, 30, 45, 60, 90])
            elif "Vande" in t_name or "Rajdhani" in t_name or "Shatabdi" in t_name:
                delay = random.choice([0, 0, 0, 5, 10, 15])
            else:
                delay = random.choice([0, 5, 10, 20, 35, 50])

            exp_dep = sched_dep + timedelta(minutes=delay)
            exp_arr = sched_arr + timedelta(minutes=delay)

            if delay == 0:
                status = "On Time"
            elif delay > 0 and delay < 20:
                status = "Running"
            elif delay >= 20:
                status = "Delayed"
            else:
                status = "On Time"

            conn.execute(text("""
                UPDATE trains 
                SET origin = :orig,
                    destination = :dest,
                    route = :route,
                    scheduled_departure = :s_dep,
                    scheduled_arrival = :s_arr,
                    expected_departure = :e_dep,
                    expected_arrival = :e_arr,
                    delay_minutes = :delay,
                    status = :status
                WHERE id = :id
            """), {
                "orig": orig,
                "dest": dest,
                "route": route,
                "s_dep": sched_dep,
                "s_arr": sched_arr,
                "e_dep": exp_dep,
                "e_arr": exp_arr,
                "delay": delay,
                "status": status,
                "id": t_id
            })
        conn.commit()
        print(f"Backfilled {len(train_rows)} trains successfully.")

        # 4. Backfill blocks
        print("Backfilling realistic data for blocks...")
        work_types = [
            "Track Tamping & Dynamic Express Lining",
            "Deep Ballast Cleaning (BCM Machine)",
            "Rail Weld Flaw Renewal & Destressing",
            "OHE Catenary Inspection & Sag Adjustment",
            "Point Machine Overhaul & Detection Testing",
            "AFTC Audio Frequency Track Circuit Overhaul",
            "25kV Substation Feeder Circuit Breaker Testing",
            "Integrated Shadow Block (Multi-Department Synergy)"
        ]

        affected_assets_pool = [
            "TRK-60KG-842, TRK-60KG-843, SLP-PSC-120",
            "PNT-102B, PNT-102A, DET-M14",
            "OHE-MAST-142/12, CAT-CU-107, ATD-04",
            "SW-204, AFTC-RX-02, MSDAC-S1",
            "TSS-25KV-TR1, FEEDER-CB-02",
            "TRK-WELD-042, SEJ-884, SLP-MONO-88"
        ]

        affected_trains_pool = [
            "12002 (Shatabdi), 22436 (Vande Bharat)",
            "12302 (Rajdhani), G-8821 (BOXN Coal)",
            "12616 (Grand Trunk), 12722 (Dakshin Exp)",
            "G-9042 (BCN Foodgrain), 12138 (Punjab Mail)",
            "20172 (Vande Bharat), 12952 (Rajdhani)",
            "None (Cleared Freight Gap Window)"
        ]

        approval_statuses = ["Approved", "Approved", "Approved", "Pending", "Under Review"]

        block_rows = conn.execute(text("SELECT id, block_code, requested_start_time, requested_end_time, status FROM blocks")).fetchall()
        for i, row in enumerate(block_rows):
            b_id, b_code, req_start, req_end, b_status = row
            w_type = random.choice(work_types)
            aff_assets = random.choice(affected_assets_pool)
            aff_trains = random.choice(affected_trains_pool)
            app_status = "Approved" if b_status in ["Approved", "In_Progress", "Completed"] else random.choice(approval_statuses)

            duration = 180
            if req_start and req_end:
                duration = max(30, int((req_end - req_start).total_seconds() / 60.0))

            # Distribute into Upcoming, Active, Completed
            if i % 3 == 0:
                # Active
                s_time = now - timedelta(minutes=45)
                e_time = s_time + timedelta(minutes=duration)
                status = "Active"
                app_status = "Approved"
            elif i % 3 == 1:
                # Completed
                s_time = now - timedelta(hours=random.randint(5, 48))
                e_time = s_time + timedelta(minutes=duration)
                status = "Completed"
                app_status = "Approved"
            else:
                # Upcoming
                s_time = now + timedelta(hours=random.randint(2, 72))
                e_time = s_time + timedelta(minutes=duration)
                status = "Upcoming"

            conn.execute(text("""
                UPDATE blocks 
                SET requested_start_time = :s_time,
                    requested_end_time = :e_time,
                    duration_minutes = :dur,
                    work_type = :wtype,
                    affected_assets = :assets,
                    affected_trains = :trains,
                    status = :status,
                    approval_status = :app_status
                WHERE id = :id
            """), {
                "s_time": s_time,
                "e_time": e_time,
                "dur": duration,
                "wtype": w_type,
                "assets": aff_assets,
                "trains": aff_trains,
                "status": status,
                "app_status": app_status,
                "id": b_id
            })
        conn.commit()
        print(f"Backfilled {len(block_rows)} blocks successfully.")
        print("Train Operations and Block Management migration complete!")

if __name__ == "__main__":
    run_migration()

