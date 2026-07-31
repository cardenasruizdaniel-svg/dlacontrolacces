from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database.models_auth import AuditLog, User, UserSession


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email, User.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.username == username, User.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> User:
        user = User(**kwargs)
        self.db.add(user)
        await self.db.flush()
        return user

    async def update(self, user_id: str, **kwargs: dict) -> User | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(User).where(User.id == user_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(user_id)

    async def list_users(
        self, skip: int = 0, limit: int = 25, search: str | None = None
    ) -> tuple[list[User], int]:
        query = select(User).where(User.is_deleted == False)
        count_query = select(User).where(User.is_deleted == False)
        if search:
            search_filter = User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)
        total_result = await self.db.execute(count_query)
        total = len(total_result.all())
        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all()), total


class SessionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, **kwargs: dict) -> UserSession:
        session = UserSession(**kwargs)
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_active_by_user(self, user_id: str) -> list[UserSession]:
        result = await self.db.execute(
            select(UserSession).where(
                UserSession.user_id == user_id,
                UserSession.is_active == True,
                UserSession.is_deleted == False,
            )
        )
        return list(result.scalars().all())

    async def get_active_by_employee(self, employee_id: str) -> list[UserSession]:
        result = await self.db.execute(
            select(UserSession).where(
                UserSession.employee_id == employee_id,
                UserSession.is_active == True,
                UserSession.is_deleted == False,
            )
        )
        return list(result.scalars().all())

    async def deactivate(self, session_id: str) -> None:
        await self.db.execute(
            update(UserSession)
            .where(UserSession.id == session_id)
            .values(is_active=False)
        )

    async def deactivate_all_user(self, user_id: str) -> None:
        await self.db.execute(
            update(UserSession)
            .where(UserSession.user_id == user_id, UserSession.is_active == True)
            .values(is_active=False)
        )


class AuditRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log(
        self,
        *,
        user_id: str | None = None,
        employee_id: str | None = None,
        action: str,
        module: str,
        entity_type: str | None = None,
        entity_id: str | None = None,
        old_values: str | None = None,
        new_values: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        platform: str | None = None,
        status: str = "success",
    ) -> AuditLog:
        # Safeguard FK constraints: check if user_id or employee_id exists in DB
        valid_user_id = None
        valid_employee_id = None

        if user_id:
            user_res = await self.db.execute(select(User.id).where(User.id == user_id))
            if user_res.scalar_one_or_none():
                valid_user_id = user_id
            elif not employee_id:
                # Check if passed user_id is actually an employee_id
                from app.shared.database.models_hr import Employee
                emp_res = await self.db.execute(select(Employee.id).where(Employee.id == user_id))
                if emp_res.scalar_one_or_none():
                    valid_employee_id = user_id

        if employee_id and not valid_employee_id:
            from app.shared.database.models_hr import Employee
            emp_res = await self.db.execute(select(Employee.id).where(Employee.id == employee_id))
            if emp_res.scalar_one_or_none():
                valid_employee_id = employee_id

        audit = AuditLog(
            user_id=valid_user_id,
            employee_id=valid_employee_id,
            action=action,
            module=module,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            platform=platform,
            status=status,
        )
        self.db.add(audit)
        await self.db.flush()
        return audit

    async def list_logs(
        self,
        skip: int = 0,
        limit: int = 25,
        user_id: str | None = None,
        module: str | None = None,
        action: str | None = None,
    ) -> tuple[list[AuditLog], int]:
        query = select(AuditLog).where(AuditLog.is_deleted == False)
        if user_id:
            query = query.where(AuditLog.user_id == user_id)
        if module:
            query = query.where(AuditLog.module == module)
        if action:
            query = query.where(AuditLog.action == action)
        result = await self.db.execute(query.offset(skip).limit(limit).order_by(AuditLog.created_at.desc()))
        return list(result.scalars().all()), 0
