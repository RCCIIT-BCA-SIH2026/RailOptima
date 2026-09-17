from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models import Resource, Department

router = APIRouter()

@router.get("")
def get_resources(
    department_code: Optional[str] = Query(None, description="Filter by department code"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    availability_status: Optional[str] = Query(None, description="Filter by availability"),
    db: Session = Depends(get_db)
):
    """Returns railway maintenance machines, special wagons, and gang labor resources."""
    query = db.query(Resource).join(Department)

    if department_code:
        query = query.filter(Department.code == department_code.upper())
    if resource_type:
        query = query.filter(Resource.resource_type == resource_type)
    if availability_status:
        query = query.filter(Resource.availability_status == availability_status)

    resources = query.all()

    results = []
    for r in resources:
        results.append({
            "id": r.id,
            "resource_code": r.resource_code,
            "resource_name": r.resource_name,
            "resource_type": r.resource_type,
            "base_station": r.base_station,
            "availability_status": r.availability_status,
            "department_code": r.department.code if r.department else "ENG",
            "department_name": r.department.name if r.department else "Civil Engineering",
            "data_mode": "SIMULATED DEMO DATA"
        })

    return {
        "total": len(results),
        "data_mode": "SIMULATED DEMO DATA",
        "resources": results
    }

