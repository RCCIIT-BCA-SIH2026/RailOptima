from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column(String(50), unique=True, nullable=False, index=True)
    asset_name = Column(String(255), nullable=False)

    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("railway_sections.id"), nullable=False)
    asset_type = Column(String(50), nullable=False) # Rail, Sleeper, Point_Machine, Track_Circuit, Signal_Post, OHE_Mast, Substation
    km_location = Column(Float, nullable=False) # e.g. 142.500
    installation_date = Column(DateTime, nullable=False)
    health_score = Column(Float, default=100.0) # 0.0 to 100.0
    status = Column(String(20), default="Operational", index=True) # Operational, Degraded, Critical

    department = relationship("Department", back_populates="assets")
    section = relationship("RailwaySection", back_populates="assets")
    defects = relationship("Defect", back_populates="asset")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="asset")
    history = relationship("AssetHistory", back_populates="asset")

class AssetHistory(Base):
    __tablename__ = "asset_history"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    event_type = Column(String(50), nullable=False) # INSPECTION, USFD_TEST, MAINTENANCE, FAILURE, REPLACEMENT
    description = Column(String(255), nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
    recorded_by = Column(String(100), nullable=False)
    metrics_snapshot = Column(JSON, nullable=True) # e.g. {"wear_mm": 2.1, "operating_time_sec": 4.8, "flaw_depth_mm": 0}

    asset = relationship("Asset", back_populates="history")

