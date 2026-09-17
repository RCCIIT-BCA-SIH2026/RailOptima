from typing import Generator, Optional, List, Union
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import SessionLocal
from backend.app.models import User, Role, Department
from backend.app.schemas import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def normalize_role(role_name: Optional[str]) -> str:
    """Normalizes DB role names or aliases to canonical roles: ADMIN, DRM, ENGINEERING, TRD, S&T, CONTROL_OFFICE, SUPERVISOR."""
    if not role_name:
        return "UNKNOWN"
    r = role_name.strip().upper().replace(" ", "_")
    if r in ["ADMIN", "ADMINISTRATOR", "SUPERADMIN", "ROOT"]:
        return "ADMIN"
    if r in ["DRM", "DIVISIONAL_RAILWAY_MANAGER"]:
        return "DRM"
    if r in ["SR_DEN", "ENGINEERING", "CIVIL", "PWAY", "P_WAY", "DEN"]:
        return "ENGINEERING"
    if r in ["SR_DEE", "TRD", "TRACTION", "ELECTRICAL", "OHE", "DEE"]:
        return "TRD"
    if r in ["SR_DSTE", "S&T", "SNT", "SIGNAL", "TELECOM", "DSTE"]:
        return "S&T"
    if r in ["SR_DOM", "CONTROL_OFFICE", "OPERATIONS", "OPT", "TRAFFIC", "DOM"]:
        return "CONTROL_OFFICE"
    if r in ["SUPERVISOR", "SSE"]:
        return "SUPERVISOR"
    return r

def normalize_department(dept_code: Optional[str]) -> Optional[str]:
    """Normalizes department code to ENG, TRD, SNT, or OPT."""
    if not dept_code:
        return None
    d = dept_code.strip().upper().replace(" ", "").replace("_", "")
    if d in ["ENG", "CIVIL", "PWAY"]:
        return "ENG"
    if d in ["TRD", "OHE", "ELEC", "ELECTRICAL", "TRACTION"]:
        return "TRD"
    if d in ["SNT", "S&T", "SIGNAL", "TELECOM"]:
        return "SNT"
    if d in ["OPT", "OPERATIONS", "TRAFFIC", "CONTROL", "HQ"]:
        return "OPT"
    return d

def get_user_department_code(user: Optional[User]) -> Optional[str]:
    """Resolves department code for a user."""
    if not user:
        return None
    if user.department and user.department.code:
        return normalize_department(user.department.code)
    # Role-based fallback
    role_norm = normalize_role(user.role.name if user.role else "")
    if role_norm == "ENGINEERING":
        return "ENG"
    if role_norm == "TRD":
        return "TRD"
    if role_norm == "S&T":
        return "SNT"
    if role_norm in ["CONTROL_OFFICE", "DRM"]:
        return "OPT"
    return None

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        secret = getattr(settings, "JWT_SECRET", None) or settings.SECRET_KEY
        payload = jwt.decode(token, secret, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=payload.get("role"), department=payload.get("department"))
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")
    return user

def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Extracts authenticated user if Authorization header is present.
    Returns None if no Authorization header is provided.
    Raises 401 if an invalid or expired token is provided.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1].strip()
    if not token:
        return None
    try:
        secret = getattr(settings, "JWT_SECRET", None) or settings.SECRET_KEY
        payload = jwt.decode(token, secret, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
        user = db.query(User).filter(User.username == username).first()
        if user and not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is inactive")
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def require_roles(allowed_roles: List[str]):
    """Role-based authorization dependency with canonical role normalization."""
    normalized_allowed = {normalize_role(r) for r in allowed_roles}
    raw_allowed = {r.lower() for r in allowed_roles}

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_raw = current_user.role.name if current_user.role else ""
        user_norm = normalize_role(user_raw)
        
        # ADMIN is always permitted
        if user_norm == "ADMIN" or "admin" in user_raw.lower():
            return current_user

        if user_norm in normalized_allowed or user_raw.lower() in raw_allowed:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Operation not permitted. Required roles: {allowed_roles}, your role: {user_raw}"
        )
    return role_checker

def check_department_access(target_dept: Optional[str], current_user: Optional[User]) -> None:
    """
    Enforces department isolation:
    - If user is ADMIN, global access is permitted.
    - If user is NOT ADMIN, user can ONLY access their own department's data.
    - Raises HTTP 403 Forbidden on foreign department requests.
    """
    if not current_user or not target_dept:
        return

    user_raw = current_user.role.name if current_user.role else ""
    user_norm = normalize_role(user_raw)
    if user_norm == "ADMIN" or "admin" in user_raw.lower():
        return

    user_dept = get_user_department_code(current_user)
    norm_target = normalize_department(target_dept)

    if norm_target and user_dept and norm_target != user_dept:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Department isolation violation: User from {user_dept} cannot access {norm_target} department data."
        )

def get_effective_department_filter(current_user: Optional[User], requested_dept: Optional[str] = None) -> Optional[str]:
    """
    Returns the department code to filter queries by:
    - If user is not authenticated:
      - In legacy test execution (no token provided), allows requested_dept if provided, else None.
    - If user is ADMIN:
      - Can view any requested department, or None (all departments).
    - If user is NOT ADMIN (ENGINEERING, TRD, S&T, CONTROL_OFFICE, DRM, SUPERVISOR):
      - Database queries MUST automatically be filtered by user_dept.
      - If requested_dept is provided and differs from user_dept (or requested_dept == 'ALL'):
        Raises HTTP 403 Forbidden.
      - Never trusts frontend department parameter to expose other departments.
      - Returns user_dept.
    """
    if not current_user:
        return normalize_department(requested_dept) if requested_dept and requested_dept != "ALL" else None

    user_raw = current_user.role.name if current_user.role else ""
    user_norm = normalize_role(user_raw)
    user_dept = get_user_department_code(current_user)

    # ADMIN can see all departments, or filter by requested department
    if user_norm == "ADMIN" or "admin" in user_raw.lower():
        if requested_dept and requested_dept != "ALL":
            return normalize_department(requested_dept)
        return None

    # For ALL non-admin users:
    # 1. If foreign department or "ALL" was requested by non-admin -> 403 Forbidden
    if requested_dept:
        norm_req = normalize_department(requested_dept)
        if requested_dept.upper() == "ALL" or (norm_req and norm_req != user_dept):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Department isolation violation: Non-admin user from {user_dept} cannot access {requested_dept} department data."
            )

    # 2. Automatically enforce user's department for all non-admin users
    return user_dept


