from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.api.v1.api import api_router
from backend.app.api.v1.endpoints import auth, integrations, ai_priority, conflicts, blocks
from backend.app.api.v1.endpoints import asset_prognostics, sla

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="AI-Powered Automatic Block Planning System for Indian Railways (SIH26027 Prototype with Simulated Data).",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for prototype flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes under /api/v1 and direct /api/auth, /api/integrations, /api/ai, /api/conflicts, /api/coordination, /api/blocks aliases
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication & Roles"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["Railway Systems Integration (TMS/SMMS/TDMS/COA)"])
app.include_router(ai_priority.router, prefix="/api/ai", tags=["AI Maintenance Priority Engine"])
app.include_router(conflicts.router, prefix="/api/conflicts", tags=["Conflict Detection & Resolution"])
app.include_router(conflicts.coordination_router, prefix="/api/coordination", tags=["Multi-Department Coordination"])
app.include_router(blocks.router, prefix="/api/blocks", tags=["Block Plans & Schedules"])

# ── New: Asset Prognostics DNN (BlockFlow-inspired) ─────────────────────────
app.include_router(
    asset_prognostics.router,
    prefix="/api/ai/prognostics",
    tags=["Asset Prognostics DNN (Failure Prob + RUL + Delay Cascade)"],
)

# ── New: SLA Compliance & Escalation Policy (Pashupatastra-inspired) ────────
app.include_router(
    sla.router,
    prefix="/api/ai/sla",
    tags=["SLA Compliance & Escalation Policy"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)






@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "sih_problem_statement": settings.SIH_PROBLEM_CODE,
        "status": "Online",
        "data_mode": settings.DATA_MODE_LABEL,
        "documentation": "/docs"
    }

@app.get("/health")
def health_check():
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "database_type": engine.dialect.name,
        "ai_engine": "active",
        "optimizer": "active",
        "data_mode": settings.DATA_MODE_LABEL
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)

