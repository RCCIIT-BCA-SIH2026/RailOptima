from fastapi import APIRouter

from backend.app.api.v1.endpoints import (
    auth,
    analytics,
    defects,
    maintenance,
    corridors,
    trains,
    optimization,
    blocks,
    approvals,
    simulation,
    integrations,
    audit,
    assets,
    resources,
    alerts,
    reports,
    ai_priority,
    ai_recommendations,
    conflicts,
    chatbot,
    mongodb_endpoint,
    asset_prognostics,
    sla,
    whatsapp,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Roles"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Dashboard & Analytics"])
api_router.include_router(defects.router, prefix="/defects", tags=["Defects Management"])
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["Maintenance Tasks"])
api_router.include_router(corridors.router, prefix="/corridors", tags=["Corridors & Sections"])
api_router.include_router(trains.router, prefix="/trains", tags=["Train Operations & Timetable"])
api_router.include_router(optimization.router, prefix="/optimization", tags=["AI Block Optimization"])
api_router.include_router(blocks.router, prefix="/blocks", tags=["Block Plans & Schedules"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["Officer Approval Workflow"])
api_router.include_router(simulation.router, prefix="/simulation", tags=["What-If Sandbox"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["Mock Railway Systems"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Logs"])
api_router.include_router(assets.router, prefix="/assets", tags=["Assets Registry"])
api_router.include_router(resources.router, prefix="/resources", tags=["Machines & Labor Resources"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Safety Alerts & Speed Restrictions"])
api_router.include_router(reports.router, prefix="/reports", tags=["Executive Analytics & Reports"])
api_router.include_router(ai_priority.router, prefix="/ai", tags=["AI Maintenance Priority Engine"])
api_router.include_router(ai_recommendations.router, prefix="/ai/recommendations", tags=["AI Governance & Approval Workflow"])
api_router.include_router(conflicts.router, prefix="/conflicts", tags=["Conflict Detection & Resolution"])
api_router.include_router(conflicts.coordination_router, prefix="/coordination", tags=["Multi-Department Coordination"])
api_router.include_router(chatbot.router, prefix="/chatbot", tags=["RAG Agentic AI Assistant"])
api_router.include_router(mongodb_endpoint.router, prefix="/mongodb", tags=["MongoDB Atlas Cloud Integration"])
api_router.include_router(asset_prognostics.router, prefix="/ai/prognostics", tags=["Asset Prognostics DNN Engine"])
api_router.include_router(asset_prognostics.router, prefix="/asset-prognostics", tags=["Asset Prognostics DNN Engine"])
api_router.include_router(sla.router, prefix="/ai/sla", tags=["SLA Compliance Policy Engine"])
api_router.include_router(sla.router, prefix="/sla", tags=["SLA Compliance Policy Engine"])
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["WhatsApp Field Crew Dispatcher & Dynamic Re-Sequencer"])






