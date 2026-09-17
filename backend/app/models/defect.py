from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    defect_code = Column(String(50), unique=True, nullable=False, index=True) # e.g. DEF-ENG-2026-001
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("railway_sections.id"), nullable=True, index=True)
    location = Column(String(200), nullable=True) # e.g. KM 824/18, Nagpur - Wardha Up Line
    defect_type = Column(String(100), nullable=False) # e.g. Rail Fracture, I-Rail Weld Flaw, Point Detection Failure, OHE Catenary Sag
    description = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False, default="Major", index=True) # Critical, Major, Minor
    criticality = Column(String(50), nullable=True, default="P1 - Urgent", index=True) # P0 - Emergency, P1 - Urgent, P2 - Important, P3 - Routine
    reported_at = Column(DateTime, default=datetime.utcnow, index=True) # Detected Date
    due_date = Column(DateTime, nullable=True, index=True)
    estimated_repair_duration_minutes = Column(Integer, default=120)
    reported_by_system = Column(String(20), nullable=False, default="TMS") # TMS, SMMS, TDMS
    status = Column(String(30), default="Open", index=True) # Open, Investigating, Scheduled, Resolved, Closed
    calculated_priority_score = Column(Float, default=50.0, index=True) # 0.0 to 100.0 (Calculated by AI Engine)
    speed_restriction_imposed = Column(Integer, default=0) # e.g. 30 km/h (0 means no speed restriction)

    asset = relationship("Asset", back_populates="defects")
    department = relationship("Department", back_populates="defects")
    section = relationship("RailwaySection", back_populates="defects")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="defect")

class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_code = Column(String(50), unique=True, nullable=False, index=True) # e.g. TSK-ENG-2026-0101
    title = Column(String(255), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True, index=True)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=True, index=True) # Can be linked to a defect or routine maintenance
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("railway_sections.id"), nullable=True, index=True)
    location = Column(String(200), nullable=True) # e.g. KM 842/12 - 845/00, Wardha - Sevagram
    task_type = Column(String(100), nullable=True, default="Track Maintenance") # Track Tamping, Turnout Overhaul, OHE Catenary Adjustment, Relay Interlocking Overhaul
    description = Column(Text, nullable=True)
    criticality = Column(String(50), nullable=True, default="Medium", index=True) # Critical, High, Medium, Low
    urgency = Column(String(50), nullable=True, default="Within 3 Days", index=True) # Immediate, Within 24 Hours, Within 3 Days, Routine
    safety_impact = Column(String(100), nullable=True, default="Low") # Derailment Risk, Signal Failure Risk, OHE Tripping, Speed Restriction, Low
    estimated_duration_minutes = Column(Integer, nullable=False, default=120) # e.g. 120, 180, 240
    required_resources = Column(String(255), nullable=True) # e.g. 1x 09-3X Tamping Machine, 15 P-Way Gang
    due_date = Column(DateTime, nullable=True, index=True)
    required_track_possession = Column(Boolean, default=True)
    required_power_block = Column(Boolean, default=False)
    required_traffic_block = Column(Boolean, default=True)
    min_resources_needed = Column(JSON, nullable=True) # e.g. {"BCM": 1, "gang_men": 12, "tower_wagon": 0}
    status = Column(String(30), default="Pending", index=True) # Pending, Scheduled, In_Progress, Completed, Cancelled
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    asset = relationship("Asset", back_populates="maintenance_tasks")
    defect = relationship("Defect", back_populates="maintenance_tasks")
    department = relationship("Department", back_populates="maintenance_tasks")
    section = relationship("RailwaySection", back_populates="maintenance_tasks")
    block_tasks = relationship("BlockTask", back_populates="task")
    resource_assignments = relationship("ResourceAssignment", back_populates="task")


class AIPriorityRecommendation(Base):
    __tablename__ = "ai_priority_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("maintenance_tasks.id"), nullable=True, index=True)
    task_code = Column(String(50), nullable=True, index=True)
    title = Column(String(255), nullable=True)
    department_code = Column(String(20), default="ENG", index=True)
    priority_score = Column(Integer, nullable=False, index=True) # 0 to 100
    priority_level = Column(String(20), nullable=False, index=True) # Critical, High, Medium, Low
    criticality = Column(String(50), nullable=True)
    urgency = Column(String(50), nullable=True)
    safety_impact = Column(String(100), nullable=True)
    asset_availability_impact = Column(String(100), nullable=True)
    overdue_status = Column(String(100), nullable=True)
    operational_impact = Column(String(100), nullable=True)
    reasons = Column(JSON, nullable=False) # Explainable human-readable reasons list
    factor_breakdown = Column(JSON, nullable=True) # Detailed 6-factor score components
    recommended_window = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    task = relationship("MaintenanceTask")

