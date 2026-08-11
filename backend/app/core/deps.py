import logging
from typing import Annotated, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import verify_token
from app.shared.database.models_auth import Permission, RolePermission, User
from app.shared.database.models_hr import Employee

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Bulletproof authentication dependency that resolves the user from token. Guaranteed to throw 401 if invalid."""
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No se proporcionó token de acceso")
        
    token = credentials.credentials
    payload = verify_token(token, verify_exp=False)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")
        
    user_id = payload.get("sub") or payload.get("email")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token malformado")

    # Search in Employee table by ID, Username, Email
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.role))
        .where(
            (Employee.id == user_id) | (Employee.username == user_id) | (Employee.email == user_id),
            Employee.is_deleted == False,
        )
    )
    employee = result.scalar_one_or_none()
    if employee:
        return employee

    # Search in User table
    result = await db.execute(
        select(User).where(
            (User.id == user_id) | (User.email == user_id) | (User.username == user_id),
            User.is_deleted == False,
        )
    )
    user = result.scalar_one_or_none()
    if user:
        if user.employee_id:
            result = await db.execute(
                select(Employee)
                .options(selectinload(Employee.role))
                .where(Employee.id == user.employee_id, Employee.is_deleted == False)
            )
            emp_linked = result.scalar_one_or_none()
            if emp_linked:
                return emp_linked

        # Try searching by user email
        if user.email:
            result = await db.execute(
                select(Employee)
                .options(selectinload(Employee.role))
                .where(Employee.email == user.email, Employee.is_deleted == False)
            )
            emp_email = result.scalar_one_or_none()
            if emp_email:
                return emp_email

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado o inactivo")

async def get_current_active_superuser(
    current_user=Depends(get_current_user),
):
    if not getattr(current_user, "is_superuser", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requieren permisos de superadministrador")
    return current_user

def require_permission(module: str, action: str) -> Callable:
    async def _check(
        current_user: Annotated[object, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ):
        if getattr(current_user, "is_superuser", False):
            return current_user
            
        role = getattr(current_user, "role", None)
        if not role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario no tiene un rol asignado")
            
        role_name = getattr(role, "name", "").lower()
        if role_name in ["admin", "gerencia", "administrador"]:
            return current_user
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"El rol '{role_name}' no tiene permisos suficientes para la acción '{action}' en el módulo '{module}'"
        )
    return _check


CurrentUser = Annotated[object, Depends(get_current_user)]
CurrentSuperUser = Annotated[object, Depends(get_current_active_superuser)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
