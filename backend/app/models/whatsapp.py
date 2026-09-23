from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class WhatsAppCrewSubscriber(Base):
    __tablename__ = "whatsapp_crew_subscribers"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(30), unique=True, index=True, nullable=False) # e.g. "+919876543210"
    full_name = Column(String(100), nullable=False) # e.g. "Rajesh Kumar"
    crew_id = Column(String(50), index=True, nullable=False) # e.g. "CREW-DEL-04"
    role = Column(String(50), default="Junior Engineer", index=True) # Junior Engineer, Gangmate, Track Maintainer, OHE Lineman, Pit Line Tech, S&T Maintainer
    department = Column(String(50), default="Engineering", index=True) # Engineering, Electrical/TRD, S&T, Mechanical
    section_id = Column(Integer, ForeignKey("railway_sections.id"), nullable=True)
    section_name = Column(String(100), default="New Delhi - Agra Section")
    assigned_gang = Column(String(100), default="Gang Alpha")
    language_pref = Column(String(10), default="en", index=True) # en, hi, bn, hinglish
    is_active = Column(Boolean, default=True)
    last_active_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    section = relationship("RailwaySection")


class WhatsAppMessageLog(Base):
    __tablename__ = "whatsapp_message_logs"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(100), index=True, nullable=True) # WhatsApp wmid or internal uuid
    phone_number = Column(String(30), index=True, nullable=False)
    direction = Column(String(10), default="outbound", index=True) # inbound, outbound
    message_type = Column(String(50), default="text", index=True) # text, voice, resequence_alert, work_order, countdown_warning
    content = Column(Text, nullable=False)
    intent_detected = Column(String(50), nullable=True, index=True) # ACK, START, DONE, STATUS, EXTENSION, REPORT_DEFECT, QUERY_ETA
    tool_executed = Column(String(100), nullable=True) # ACKNOWLEDGE_BLOCK, START_POSSESSION, COMPLETE_POSSESSION, REQUEST_EXTENSION, REPORT_EXTRA_DEFECT, QUERY_TRAIN_ETA
    delivery_status = Column(String(20), default="sent") # sent, delivered, read, failed, received
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
