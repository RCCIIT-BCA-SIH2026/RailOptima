"""
RailOptima Chatbot API Endpoints
================================
Exposes RAG Agentic AI conversation endpoints, quick prompt suggestions,
and direct live tool dispatchers.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user_optional
from backend.app.models import User
from backend.app.services.rag_agent_service import rag_agent_service

router = APIRouter()

class ChatMessage(BaseModel):
    role: str # "user" or "model" / "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None
    department: Optional[str] = None
    role: Optional[str] = None

class ToolCallRequest(BaseModel):
    tool_name: str
    arguments: Optional[Dict[str, Any]] = None

@router.post("/chat")
def chat_with_agent(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Main RAG Agentic Chat endpoint.
    Orchestrates Gemini LLM, Pinecone memory, live Database queries, and ML Microservice.
    """
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    hist_dicts = []
    if payload.history:
        for h in payload.history:
            hist_dicts.append({"role": h.role, "content": h.content})

    user_role = payload.role or (current_user.role.name if (current_user and current_user.role) else "DRM")
    user_dept = payload.department or (current_user.department.code if (current_user and current_user.department) else "ENG")

    result = rag_agent_service.chat(
        user_message=payload.message.strip(),
        history=hist_dicts,
        department=user_dept,
        role=user_role
    )

    return result

@router.get("/suggestions")
def get_prompt_suggestions():
    """Returns contextual quick-prompt suggestions for the floating chatbot."""
    return {
        "suggestions": [
            {
                "id": "p0_defects",
                "title": "🚨 Urgent Safety Defects",
                "prompt": "Show all critical track defects and active speed restrictions across our sections",
                "category": "safety"
            },
            {
                "id": "cp_sat_solve",
                "title": "📅 Plan Maintenance Schedule",
                "prompt": "Generate an optimized maintenance block plan for the next 24 hours",
                "category": "optimization"
            },
            {
                "id": "shadow_synergy",
                "title": "⚡ Joint Department Coordination",
                "prompt": "How does joint blocking between Engineering, Electrical and Signal departments save train delays?",
                "category": "coordination"
            },
            {
                "id": "train_delays",
                "title": "🚆 Train Delays & Punctuality",
                "prompt": "List delayed passenger and freight trains with current delay minutes",
                "category": "traffic"
            },
            {
                "id": "predictive_maintenance",
                "title": "🛠️ Track Condition Assessment",
                "prompt": "Evaluate track wear and remaining service life for heavy traffic routes",
                "category": "maintenance"
            },
            {
                "id": "approval_queue",
                "title": "📋 Pending Approvals",
                "prompt": "Show the list of maintenance blocks currently awaiting officer review and approval",
                "category": "governance"
            }
        ]
    }

@router.get("/system-summary")
def get_chatbot_system_summary(db: Session = Depends(get_db)):
    """Returns real-time KPI metrics for the chatbot header snapshot."""
    return rag_agent_service.execute_tool("get_live_system_summary", {}, db)

@router.post("/execute-tool")
def execute_direct_tool(
    payload: ToolCallRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Allows client to directly invoke an agentic tool."""
    return rag_agent_service.execute_tool(
        tool_name=payload.tool_name,
        arguments=payload.arguments or {},
        db=db
    )
