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
    ChangePasswordRequest,
    FirstLoginPasswordRequest,
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
async def get_me(current_user: CurrentUser, db: DbSession) -> UserResponse:
    role_obj = getattr(current_user, "role", None)
    role_name = getattr(role_obj, "name", None) or getattr(role_obj, "display_name", None)
    if not role_name and getattr(current_user, "is_superuser", False):
        role_name = "admin"
    platform_access = getattr(current_user, "platform_access", "both") or "both"
    first_name = getattr(current_user, "first_name", "") or ""
    last_name = getattr(current_user, "last_name", "") or ""
    full_name = getattr(current_user, "full_name", None) or f"{first_name} {last_name}".strip() or "Usuario"

    permissions = []
    is_super = getattr(current_user, "is_superuser", False) or (role_name and role_name.lower() in ("admin", "super admin", "superadmin", "administrador", "gerencia"))
    if is_super:
        permissions = ["*"]
    elif getattr(current_user, "role_id", None):
        try:
            from app.shared.database.models_auth import Permission, RolePermission
            from sqlalchemy import select
            perm_res = await db.execute(
                select(Permission.module, Permission.action)
                .join(RolePermission, RolePermission.permission_id == Permission.id)
                .where(RolePermission.role_id == current_user.role_id, Permission.is_deleted == False)
            )
            perms_tuples = perm_res.all()
            for mod, act in perms_tuples:
                permissions.append(f"{mod}:{act}")
                if mod not in permissions:
                    permissions.append(mod)
        except Exception:
            pass

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=getattr(current_user, "username", current_user.email),
        full_name=full_name,
        is_active=getattr(current_user, "status", "active") == "active" or getattr(current_user, "is_active", True),
        is_superuser=bool(getattr(current_user, "is_superuser", False)),
        mfa_enabled=getattr(current_user, "mfa_enabled", False),
        company_id=getattr(current_user, "company_id", None),
        role_id=getattr(current_user, "role_id", None),
        role={"name": role_name} if role_name else None,
        role_name=role_name,
        platform_access=platform_access,
        permissions=permissions,
    )


@router.post("/first-login-password")
async def change_first_login_password(
    body: FirstLoginPasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    service = get_auth_service(db)
    return await service.change_first_login_password(
        user_id=current_user.id,
        new_password=body.new_password,
        confirm_password=body.confirm_password,
    )


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    service = get_auth_service(db)
    return await service.change_password(
        user_id=current_user.id,
        current_password=body.current_password,
        new_password=body.new_password,
        confirm_password=body.confirm_password,
    )


@router.get("/check-username")
async def check_username(
    username: str = Query(..., min_length=1),
    exclude_id: str | None = Query(None),
    db: DbSession = None,
) -> dict:
    service = get_auth_service(db)
    return await service.check_username_availability(username=username, exclude_id=exclude_id)
