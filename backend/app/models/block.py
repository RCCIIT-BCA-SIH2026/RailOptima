from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class BlockPlan(Base):
    __tablename__ = "block_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_code = Column(String(50), unique=True, nullable=False, index=True) # e.g. PLN-2026-WK38, PLN-MONTH-OCT
    plan_type = Column(String(20), nullable=False) # Weekly, Monthly, AdHoc
    status = Column(String(30), default="Draft", index=True) # Draft, Under_Review, Approved, Published
    horizon_start = Column(DateTime, nullable=False)
    horizon_end = Column(DateTime, nullable=False)
    total_blocks = Column(Integer, default=0)
    total_delay_impact_minutes = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    blocks = relationship("Block", back_populates="plan")
    approvals = relationship("Approval", back_populates="plan")

class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    block_code = Column(String(50), unique=True, nullable=False, index=True) # e.g. BLK-NCR-2026-0042
    plan_id = Column(Integer, ForeignKey("block_plans.id"), nullable=True)
    section_id = Column(Integer, ForeignKey("railway_sections.id"), nullable=False)
    block_type = Column(String(30), nullable=False) # Traffic, Power, Integrated (Shadow Block)
    requested_start_time = Column(DateTime, nullable=False, index=True)
    requested_end_time = Column(DateTime, nullable=False, index=True)
    actual_start_time = Column(DateTime, nullable=True)
    actual_end_time = Column(DateTime, nullable=True)
    status = Column(String(30), default="Proposed", index=True) # Proposed, Approved, Rejected, In_Progress, Completed, Cancelled
    lead_department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    total_tasks_count = Column(Integer, default=1)
    duration_minutes = Column(Integer, default=180)
    work_type = Column(String(100), default="Track Maintenance")
    affected_assets = Column(String(255), nullable=True)
    affected_trains = Column(String(255), nullable=True)
    approval_status = Column(String(30), default="Approved", index=True) # Approved, Pending, Rejected, Under Review

    section = relationship("RailwaySection", back_populates="blocks")
    plan = relationship("BlockPlan", back_populates="blocks")
    lead_department = relationship("Department")
    block_tasks = relationship("BlockTask", back_populates="block")
    resource_assignments = relationship("ResourceAssignment", back_populates="block")
    approvals = relationship("Approval", back_populates="block")
    ai_recommendations = relationship("AIRecommendation", back_populates="block")
    train_delays = relationship("TrainDelay", back_populates="block")

class BlockTask(Base):
    __tablename__ = "block_tasks"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("maintenance_tasks.id"), nullable=False)
    sequence_order = Column(Integer, default=1)
    allocated_start_time = Column(DateTime, nullable=False)
    allocated_end_time = Column(DateTime, nullable=False)

    block = relationship("Block", back_populates="block_tasks")
    task = relationship("MaintenanceTask", back_populates="block_tasks")

class Conflict(Base):
    __tablename__ = "conflicts"

    id = Column(Integer, primary_key=True, index=True)
    block_id_1 = Column(Integer, ForeignKey("blocks.id"), nullable=False)
    block_id_2 = Column(Integer, ForeignKey("blocks.id"), nullable=True) # If conflict is between two blocks
    train_id = Column(Integer, ForeignKey("trains.id"), nullable=True) # If conflict is with a passenger train
    conflict_type = Column(String(50), nullable=False) # Spatial_Overlap, Train_Path_Clash, Resource_Contention, Power_Traffic_Mismatch
    severity = Column(String(20), nullable=False) # High, Medium, Low
    detected_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolution_suggestion = Column(Text, nullable=True)

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=True)
    plan_id = Column(Integer, ForeignKey("block_plans.id"), nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role_at_review = Column(String(50), nullable=False) # e.g. DRM, Sr_DOM, Sr_DEN
    action = Column(String(30), nullable=False) # Approved, Rejected, Modification_Requested
    comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=datetime.utcnow, index=True)

    block = relationship("Block", back_populates="approvals")
    plan = relationship("BlockPlan", back_populates="approvals")
    reviewed_by_user = relationship("User", back_populates="approvals")

class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=False)
    alternative_number = Column(Integer, default=1) # 1: Balanced, 2: Max Throughput, 3: Zero Disruption
    strategy_name = Column(String(100), nullable=False)
    confidence_score = Column(Float, default=0.92) # 0.0 to 1.0
    throughput_score = Column(Float, default=85.0) # 0.0 to 100.0
    delay_impact_minutes = Column(Integer, default=15)
    multi_dept_synergy_score = Column(Float, default=78.0) # 0.0 to 100.0
    rationale_text = Column(Text, nullable=False) # Generated by AI explainer
    created_at = Column(DateTime, default=datetime.utcnow)

    block = relationship("Block", back_populates="ai_recommendations")

