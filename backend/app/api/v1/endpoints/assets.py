from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import (
    get_db, 
    get_current_user_optional, 
    get_effective_department_filter, 
    check_department_access,
    get_user_department_code,
    normalize_role
)
from backend.app.models import Asset, Department, RailwaySection, User

router = APIRouter()

@router.get("")
def get_assets(
    department_code: Optional[str] = Query(None, description="Filter by department code (ENG, SNT, TRD)"),
    department_id: Optional[int] = Query(None, description="Filter by department ID (1=ENG, 2=SNT, 3=TRD)"),
    status: Optional[str] = Query(None, description="Filter by status (Operational, Degraded, Critical)"),
    search: Optional[str] = Query(None, description="Search by asset code or name"),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Returns railway assets inventory with joined department and section metadata and department RBAC."""
    query = db.query(Asset).join(Department).join(RailwaySection)

    # 1. Never trust department_id supplied by frontend: validate against user department
    if department_id is not None:
        dept_obj = db.query(Department).filter(Department.id == department_id).first()
        if not dept_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Department with ID {department_id} not found.")
        check_department_access(dept_obj.code, current_user)
        department_code = dept_obj.code

    # 2. Enforce effective department filter:
    # Non-admin users are automatically scoped to their department; requesting foreign returns 403
    eff_dept = get_effective_department_filter(current_user, department_code)
    if eff_dept:
        query = query.filter(Department.code == eff_dept)
    if status:
        query = query.filter(Asset.status == status)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter((Asset.asset_code.ilike(search_fmt)) | (Asset.asset_name.ilike(search_fmt)))

    assets = query.limit(limit).all()

    results = []
    for a in assets:
        results.append({
            "id": a.id,
            "asset_code": a.asset_code,
            "asset_name": a.asset_name,
            "asset_type": a.asset_type,
            "department_code": a.department.code if a.department else "ENG",
            "department_name": a.department.name if a.department else "Civil Engineering",
            "section_code": a.section.section_code if a.section else "SEC-01",
            "km_location": a.km_location,
            "health_score": a.health_score,
            "status": a.status,
            "installation_date": a.installation_date.isoformat() if a.installation_date else None,
            "data_mode": "SIMULATED DEMO DATA"
        })

    return {
        "total_returned": len(results),
        "data_mode": "SIMULATED DEMO DATA",
        "assets": results
    }

@router.get("/{asset_id}")
def get_asset_detail(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Retrieves full details of a specific asset with department RBAC protection (403 on foreign department)."""
    asset = db.query(Asset).join(Department).join(RailwaySection).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID {asset_id} not found."
        )
    check_department_access(asset.department.code if asset.department else None, current_user)
    return {
        "id": asset.id,
        "asset_code": asset.asset_code,
        "asset_name": asset.asset_name,
        "asset_type": asset.asset_type,
        "department_code": asset.department.code if asset.department else "ENG",
        "department_name": asset.department.name if asset.department else "Civil Engineering",
        "section_code": asset.section.section_code if asset.section else "SEC-01",
        "km_location": asset.km_location,
        "health_score": asset.health_score,
        "status": asset.status,
        "installation_date": asset.installation_date.isoformat() if asset.installation_date else None,
        "data_mode": "SIMULATED DEMO DATA"
    }

