from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True) # Admin, DRM, Sr_DEN, Sr_DSTE, Sr_DEE, Sr_DOM, Supervisor
    description = Column(String(255), nullable=True)

    users = relationship("User", back_populates="role")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False, index=True) # ENG, SNT, TRD, OPT
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)

    users = relationship("User", back_populates="department")
    assets = relationship("Asset", back_populates="department")
    defects = relationship("Defect", back_populates="department")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="department")
    resources = relationship("Resource", back_populates="department")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role", back_populates="users")
    department = relationship("Department", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")
    approvals = relationship("Approval", back_populates="reviewed_by_user")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False) # e.g. LOGIN, OPTIMIZE_BLOCKS, APPROVE_BLOCK, REJECT_BLOCK
    entity_type = Column(String(50), nullable=True) # BLOCK, PLAN, DEFECT
    entity_id = Column(Integer, nullable=True)
    change_details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")

