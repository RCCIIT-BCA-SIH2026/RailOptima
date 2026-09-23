from backend.app.core.database import Base
from backend.app.models.user import Role, Department, User, AuditLog
from backend.app.models.infrastructure import Corridor, RailwaySection
from backend.app.models.asset import Asset, AssetHistory
from backend.app.models.defect import Defect, MaintenanceTask, AIPriorityRecommendation
from backend.app.models.train import Train, TrainSchedule, TrainDelay
from backend.app.models.block import BlockPlan, Block, BlockTask, Conflict, Approval, AIRecommendation
from backend.app.models.resource import Resource, ResourceAssignment
from backend.app.models.operations import Alert, WhatIfScenario, IntegrationLog
from backend.app.models.whatsapp import WhatsAppCrewSubscriber, WhatsAppMessageLog

__all__ = [
    "Base",
    # Users & Org
    "Role",
    "Department",
    "User",
    "AuditLog",
    # Infrastructure
    "Corridor",
    "RailwaySection",
    # Assets
    "Asset",
    "AssetHistory",
    # Defects & Maintenance
    "Defect",
    "MaintenanceTask",
    "AIPriorityRecommendation",
    # Trains & Schedules
    "Train",
    "TrainSchedule",
    "TrainDelay",
    # Blocks & Optimization
    "BlockPlan",
    "Block",
    "BlockTask",
    "Conflict",
    "Approval",
    "AIRecommendation",
    # Resources
    "Resource",
    "ResourceAssignment",
    # Operations & Telemetry
    "Alert",
    "WhatIfScenario",
    "IntegrationLog",
    # WhatsApp Dispatcher
    "WhatsAppCrewSubscriber",
    "WhatsAppMessageLog",
]


