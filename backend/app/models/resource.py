from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    resource_code = Column(String(50), unique=True, nullable=False, index=True) # e.g. RES-BCM-04, RES-TW-02
    resource_name = Column(String(100), nullable=False) # e.g. Ballast Cleaning Machine #04, 8-Wheeler Tower Wagon
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    resource_type = Column(String(50), nullable=False) # BCM, Tamping_Machine, Tower_Wagon, Gang_Labor, Rail_Grinder, Crane
    base_station = Column(String(10), nullable=False) # e.g. NDLS, CNB, AGC, VGLJ, BPL, ET, NGP
    availability_status = Column(String(20), default="Available", index=True) # Available, Deployed, In_Maintenance

    department = relationship("Department", back_populates="resources")
    assignments = relationship("ResourceAssignment", back_populates="resource")

class ResourceAssignment(Base):
    __tablename__ = "resource_assignments"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("maintenance_tasks.id"), nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)

    resource = relationship("Resource", back_populates="assignments")
    block = relationship("Block", back_populates="resource_assignments")
    task = relationship("MaintenanceTask", back_populates="resource_assignments")

