from fastapi import HTTPException, status

from app.modules.iam.infrastructure.repositories import (
    IAMAuditRepository,
    IAMPermissionRepository,
    IAMRoleRepository,
    IAMSessionRepository,
    IAMEmployeeRepository,
)


class IAMService:
    def __init__(self, db) -> None:
        self.role_repo = IAMRoleRepository(db)
        self.perm_repo = IAMPermissionRepository(db)
        self.session_repo = IAMSessionRepository(db)
        self.audit_repo = IAMAuditRepository(db)
        self.employee_repo = IAMEmployeeRepository(db)

    # --- Roles ---
    async def list_roles(self):
        roles = await self.role_repo.list_all()
        result = []
        for r in roles:
            pc = await self.role_repo.get_permission_count(r.id)
            uc = await self.role_repo.get_user_count(r.id)
            result.append({**r.__dict__, "permission_count": pc, "user_count": uc})
        return result

    async def get_role(self, role_id: str):
        role = await self.role_repo.get_by_id(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        pc = await self.role_repo.get_permission_count(role.id)
        uc = await self.role_repo.get_user_count(role.id)
        return {**role.__dict__, "permission_count": pc, "user_count": uc}

    async def create_role(self, name: str, display_name: str | None = None,
                          description: str | None = None, level: int = 0,
                          color: str | None = None, icon: str | None = None):
        existing = await self.role_repo.get_by_name(name)
        if existing:
            raise HTTPException(status_code=409, detail="Role name already exists")
        return await self.role_repo.create(
            name=name, display_name=display_name, description=description,
            level=level, color=color, icon=icon, is_active=True, is_system=False,
        )

    async def update_role(self, role_id: str, **kwargs):
        role = await self.role_repo.get_by_id(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        if role.is_system and kwargs.get("is_active") is False:
            raise HTTPException(status_code=400, detail="Cannot deactivate system role")
        return await self.role_repo.update(role_id, **kwargs)

    async def delete_role(self, role_id: str):
        role = await self.role_repo.get_by_id(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        if role.is_system:
            raise HTTPException(status_code=400, detail="Cannot delete system role")
        uc = await self.role_repo.get_user_count(role_id)
        if uc > 0:
            raise HTTPException(status_code=400, detail=f"Role has {uc} employees assigned")
        await self.role_repo.soft_delete(role_id)

    # --- Permissions ---
    async def list_permissions(self):
        perms = await self.perm_repo.list_all()
        if not perms:
            import uuid
            from app.shared.database.models_auth import Permission
            std_modules = [
                "dashboard", "employees", "contracts", "payroll", "clients",
                "scheduling", "geolocation", "access_control", "facial_recognition",
                "roles", "permissions", "reports", "ai_assistant", "settings",
                "users", "branches", "departments", "cost_centers", "dotaciones"
            ]
            std_actions = ["view", "create", "update", "delete", "export", "import", "approve", "manage"]
            for mod in std_modules:
                for act in std_actions:
                    p = Permission(
                        id=str(uuid.uuid4()),
                        module=mod,
                        action=act,
                        display_name=f"{act.capitalize()} {mod.capitalize()}",
                        description=f"Permiso para {act} en {mod}",
                        is_active=True,
                        is_deleted=False,
                    )
                    self.perm_repo.db.add(p)
            await self.perm_repo.db.flush()
            perms = await self.perm_repo.list_all()
        return perms

    async def get_permission_matrix(self):
        perms = await self.perm_repo.list_all()
        modules = sorted(set(p.module for p in perms))
        actions = sorted(set(p.action for p in perms))
        roles = await self.role_repo.list_all()
        roles_data = []
        for r in roles:
            rp_ids = await self.perm_repo.get_role_permissions(r.id)
            roles_data.append({
                "id": r.id,
                "name": r.name,
                "display_name": r.display_name,
                "permission_ids": rp_ids,
            })
        return {"modules": modules, "actions": actions, "roles": roles_data}

    async def get_role_permissions(self, role_id: str):
        role = await self.role_repo.get_by_id(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        return await self.perm_repo.get_role_permissions(role_id)

    async def set_role_permissions(self, role_id: str, permission_ids: list[str]):
        role = await self.role_repo.get_by_id(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        await self.perm_repo.set_role_permissions(role_id, permission_ids)
        return await self.perm_repo.get_role_permissions(role_id)

    # --- Sessions ---
    async def list_sessions(self, employee_id: str | None = None, page: int = 1, page_size: int = 25):
        skip = (page - 1) * page_size
        items, total = await self.session_repo.list_all(skip=skip, limit=page_size)
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }

    async def deactivate_session(self, session_id: str):
        await self.session_repo.deactivate(session_id)
        return {"message": "Session deactivated"}

    async def deactivate_all_user_sessions(self, employee_id: str):
        await self.session_repo.deactivate_all_user(employee_id)
        return {"message": "All sessions deactivated"}

    # --- Audit Logs ---
    async def list_audit_logs(self, page: int = 1, page_size: int = 25,
                               employee_id: str | None = None, module: str | None = None,
                               action: str | None = None):
        skip = (page - 1) * page_size
        items, total = await self.audit_repo.list_logs(
            skip=skip, limit=page_size, employee_id=employee_id, module=module, action=action
        )
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }

    # --- Employee Admin ---
    async def list_users_admin(self, page: int = 1, page_size: int = 25,
                                search: str | None = None, company_id: str | None = None,
                                account_status: str | None = None,
                                platform_access: str | None = None,
                                role_id: str | None = None):
        skip = (page - 1) * page_size
        employees, total = await self.employee_repo.list_employees(
            skip=skip, limit=page_size, search=search, company_id=company_id,
            account_status=account_status, platform_access=platform_access, role_id=role_id,
        )
        items = []
        for e in employees:
            role_name = None
            if e.role_id:
                r = await self.role_repo.get_by_id(e.role_id)
                role_name = r.name if r else None
            full_name = f"{e.first_name} {e.last_name}"
            items.append({
                "id": e.id, "email": e.email, "username": e.username,
                "full_name": full_name, "is_active": e.status == "active",
                "is_superuser": e.is_superuser, "role_id": e.role_id,
                "role_name": role_name, "company_id": e.company_id,
                "employee_id": e.id, "account_status": e.account_status,
                "platform_access": e.platform_access,
                "force_password_change": e.force_password_change,
                "first_login_completed": e.first_login_completed,
                "biometric_enrolled": e.biometric_enrolled,
                "app_status": e.app_status, "last_login": str(e.last_login) if e.last_login else None,
                "last_platform": e.last_platform,
                "failed_login_attempts": e.failed_login_attempts,
                "created_at": str(e.created_at) if e.created_at else None,
            })
        return {
            "items": items, "total": total, "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }

    async def update_user_admin(self, employee_id: str, **kwargs):
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        allowed = {"role_id", "account_status", "platform_access", "force_password_change", "status"}
        filtered = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if not filtered:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        if "status" in filtered:
            filtered["is_active"] = filtered.pop("status") == "active"
        return await self.employee_repo.update(employee_id, **filtered)

    async def get_admin_dashboard(self) -> dict:
        return await self.employee_repo.get_dashboard_stats()
