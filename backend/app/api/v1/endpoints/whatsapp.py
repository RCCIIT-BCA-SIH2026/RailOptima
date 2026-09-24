import random
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.whatsapp import WhatsAppCrewSubscriber, WhatsAppMessageLog
from backend.app.services.whatsapp_dispatch_service import WhatsAppDispatchService
from backend.app.services.dynamic_resequencer import DynamicResequencer

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory store for WhatsApp OTP verifications
_PENDING_OTPS: Dict[str, Dict[str, Any]] = {}

# ── Pydantic Request Schemas ──────────────────────────────────────────────────
class OTPRequestSchema(BaseModel):
    phone_number: str = Field(..., example="+919876543210")
    full_name: str = Field(..., example="Rajesh Kumar")
    crew_id: Optional[str] = Field("CREW-DEL-01", example="CREW-DEL-01")
    role: str = Field("Junior Engineer", example="Junior Engineer")
    department: str = Field("Engineering", example="Engineering")
    assigned_gang: Optional[str] = "Gang Alpha"
    language_pref: str = Field("en", example="en")

class OTPVerifySchema(BaseModel):
    phone_number: str = Field(..., example="+919876543210")
    otp_code: str = Field(..., example="482915")

class SubscriberCreateSchema(BaseModel):
    phone_number: str = Field(..., example="+919876543210")
    full_name: str = Field(..., example="Rajesh Kumar")
    crew_id: str = Field(..., example="CREW-DEL-01")
    role: str = Field("Junior Engineer", example="Junior Engineer")
    department: str = Field("Engineering", example="Engineering")
    section_name: Optional[str] = "New Delhi - Agra Section"
    assigned_gang: Optional[str] = "Gang Alpha"
    language_pref: str = Field("en", example="en") # en, hi, bn, hinglish

class InboundSimulateSchema(BaseModel):
    phone_number: str = Field(..., example="+919876543210")
    message_body: str = Field(..., example="1")

class ResequenceTriggerSchema(BaseModel):
    delayed_train_number: str = Field("12002", example="12002")
    delay_minutes: int = Field(75, example=75)
    target_pit_line: str = Field("Pit Line 3", example="Pit Line 3")
    section_name: str = Field("New Delhi Yard", example="New Delhi Yard")

class BroadcastAlertSchema(BaseModel):
    phone_number: Optional[str] = None # None means broadcast to all active crew
    alert_type: str = Field("work_order", example="resequence_alert") # resequence_alert, work_order, countdown_warning
    train_a_name: Optional[str] = "Shatabdi Express (12002)"
    delay_mins: Optional[int] = 75
    new_eta: Optional[str] = "15:15"
    train_b_name: Optional[str] = "Duronto Express (12290)"
    location: Optional[str] = "Pit Line 3"
    start_time: Optional[str] = "14:15"
    end_time: Optional[str] = "15:15"
    duration_mins: Optional[int] = 60
    task_scope: Optional[str] = "Track Possession & Rail Fastening Inspection"
    block_code: Optional[str] = "BLK-NCR-2026-0042"
    gang_name: Optional[str] = "Gang Alpha"

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/webhook", summary="Meta WhatsApp Cloud API Webhook Verification")
def verify_whatsapp_webhook(
    request: Request
):
    """
    Verification GET endpoint required by Meta WhatsApp Cloud API hub verification.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
            logger.info("WhatsApp webhook verified successfully!")
            return Response(content=challenge, media_type="text/plain")
        else:
            raise HTTPException(status_code=403, detail="Verification token mismatch")
    return {"status": "RailOptima WhatsApp Webhook Service Active"}


@router.post("/webhook", summary="Meta WhatsApp Cloud API Inbound Webhook Receiver")
async def receive_whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    POST webhook receiver for incoming messages from WhatsApp Cloud API.
    """
    body = await request.json()
    logger.info(f"Received WhatsApp Webhook Payload: {body}")

    results = []
    try:
        entries = body.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                messages = value.get("messages", [])
                for msg in messages:
                    sender = msg.get("from", "")
                    if sender and not sender.startswith("+"):
                        sender = f"+{sender}"
                    
                    msg_text = ""
                    if msg.get("type") == "text":
                        msg_text = msg.get("text", {}).get("body", "")
                    elif msg.get("type") == "button":
                        msg_text = msg.get("button", {}).get("text", "")
                    elif msg.get("type") == "interactive":
                        msg_text = msg.get("interactive", {}).get("button_reply", {}).get("title", "")

                    if sender and msg_text:
                        res = WhatsAppDispatchService.process_inbound_message(
                            db=db,
                            phone_number=sender,
                            message_body=msg_text,
                            raw_payload=msg
                        )
                        results.append(res)
    except Exception as e:
        logger.error(f"Error handling WhatsApp webhook payload: {str(e)}")

    return {"status": "ok", "processed_messages": results}


@router.post("/simulate-inbound", summary="Simulate Inbound Crew Reply via WhatsApp")
def simulate_inbound_message(
    payload: InboundSimulateSchema,
    db: Session = Depends(get_db)
):
    """
    Test endpoint to simulate ground crew replying via WhatsApp text/voice.
    Evaluates intention, executes tool action, updates DB, and returns outbound reply.
    """
    res = WhatsAppDispatchService.process_inbound_message(
        db=db,
        phone_number=payload.phone_number,
        message_body=payload.message_body
    )
    return res


@router.post("/make-voice-call", summary="Trigger Direct Real Voice Call to Mobile Phone")
def make_voice_call(
    payload: InboundSimulateSchema,
    db: Session = Depends(get_db)
):
    """
    Triggers an immediate real voice call to the user's mobile phone number.
    """
    res = WhatsAppDispatchService.trigger_real_voice_call(
        phone_number=payload.phone_number,
        db=db
    )
    return res


@router.post("/trigger-resequence", summary="Trigger Dynamic Train Re-Sequencer Event")
def trigger_dynamic_resequence(
    payload: ResequenceTriggerSchema,
    db: Session = Depends(get_db)
):
    """
    Simulates a live telemetry train delay event (Train A delayed by threshold).
    Executes CP-SAT schedule swap (Train B promoted to active window, Train A deferred),
    updates DB, and dispatches multilingual WhatsApp alerts to assigned crew subscribers.
    """
    res = DynamicResequencer.process_delay_and_resequence(
        db=db,
        delayed_train_number=payload.delayed_train_number,
        delay_minutes=payload.delay_minutes,
        target_pit_line=payload.target_pit_line,
        section_name=payload.section_name
    )
    return res


@router.post("/broadcast-alert", summary="Broadcast WhatsApp Work Order / Alert")
def broadcast_whatsapp_alert(
    payload: BroadcastAlertSchema,
    db: Session = Depends(get_db)
):
    """
    Broadcasts custom work order or countdown warning to specific crew member or all active crew.
    """
    if payload.phone_number:
        subscribers = db.query(WhatsAppCrewSubscriber).filter(WhatsAppCrewSubscriber.phone_number == payload.phone_number).all()
    else:
        subscribers = db.query(WhatsAppCrewSubscriber).filter(WhatsAppCrewSubscriber.is_active == True).all()

    if not subscribers:
        raise HTTPException(status_code=404, detail="No active WhatsApp subscribers found")

    results = []
    for sub in subscribers:
        lang = sub.language_pref or "en"
        if payload.alert_type == "resequence_alert":
            msg_text = WhatsAppDispatchService.render_resequence_alert(
                train_a_name=payload.train_a_name or "Shatabdi Express (12002)",
                delay_mins=payload.delay_mins or 75,
                new_eta=payload.new_eta or "15:15",
                train_b_name=payload.train_b_name or "Duronto Express (12290)",
                location=payload.location or "Pit Line 3",
                start_time=payload.start_time or "14:15",
                end_time=payload.end_time or "15:15",
                duration_mins=payload.duration_mins or 60,
                task_scope=payload.task_scope or "Pit Line Servicing & Safety Fit Check",
                lang=lang
            )
        elif payload.alert_type == "countdown_warning":
            msg_text = WhatsAppDispatchService.render_countdown_warning(
                location=payload.location or "KM 824/12",
                next_train=payload.train_a_name or "12002 Shatabdi",
                next_train_eta=payload.new_eta or "15:15",
                close_time=payload.end_time or "15:00",
                lang=lang
            )
        else: # Normal Work Order
            msg_text = WhatsAppDispatchService.render_work_order(
                block_code=payload.block_code or "BLK-NCR-2026-0042",
                line_train=payload.train_b_name or "Up Main Line KM 824",
                location=payload.location or "Agra Section",
                start_time=payload.start_time or "14:15",
                end_time=payload.end_time or "15:15",
                duration_mins=payload.duration_mins or 60,
                task_details=payload.task_scope or "USFD Ultrasonic Flaw Detection & Weld Grind",
                gang_name=payload.gang_name or sub.assigned_gang or "Gang Alpha",
                lang=lang
            )

        dispatch_res = WhatsAppDispatchService.send_whatsapp_message(
            phone_number=sub.phone_number,
            message_text=msg_text,
            db=db,
            msg_type=payload.alert_type
        )
        results.append({
            "phone_number": sub.phone_number,
            "crew_name": sub.full_name,
            "role": sub.role,
            "dispatch_res": dispatch_res
        })

    return {
        "status": "broadcast_complete",
        "recipients_count": len(results),
        "dispatches": results
    }


@router.get("/subscribers", summary="List WhatsApp Field Crew Subscribers")
def list_subscribers(
    role: Optional[str] = None,
    lang: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns registered field crew subscribers.
    """
    # Clean up legacy dummy subscribers if present
    dummy_phones = ["+15556591544", "+919876543210", "+919876543211", "+919876543212"]
    dummy_crew_ids = ["CREW-TEST-00", "CREW-DEL-01", "CREW-DEL-02", "CREW-DEL-03"]
    db.query(WhatsAppCrewSubscriber).filter(
        (WhatsAppCrewSubscriber.phone_number.in_(dummy_phones)) |
        (WhatsAppCrewSubscriber.crew_id.in_(dummy_crew_ids))
    ).delete(synchronize_session=False)
    db.commit()

    query = db.query(WhatsAppCrewSubscriber)
    if role:
        query = query.filter(WhatsAppCrewSubscriber.role == role)
    if lang:
        query = query.filter(WhatsAppCrewSubscriber.language_pref == lang)

    subs = query.order_by(WhatsAppCrewSubscriber.id.asc()).all()

    return {"count": len(subs), "subscribers": subs}


@router.post("/request-otp", summary="Request WhatsApp Phone Number Verification OTP")
def request_whatsapp_otp(
    payload: OTPRequestSchema,
    db: Session = Depends(get_db)
):
    """
    Generates a 6-digit verification OTP and dispatches WhatsApp OTP message to crew member.
    """
    raw_phone = payload.phone_number.strip().replace(" ", "").replace("-", "")
    if raw_phone.isdigit() and len(raw_phone) == 10:
        clean_phone = f"+91{raw_phone}"
    elif not raw_phone.startswith("+") and len(raw_phone) >= 10:
        clean_phone = f"+{raw_phone}"
    else:
        clean_phone = raw_phone

    otp_code = f"{random.randint(100000, 999999)}"

    pending_entry = {
        "otp_code": otp_code,
        "payload": payload,
        "created_at": logger.info(f"Generated OTP {otp_code} for {clean_phone} (raw: {raw_phone})")
    }

    _PENDING_OTPS[clean_phone] = pending_entry
    _PENDING_OTPS[raw_phone] = pending_entry

    # Dispatch simulated/real WhatsApp verification message
    otp_msg = (
        f"🔐 *RailOptima Verification Code*\n\n"
        f"Your WhatsApp Field Crew Assignment OTP is: *{otp_code}*\n\n"
        f"Hi {payload.full_name}, enter this 6-digit code in the RailOptima Dispatcher to verify and activate your phone number ({clean_phone})."
    )

    dispatch_res = WhatsAppDispatchService.send_whatsapp_message(
        phone_number=clean_phone,
        message_text=otp_msg,
        db=db,
        msg_type="otp_verification"
    )

    if not dispatch_res.get("success", False):
        resp_data = dispatch_res.get("response", {})
        err_msg = "Failed to send WhatsApp message via Meta Cloud API."
        if isinstance(resp_data, dict) and "error" in resp_data:
            err_details = resp_data["error"]
            err_code = err_details.get("code")
            err_msg = f"Meta WhatsApp API Error ({err_code}): {err_details.get('message', 'Invalid request')}"
            if err_code == 190:
                err_msg = "Meta WhatsApp Cloud API Access Token in .env has EXPIRED (OAuthException Code 190). Please generate a fresh Temporary/Permanent Access Token from Meta Developer Portal and update WHATSAPP_API_TOKEN in .env."
            elif err_code == 131030:
                err_msg = f"Meta WhatsApp API Error (131030): Phone number {clean_phone} is not in Meta's allowed recipient list. Please add +917439033504 in Meta Developer Portal -> WhatsApp -> API Setup -> 'To' dropdown."
        raise HTTPException(status_code=400, detail=err_msg)

    return {
        "status": "otp_sent",
        "phone_number": clean_phone,
        "message": f"6-Digit OTP Verification code dispatched via WhatsApp to {clean_phone}."
    }


@router.post("/verify-otp", summary="Verify WhatsApp OTP & Complete Phone Number Assignment")
def verify_whatsapp_otp(
    payload: OTPVerifySchema,
    db: Session = Depends(get_db)
):
    """
    Validates 6-digit WhatsApp OTP code before assigning phone number to crew subscriber in database.
    """
    clean_phone = payload.phone_number.strip()
    entered_otp = payload.otp_code.strip()

    pending = _PENDING_OTPS.get(clean_phone)
    if not pending:
        raise HTTPException(status_code=400, detail="No pending verification found for this phone number. Please request OTP first.")

    if pending["otp_code"] != entered_otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code entered. Please check your WhatsApp message and try again.")

    # OTP is valid! Create or update subscriber in DB
    p_data = pending["payload"]
    existing = db.query(WhatsAppCrewSubscriber).filter(WhatsAppCrewSubscriber.phone_number == clean_phone).first()

    if existing:
        existing.full_name = p_data.full_name
        existing.crew_id = p_data.crew_id or existing.crew_id
        existing.role = p_data.role
        existing.department = p_data.department
        existing.assigned_gang = p_data.assigned_gang or existing.assigned_gang
        existing.language_pref = p_data.language_pref
        existing.is_active = True
        sub_obj = existing
    else:
        sub_obj = WhatsAppCrewSubscriber(
            phone_number=clean_phone,
            full_name=p_data.full_name,
            crew_id=p_data.crew_id or f"CREW-DEL-{random.randint(10, 99)}",
            role=p_data.role,
            department=p_data.department,
            section_name="New Delhi - Agra Section",
            assigned_gang=p_data.assigned_gang or "Gang Alpha",
            language_pref=p_data.language_pref,
            is_active=True
        )
        db.add(sub_obj)

    db.commit()
    db.refresh(sub_obj)

    # Clean up pending OTP
    _PENDING_OTPS.pop(clean_phone, None)

    # Send welcome dispatch message
    welcome_msg = f"✅ *WhatsApp Number Verified & Assigned*\n\nWelcome {sub_obj.full_name}! Your WhatsApp dispatch channel is now active for {sub_obj.department} ({sub_obj.role})."
    WhatsAppDispatchService.send_whatsapp_message(
        phone_number=clean_phone,
        message_text=welcome_msg,
        db=db,
        msg_type="system_welcome"
    )

    return {
        "status": "verified",
        "message": f"WhatsApp Phone Number {clean_phone} successfully verified and assigned to {sub_obj.full_name}!",
        "subscriber": {
            "id": sub_obj.id,
            "phone_number": sub_obj.phone_number,
            "full_name": sub_obj.full_name,
            "role": sub_obj.role,
            "department": sub_obj.department,
            "assigned_gang": sub_obj.assigned_gang,
            "language_pref": sub_obj.language_pref,
            "is_active": sub_obj.is_active
        }
    }


@router.post("/subscribers", summary="Add or Update Field Crew Subscriber")
def add_subscriber(
    payload: SubscriberCreateSchema,
    db: Session = Depends(get_db)
):
    """
    Registers a new field maintenance worker for WhatsApp dispatching.
    """
    existing = db.query(WhatsAppCrewSubscriber).filter(WhatsAppCrewSubscriber.phone_number == payload.phone_number).first()
    if existing:
        existing.full_name = payload.full_name
        existing.crew_id = payload.crew_id
        existing.role = payload.role
        existing.department = payload.department
        existing.section_name = payload.section_name or existing.section_name
        existing.assigned_gang = payload.assigned_gang or existing.assigned_gang
        existing.language_pref = payload.language_pref
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return {"status": "updated", "subscriber": existing}

    new_sub = WhatsAppCrewSubscriber(
        phone_number=payload.phone_number,
        full_name=payload.full_name,
        crew_id=payload.crew_id,
        role=payload.role,
        department=payload.department,
        section_name=payload.section_name or "New Delhi - Agra Section",
        assigned_gang=payload.assigned_gang or "Gang Alpha",
        language_pref=payload.language_pref,
        is_active=True
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return {"status": "created", "subscriber": new_sub}


@router.get("/logs", summary="Fetch WhatsApp Dispatch & Interaction Logs")
def get_message_logs(
    phone_number: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Returns history of inbound & outbound WhatsApp messages.
    """
    query = db.query(WhatsAppMessageLog)
    if phone_number:
        query = query.filter(WhatsAppMessageLog.phone_number == phone_number)
    logs = query.order_by(WhatsAppMessageLog.created_at.desc()).limit(limit).all()
    return {"count": len(logs), "logs": logs}


@router.delete("/logs", summary="Clear WhatsApp Message Logs")
def clear_message_logs(
    db: Session = Depends(get_db)
):
    """
    Purges all message logs for a clean live testing slate.
    """
    count = db.query(WhatsAppMessageLog).delete()
    db.commit()
    return {"status": "cleared", "deleted_count": count}


@router.delete("/logs/{log_id}", summary="Delete Single WhatsApp Message Log")
def delete_single_message_log(
    log_id: int,
    db: Session = Depends(get_db)
):
    """
    Deletes a specific message log entry by ID.
    """
    log_entry = db.query(WhatsAppMessageLog).filter(WhatsAppMessageLog.id == log_id).first()
    if not log_entry:
        raise HTTPException(status_code=404, detail="Message log not found")
    db.delete(log_entry)
    db.commit()
    return {"status": "deleted", "id": log_id}
