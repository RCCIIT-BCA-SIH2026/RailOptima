import os
import sys
# Make sure we can import from backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend", "app", "core")))

from backend.app.core.database import SessionLocal
from backend.app.services.whatsapp_dispatch_service import WhatsAppDispatchService

db_session = SessionLocal()
try:
    print("Testing process_inbound_message with 'hi'...")
    res = WhatsAppDispatchService.process_inbound_message(
        db=db_session,
        phone_number="+917439033504",
        message_body="hi",
        raw_payload={}
    )
    print("RESULT:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db_session.close()
