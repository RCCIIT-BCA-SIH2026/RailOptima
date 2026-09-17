from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(50), nullable=False) # Critical_Defect, Conflict_Detected, Block_Overrun, Speed_Restriction
    severity = Column(String(20), nullable=False, index=True) # Critical, Warning, Info
    message = Column(Text, nullable=False)
    section_id = Column(Integer, ForeignKey("railway_sections.id"), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    section = relationship("RailwaySection", back_populates="alerts")

class WhatIfScenario(Base):
    __tablename__ = "what_if_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    baseline_plan_id = Column(Integer, ForeignKey("block_plans.id"), nullable=True)
    simulated_parameters = Column(JSON, nullable=False) # e.g. {"speed_restriction_pct": 20, "freight_surge_pct": 15, "emergency_defects_count": 3}
    result_metrics = Column(JSON, nullable=False) # e.g. {"projected_delay_mins": 340, "conflicts_count": 4, "throughput_pct": 82}
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class IntegrationLog(Base):
    __tablename__ = "integration_logs"

    id = Column(Integer, primary_key=True, index=True)
    system_name = Column(String(20), nullable=False, index=True) # TMS, SMMS, TDMS, COA
    sync_type = Column(String(30), default="Scheduled") # Scheduled, Manual, Triggered
    records_synced = Column(Integer, default=0)
    status = Column(String(20), default="Success", index=True) # Success, Partial, Failed
    error_details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

