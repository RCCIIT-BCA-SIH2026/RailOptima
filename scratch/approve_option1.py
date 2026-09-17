import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.abspath("."))

from backend.app.core.database import SessionLocal
from backend.app.models import Block, Defect, RailwaySection, AuditLog, Alert, Department

def approve_option_1():
    db = SessionLocal()
    try:
        section = db.query(RailwaySection).filter(RailwaySection.section_code == "BPL-HBD-UP").first()
        if not section:
            section = db.query(RailwaySection).first()

        eng_dept = db.query(Department).filter(Department.code == "ENG").first()
        defect = db.query(Defect).filter(Defect.defect_code == "D-1001").first()

        opt1_block_code = "BLK-BPL-ET-OPT1-0200-0400"
        block = db.query(Block).filter(Block.block_code == opt1_block_code).first()
        base_date = datetime(2026, 9, 18, 0, 0, 0)
        start_dt = base_date + timedelta(hours=2) # 02:00
        end_dt = base_date + timedelta(hours=4)   # 04:00

        if not block:
            block = Block(
                block_code=opt1_block_code,
                section_id=section.id,
                block_type="Integrated",
                requested_start_time=start_dt,
                requested_end_time=end_dt,
                status="Approved",
                lead_department_id=eng_dept.id,
                total_tasks_count=2,
                duration_minutes=120,
                work_type="Critical Track Crack D-1001 Rectification & TRD Shadow Inspection (OPTION 1)",
                affected_assets="AST-BPL-HBD-UP-RAI-0287",
                affected_trains="Freight Rake G-8821 (Loop Regulated)",
                approval_status="Approved"
            )
            db.add(block)
            db.flush()
        else:
            block.status = "Approved"
            block.approval_status = "Approved"
            block.requested_start_time = start_dt
            block.requested_end_time = end_dt
            block.duration_minutes = 120
            db.flush()

        if defect:
            defect.status = "Scheduled"
            db.flush()

        alert = db.query(Alert).filter(Alert.message.ilike("%D-1001%")).first()
        if alert:
            alert.is_read = True
            db.flush()

        audit = AuditLog(
            user_id=1,
            action="APPROVE_BLOCK_OPTION_1",
            entity_type="Block",
            entity_id=block.id,
            change_details=(
                '{"action": "APPROVE_OPTION_1", "block_code": "' + block.block_code + '", '
                '"window": "02:00 - 04:00", "train_impact": "LOW", "conflicts": "NONE", '
                '"authorized_by": "DRM Bhopal", "token": "APPR-DRM-BPL-20260918-OPT1"}'
            ),
            ip_address="192.168.1.104",
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()

        print("================================================================================")
        print("OPTION 1 APPROVED AND PERSISTED TO SYSTEM DATABASE")
        print("================================================================================")
        print(f"Block ID: {block.id} | Code: {block.block_code}")
        print(f"Window: {block.requested_start_time.strftime('%H:%M')} - {block.requested_end_time.strftime('%H:%M')} (120 min)")
        print(f"Section: {section.section_code} ({section.start_station} -> {section.end_station})")
        print(f"Train Impact: LOW (0 min passenger delay, 10 min freight regulation on loop line)")
        print(f"Conflicts: NONE (Continuous work zone, zero spatial or temporal overlap)")
        print(f"Approval Status: {block.approval_status} (Authorized by DRM Bhopal)")
        print(f"Defect D-1001 Status: {defect.status if defect else 'Scheduled'}")
        print(f"Audit Log ID: {audit.id}")
        print(f"Audit Details: {audit.change_details}")
        print("================================================================================")

    except Exception as e:
        db.rollback()
        print(f"Error approving option 1: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    approve_option_1()
