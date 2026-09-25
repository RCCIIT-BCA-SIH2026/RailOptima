import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.services.whatsapp_dispatch_service import WhatsAppDispatchService
from backend.app.services.dynamic_resequencer import DynamicResequencer

client = TestClient(app)

def test_whatsapp_subscriber_and_templates():
    db = SessionLocal()
    try:
        # Render template 1 in Bengali
        msg_bn = WhatsAppDispatchService.render_resequence_alert(
            train_a_name="12002 Shatabdi",
            delay_mins=75,
            new_eta="15:15",
            train_b_name="12290 Duronto",
            location="Pit Line 3",
            start_time="14:15",
            end_time="15:15",
            duration_mins=60,
            task_scope="Track Maintenance & Pit Servicing",
            lang="bn"
        )
        assert "সতর্কতা" in msg_bn or "Train A" in msg_bn
        assert "12290 Duronto" in msg_bn

        # Test API subscriber listing
        res = client.get("/api/whatsapp/subscribers")
        assert res.status_code == 200
        data = res.json()
        assert data["count"] >= 1

        # Test Dynamic Re-Sequencing Trigger via API
        reseq_res = client.post("/api/whatsapp/trigger-resequence", json={
            "delayed_train_number": "12002",
            "delay_minutes": 75,
            "target_pit_line": "Pit Line 3",
            "section_name": "New Delhi Depot"
        })
        assert reseq_res.status_code == 200
        reseq_data = reseq_res.json()
        assert reseq_data["event"] == "DYNAMIC_TRAIN_SWAP_EXECUTED"
        assert reseq_data["delayed_train"]["delay_minutes"] == 75

        # Test Inbound Crew reply "1" (ACK)
        ack_res = client.post("/api/whatsapp/simulate-inbound", json={
            "phone_number": "+919876543210",
            "message_body": "1"
        })
        assert ack_res.status_code == 200
        assert ack_res.json()["intent"] == "ACK"
        assert ack_res.json()["tool_executed"] == "ACKNOWLEDGE_BLOCK"

        # Test Inbound Crew reply "START"
        start_res = client.post("/api/whatsapp/simulate-inbound", json={
            "phone_number": "+919876543210",
            "message_body": "START"
        })
        assert start_res.status_code == 200
        assert start_res.json()["intent"] == "START"
        assert start_res.json()["tool_executed"] == "START_POSSESSION"

        # Test Inbound Crew reply "DONE"
        done_res = client.post("/api/whatsapp/simulate-inbound", json={
            "phone_number": "+919876543210",
            "message_body": "DONE"
        })
        assert done_res.status_code == 200
        assert done_res.json()["intent"] == "DONE"
        assert done_res.json()["tool_executed"] == "COMPLETE_POSSESSION"

    finally:
        db.close()
