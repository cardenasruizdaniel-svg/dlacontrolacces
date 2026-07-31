import logging
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from app.core.deps import CurrentUser, DbSession, get_current_user
from app.modules.auth.application.service import AuthService
from app.modules.auth.infrastructure.repositories import (
    AuditRepository,
    SessionRepository,
    UserRepository,
)
from app.modules.auth.presentation.schemas import (
    LoginRequest,
    MFAEnableResponse,
    MFAVerifyRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserListResponse,
    UserResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_auth_service(db: DbSession) -> AuthService:
    return AuthService(
        user_repo=UserRepository(db),
        session_repo=SessionRepository(db),
        audit_repo=AuditRepository(db),
        db=db,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: DbSession,
                platform: str = Query("web")) -> TokenResponse:
    try:
        # Rate limiting
        client_ip = request.client.host if request.client else "unknown"
        from app.main import login_limiter
        if login_limiter.is_rate_limited(f"login:{client_ip}"):
            raise HTTPException(status_code=429, detail="Demasiados intentos de inicio de sesión.")
        if login_limiter.is_rate_limited(f"login:{body.email}"):
            raise HTTPException(status_code=429, detail="Demasiados intentos para esta cuenta.")
        logger.info(f"Login attempt: email={body.email!r} ip={client_ip} platform={platform}")
        service = get_auth_service(db)
        result = await service.login(
            email=body.email,
            password=body.password,
            platform=platform,
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent"),
        )
        if result.get("user"):
            logger.info(f"Login success: user={result['user'].get('email')}")
        return TokenResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"UNHANDLED LOGIN ERROR: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en inicio de sesión: {str(e)}")


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, request: Request, db: DbSession, current_user: CurrentUser) -> TokenResponse:
    """Register a new user. Requires admin authentication."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only superusers can create new accounts")
    service = get_auth_service(db)
    result = await service.register(
        email=body.email, username=body.username, password=body.password, full_name=body.full_name, company_id=body.company_id
    )
    return TokenResponse(**result)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: DbSession) -> TokenResponse:
    service = get_auth_service(db)
    result = await service.refresh_token(body.refresh_token)
    return TokenResponse(**result)


@router.post("/mfa/verify", response_model=TokenResponse)
async def verify_mfa(body: MFAVerifyRequest, db: DbSession) -> TokenResponse:
    service = get_auth_service(db)
    result = await service.verify_mfa(temp_token=body.temp_token, code=body.code)
    return TokenResponse(**result)


@router.post("/mfa/enable", response_model=MFAEnableResponse)
async def enable_mfa(current_user: CurrentUser, db: DbSession) -> MFAEnableResponse:
    service = get_auth_service(db)
    result = await service.enable_mfa(current_user.id)
    return MFAEnableResponse(**result)


@router.post("/logout")
async def logout(current_user: CurrentUser, db: DbSession) -> dict:
    from sqlalchemy import select
    from app.shared.database.models_auth import User
    employee_id = current_user.id
    result = await db.execute(select(User).where(User.employee_id == employee_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    user_id = user.id if user else None
    if user_id:
        service = get_auth_service(db)
        await service.logout(user_id)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        is_active=current_user.status == "active",
        is_superuser=current_user.is_superuser,
        mfa_enabled=current_user.mfa_enabled,
        company_id=current_user.company_id,
        role_id=current_user.role_id,
    )
