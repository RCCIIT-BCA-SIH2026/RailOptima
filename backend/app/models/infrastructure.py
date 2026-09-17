from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Corridor(Base):
    __tablename__ = "corridors"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True) # e.g. NDLS-CNB, AGC-VGLJ, VGLJ-BPL
    name = Column(String(100), nullable=False)
    zone = Column(String(20), nullable=False) # e.g. NCR, NR, WCR
    division = Column(String(50), nullable=False) # e.g. DLI, AGC, PRYJ, JHS, BPL
    start_station = Column(String(10), nullable=False)
    end_station = Column(String(10), nullable=False)
    total_distance_km = Column(Float, nullable=False)

    sections = relationship("RailwaySection", back_populates="corridor")

class RailwaySection(Base):
    __tablename__ = "railway_sections"

    id = Column(Integer, primary_key=True, index=True)
    corridor_id = Column(Integer, ForeignKey("corridors.id"), nullable=False)
    section_code = Column(String(30), unique=True, nullable=False, index=True) # e.g. NDLS-TKD-UP, TKD-PWL-DN
    start_station = Column(String(10), nullable=False)
    end_station = Column(String(10), nullable=False)
    track_type = Column(String(20), nullable=False) # UP, DOWN, SINGLE, THIRD
    length_km = Column(Float, nullable=False)
    max_permissible_speed = Column(Integer, default=130) # km/h
    line_capacity = Column(Integer, default=60) # trains per day
    current_traffic_density = Column(Float, default=45.0) # GMT (Gross Million Tonnes)
    start_lat = Column(Float, nullable=True)
    start_lng = Column(Float, nullable=True)
    end_lat = Column(Float, nullable=True)
    end_lng = Column(Float, nullable=True)

    corridor = relationship("Corridor", back_populates="sections")
    assets = relationship("Asset", back_populates="section")
    defects = relationship("Defect", back_populates="section")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="section")
    train_schedules = relationship("TrainSchedule", back_populates="section")
    blocks = relationship("Block", back_populates="section")
    alerts = relationship("Alert", back_populates="section")

