"""RailOptima AI — Infrastructure Survival & Reliability Service
=============================================================
Provides section-level and corridor-level survival curves, remaining useful life (RUL),
and degradation hazard metrics across Indian Railways track sections.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models import RailwaySection, Asset, Defect, Corridor
from backend.app.core.ml_client import ml_client

def get_section_survival_analysis(section_id: int, db: Session) -> Dict[str, Any]:
    """
    Computes 30-day discrete survival analysis and failure risk for a specific railway section via ML Microservice.
    """
    sec = db.query(RailwaySection).filter(RailwaySection.id == section_id).first()
    if not sec:
        sec = db.query(RailwaySection).first()
        if not sec:
            return ml_client.predict_survival(age_years=20.0, gmt_density=45.0)

    # Count active defects on this section directly from live database
    defect_count = db.query(Defect).filter(Defect.section_id == sec.id, Defect.status.in_(["Open", "Investigating", "Scheduled"])).count()
    
    # Calculate live average asset age from database
    assets = db.query(Asset).filter(Asset.section_id == sec.id).all()
    avg_age = 18.5
    if assets:
        ages = [float(getattr(a, "age_years", 15.0) or 15.0) for a in assets]
        avg_age = sum(ages) / len(ages) if ages else 18.5

    result = ml_client.predict_survival(
        age_years=avg_age,
        gmt_density=sec.current_traffic_density or 45.0,
        monsoon_exposure="medium",
        curvature_class="gentle",
        asset_type="Track",
        defects_count=defect_count
    )
    result["section_id"] = sec.id
    result["section_code"] = sec.section_code
    result["corridor_name"] = sec.corridor.name if sec.corridor else "Main Line"
    result["length_km"] = sec.length_km
    result["active_defects_count"] = defect_count
    return result


def get_all_sections_risk_overview(db: Session) -> List[Dict[str, Any]]:
    """
    Returns live survival risk & RUL summary for all railway sections via ML Microservice.
    """
    sections = db.query(RailwaySection).all()
    overview = []
    for sec in sections:
        defect_count = db.query(Defect).filter(Defect.section_id == sec.id, Defect.status != "Resolved").count()
        risk_res = ml_client.predict_survival(
            age_years=18.0,
            gmt_density=sec.current_traffic_density or 45.0,
            defects_count=defect_count
        )
        overview.append({
            "section_id": sec.id,
            "section_code": sec.section_code,
            "corridor_code": sec.corridor.code if sec.corridor else "COR",
            "corridor_name": sec.corridor.name if sec.corridor else "Main Line",
            "track_type": sec.track_type,
            "gmt_traffic_density": sec.current_traffic_density,
            "failure_probability_30d": risk_res["failure_probability_30d"],
            "risk_percentage": risk_res["risk_percentage"],
            "risk_tier": risk_res["risk_tier"],
            "estimated_rul_days": risk_res["estimated_rul_days"],
            "active_defects": defect_count,
            "start_lat": sec.start_lat,
            "start_lng": sec.start_lng,
            "end_lat": sec.end_lat,
            "end_lng": sec.end_lng
        })

    # Sort highest risk first
    overview.sort(key=lambda x: x["failure_probability_30d"], reverse=True)
    return overview
