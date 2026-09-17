import os
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from backend.app.core.config import settings

def run_migration():
    print(f"Connecting to database: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # 1. Update defects table
        print("Migrating 'defects' table schema...")
        conn.execute(text("""
            ALTER TABLE defects 
            ADD COLUMN IF NOT EXISTS location VARCHAR(200),
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS criticality VARCHAR(50) DEFAULT 'P1 - Urgent',
            ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITHOUT TIME ZONE,
            ADD COLUMN IF NOT EXISTS estimated_repair_duration_minutes INTEGER DEFAULT 120;
        """))

        # 2. Update maintenance_tasks table
        print("Migrating 'maintenance_tasks' table schema...")
        conn.execute(text("""
            ALTER TABLE maintenance_tasks 
            ADD COLUMN IF NOT EXISTS asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS location VARCHAR(200),
            ADD COLUMN IF NOT EXISTS task_type VARCHAR(100) DEFAULT 'Track Maintenance',
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS criticality VARCHAR(50) DEFAULT 'Medium',
            ADD COLUMN IF NOT EXISTS urgency VARCHAR(50) DEFAULT 'Within 3 Days',
            ADD COLUMN IF NOT EXISTS safety_impact VARCHAR(100) DEFAULT 'Low',
            ADD COLUMN IF NOT EXISTS required_resources VARCHAR(255),
            ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITHOUT TIME ZONE,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
        """))
        conn.commit()
        print("Schema altered successfully!")

        # 3. Backfill data for defects
        print("Backfilling realistic data for defects...")
        now = datetime.utcnow()
        locations = [
            "KM 824/12 - 824/20, Nagpur - Wardha Up Line",
            "KM 836/04, Buti Bori Yard Loop Line",
            "KM 850/15 - 851/02, Sindi - Tuljapur Down Line",
            "KM 870/10, Wardha Junction Platform Line 2",
            "KM 885/22 - 886/05, Sevagram - Dahegaon Section",
            "KM 898/14, Pulgaon Point 102B",
            "KM 912/08 - 913/00, Dhamangaon Curve 14",
            "KM 935/16, Chandur Bridge No. 42 Approach",
            "KM 960/05, Badnera Junction Yard Point 204A"
        ]

        criticality_map = {
            "Critical": "P0 - Emergency",
            "Major": "P1 - Urgent",
            "Minor": "P2 - Important"
        }

        defects_rows = conn.execute(text("SELECT id, defect_code, defect_type, severity, reported_at, asset_id FROM defects")).fetchall()
        for row in defects_rows:
            d_id, code, dtype, sev, rep_at, a_id = row
            crit = criticality_map.get(sev, "P1 - Urgent")
            loc = random.choice(locations)
            desc = f"{sev} {dtype} detected during automated USFD/track telemetry. Requires immediate track inspection and remedial clamping/tamping."
            rep_date = rep_at or now
            due = rep_date + timedelta(days=1 if sev == "Critical" else (3 if sev == "Major" else 7))
            duration = 180 if sev == "Critical" else (120 if sev == "Major" else 60)

            conn.execute(text("""
                UPDATE defects 
                SET location = :loc,
                    description = :desc,
                    criticality = :crit,
                    due_date = :due,
                    estimated_repair_duration_minutes = :dur
                WHERE id = :id AND (location IS NULL OR description IS NULL OR due_date IS NULL)
            """), {
                "loc": loc,
                "desc": desc,
                "crit": crit,
                "due": due,
                "dur": duration,
                "id": d_id
            })
        conn.commit()
        print(f"Backfilled {len(defects_rows)} defect records.")

        # 4. Backfill data for maintenance_tasks
        print("Backfilling realistic data for maintenance_tasks...")
        task_types = [
            "Track Tamping & Lining",
            "Deep Ballast Screening (BCM)",
            "Rail Weld Flaw Replacement",
            "Turnout & Point Machine Overhaul",
            "OHE Catenary Sag Adjustment",
            "Signal Relay & Interlocking Testing",
            "Track Circuit Joint Inspection",
            "Substation Feeder Transformer Testing",
            "Derailment Switch Inspection"
        ]

        safety_impacts = [
            "Derailment Risk",
            "Speed Restriction Imposed",
            "Signal Failure Risk",
            "OHE Tripping Risk",
            "Minor Operational Drift"
        ]

        urgencies = [
            "Immediate",
            "Within 24 Hours",
            "Within 3 Days",
            "Routine Scheduled"
        ]

        criticalities = ["Critical", "High", "Medium", "Low"]

        resources_list = [
            "1x 09-3X Tamping Machine, 15 P-Way Gang",
            "1x BCM (Ballast Cleaning Machine), 20 Trackmen",
            "1x Tower Wagon, 6 TRD Linemen",
            "1x Flash Butt Welding Plant, 8 Technicians",
            "1x S&T Signal Gang, Point Testing Kit",
            "12 Maintenance Gang Men with Hand Tampers"
        ]

        tasks_rows = conn.execute(text("SELECT id, task_code, title, department_id, section_id, estimated_duration_minutes FROM maintenance_tasks")).fetchall()
        for row in tasks_rows:
            t_id, code, title, dept_id, sec_id, est_dur = row
            ttype = random.choice(task_types)
            loc = random.choice(locations)
            crit = random.choice(criticalities)
            urg = "Immediate" if crit == "Critical" else random.choice(urgencies)
            saf = "Derailment Risk" if crit == "Critical" else random.choice(safety_impacts)
            res = random.choice(resources_list)
            due = now + timedelta(days=random.randint(1, 14), hours=random.randint(1, 18))
            desc = f"Comprehensive maintenance execution: {title}. Work to be executed under sanctioned block window with designated supervisor."

            # Find matching asset if possible
            asset_res = conn.execute(text("SELECT id FROM assets WHERE department_id = :d LIMIT 1"), {"d": dept_id}).fetchone()
            asset_id = asset_res[0] if asset_res else None

            conn.execute(text("""
                UPDATE maintenance_tasks 
                SET asset_id = :aid,
                    location = :loc,
                    task_type = :ttype,
                    description = :desc,
                    criticality = :crit,
                    urgency = :urg,
                    safety_impact = :saf,
                    required_resources = :res,
                    due_date = :due
                WHERE id = :id AND (location IS NULL OR description IS NULL OR due_date IS NULL)
            """), {
                "aid": asset_id,
                "loc": loc,
                "ttype": ttype,
                "desc": desc,
                "crit": crit,
                "urg": urg,
                "saf": saf,
                "res": res,
                "due": due,
                "id": t_id
            })
        conn.commit()
        print(f"Backfilled {len(tasks_rows)} maintenance tasks records.")
        print("Database migration completed successfully!")

if __name__ == "__main__":
    run_migration()

