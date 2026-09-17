from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Train(Base):
    __tablename__ = "trains"

    id = Column(Integer, primary_key=True, index=True)
    train_no = Column(String(10), unique=True, nullable=False, index=True) # e.g. 12002, 22436, G-8821
    train_name = Column(String(100), nullable=False) # e.g. Bhopal Shatabdi, Vande Bharat Express, Container Special
    train_type = Column(String(30), nullable=False) # Vande_Bharat, Rajdhani, Shatabdi, Mail_Express, Freight, Suburban
    priority_level = Column(Integer, default=3, index=True) # 1 (Highest) to 5 (Empty Freight Rake)
    max_speed = Column(Integer, default=110) # km/h
    is_freight = Column(Boolean, default=False, index=True)
    
    # Train Operations extended timetable fields
    origin = Column(String(100), nullable=True, default="New Delhi (NDLS)")
    destination = Column(String(100), nullable=True, default="Bhopal Junction (BPL)")
    route = Column(String(255), nullable=True, default="NDLS - AGC - GWL - VGLJ - BPL")
    scheduled_arrival = Column(DateTime, nullable=True)
    scheduled_departure = Column(DateTime, nullable=True)
    expected_arrival = Column(DateTime, nullable=True)
    expected_departure = Column(DateTime, nullable=True)
    delay_minutes = Column(Integer, default=0, index=True)
    status = Column(String(30), default="On Time", index=True) # On Time, Delayed, Running, Departed, Arrived

    schedules = relationship("TrainSchedule", back_populates="train")
    delays = relationship("TrainDelay", back_populates="train")

class TrainSchedule(Base):
    __tablename__ = "train_schedules"

    id = Column(Integer, primary_key=True, index=True)
    train_id = Column(Integer, ForeignKey("trains.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("railway_sections.id"), nullable=False)
    scheduled_entry_time = Column(DateTime, nullable=False, index=True)
    scheduled_exit_time = Column(DateTime, nullable=False, index=True)
    direction = Column(String(10), nullable=False) # UP, DOWN
    halt_station = Column(String(10), nullable=True) # Station code if there is a halt
    halt_duration_minutes = Column(Integer, default=0)

    train = relationship("Train", back_populates="schedules")
    section = relationship("RailwaySection", back_populates="train_schedules")

class TrainDelay(Base):
    __tablename__ = "train_delays"

    id = Column(Integer, primary_key=True, index=True)
    train_id = Column(Integer, ForeignKey("trains.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("railway_sections.id"), nullable=False)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=True) # Linked maintenance block that caused or regulated this train
    delay_minutes = Column(Integer, nullable=False)
    cause = Column(String(200), nullable=False) # e.g. Maintenance Block Regulation, Speed Restriction, Preceding Train Clustered
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)

    train = relationship("Train", back_populates="delays")
    block = relationship("Block", back_populates="train_delays")
