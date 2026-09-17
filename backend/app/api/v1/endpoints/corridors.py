from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models import Corridor, RailwaySection, Block
from backend.app.schemas import CorridorResponse, SectionResponse

router = APIRouter()

@router.get("", response_model=List[CorridorResponse])
def get_corridors(db: Session = Depends(get_db)):
    return db.query(Corridor).all()

@router.get("/sections", response_model=List[SectionResponse])
def get_sections(
    corridor_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(RailwaySection)
    if corridor_id:
        query = query.filter(RailwaySection.corridor_id == corridor_id)
    return query.all()

@router.get("/sections/{section_id}/status")
def get_section_status(section_id: int, db: Session = Depends(get_db)):
    sec = db.query(RailwaySection).filter(RailwaySection.id == section_id).first()
    if not sec:
        return {"error": "Section not found"}
    
    active_blocks = db.query(Block).filter(
        Block.section_id == section_id,
        Block.status.in_(["In_Progress", "Approved"])
    ).count()

    return {
        "section_id": sec.id,
        "section_code": sec.section_code,
        "corridor": sec.corridor.name if sec.corridor else "",
        "length_km": sec.length_km,
        "max_permissible_speed": sec.max_permissible_speed,
        "line_capacity": sec.line_capacity,
        "active_blocks_count": active_blocks,
        "operational_status": "Maintenance Possession Active" if active_blocks > 0 else "Normal Train Running",
        "start_coords": [sec.start_lat, sec.start_lng],
        "end_coords": [sec.end_lat, sec.end_lng],
        "data_mode": "SIMULATED DEMO DATA"
    }

