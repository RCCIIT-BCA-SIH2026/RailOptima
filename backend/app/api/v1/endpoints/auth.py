from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user, normalize_role, get_user_department_code
from backend.app.core.config import settings
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.models import User, Role, Department, AuditLog
from backend.app.schemas import Token, UserResponse, UserLogin, UserRegister, LogoutResponse

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    User authentication endpoint.
    Accepts both application/json ({"username": "...", "password": "..."})
    and application/x-www-form-urlencoded (OAuth2 form-data).
    """
    username = ""
    password = ""
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            body = await request.json()
            username = body.get("username", "").strip()
            password = body.get("password", "")
        except Exception:
            pass
    else:
        try:
            form = await request.form()
            username = form.get("username", "")
            password = form.get("password", "")
            if isinstance(username, str):
                username = username.strip()
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required"
        )

    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated")

    role_name = user.role.name if user.role else "Supervisor"
    canonical_role = normalize_role(role_name)
    dept_code = get_user_department_code(user)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=user.username,
        role=canonical_role,
        department=dept_code,
        expires_delta=access_token_expires
    )

    # Log to audit trail
    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        entity_type="USER",
        entity_id=user.id,
        change_details={"username": user.username, "role": role_name, "canonical_role": canonical_role}
    )
    db.add(audit)
    db.commit()

    user_payload = {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": canonical_role,
        "system_role": role_name,
        "canonical_role": canonical_role,
        "department": dept_code or "ALL"
    }

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role_name,
        "canonical_role": canonical_role,
        "department": dept_code or "ALL",
        "username": user.username,
        "full_name": user.full_name,
        "user": user_payload
    }

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new user with role and department assignment.
    Hashes password with bcrypt before storage.
    """
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{user_in.username}' already registered"
        )
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{user_in.email}' already registered"
        )

    # Lookup role
    role = db.query(Role).filter(Role.name == user_in.role_name).first()
    if not role:
        role = db.query(Role).filter(Role.name == "Supervisor").first()

    # Lookup department
    dept = None
    if user_in.department_code:
        dept = db.query(Department).filter(Department.code == user_in.department_code).first()

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role_id=role.id if role else None,
        department_id=dept.id if dept else None,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    audit = AuditLog(
        user_id=new_user.id,
        action="USER_REGISTERED",
        entity_type="USER",
        entity_id=new_user.id,
        change_details={"username": new_user.username, "role": role.name if role else "User"}
    )
    db.add(audit)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role.name if new_user.role else "User",
        "department": new_user.department.code if new_user.department else None,
        "is_active": new_user.is_active
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated profile of the currently logged-in user."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.name if current_user.role else "User",
        "department": current_user.department.code if current_user.department else None,
        "is_active": current_user.is_active
    }

@router.post("/logout", response_model=LogoutResponse)
def logout(
    request: Request,
    db: Session = Depends(get_db)
):
    """Logs out user and registers audit trail entry."""
    auth_header = request.headers.get("authorization", "")
    username = "Anonymous"
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            from jose import jwt
            secret = getattr(settings, "JWT_SECRET", None) or settings.SECRET_KEY
            payload = jwt.decode(token, secret, algorithms=[settings.ALGORITHM])
            sub = payload.get("sub")
            if sub:
                user = db.query(User).filter(User.username == sub).first()
                if user:
                    username = user.username
                    audit = AuditLog(
                        user_id=user.id,
                        action="USER_LOGOUT",
                        entity_type="USER",
                        entity_id=user.id,
                        change_details={"username": user.username}
                    )
                    db.add(audit)
                    db.commit()
        except Exception:
            pass

    return {
        "message": f"User {username} successfully logged out.",
        "status": "success"
    }
