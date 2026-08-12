from fastapi import HTTPException, status

from app.core.pagination import PaginatedResult
from app.core.security import hash_password
from app.modules.employees.infrastructure.repositories import (
    EmployeeDocumentRepository,
    EmployeeRepository,
)
from app.shared.database.models_hr import Employee


class EmployeeService:
    def __init__(self, employee_repo: EmployeeRepository, document_repo: EmployeeDocumentRepository) -> None:
        self.employee_repo = employee_repo
        self.document_repo = document_repo

    async def create_employee(self, **kwargs: dict) -> dict:
        existing = await self.employee_repo.get_by_document(kwargs.get("document_number", ""))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee with this document already exists")
        username = kwargs.pop("username", None)
        password = kwargs.pop("password", None)
        role_id = kwargs.pop("role_id", None)
        platform_access = kwargs.pop("platform_access", None)
        from datetime import date as _date
        for field in ("hire_date", "birth_date"):
            if field in kwargs and kwargs[field] and isinstance(kwargs[field], str):
                try:
                    kwargs[field] = _date.fromisoformat(kwargs[field])
                except (ValueError, TypeError):
                    kwargs[field] = None
        employee = await self.employee_repo.create(**kwargs)
        if username and password:
            hashed = hash_password(password)
            await self.employee_repo.update(employee.id,
                username=username, hashed_password=hashed, role_id=role_id,
                platform_access=platform_access or "both", account_status="active",
            )
        return {"id": employee.id, "code": employee.code, "full_name": f"{employee.first_name} {employee.last_name}"}

    async def get_employee(self, employee_id: str) -> Employee | None:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        return employee

    async def update_employee(self, employee_id: str, **kwargs: dict) -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        from datetime import date as _date
        for field in ("hire_date", "birth_date"):
            if field in kwargs and kwargs[field] and isinstance(kwargs[field], str):
                try:
                    kwargs[field] = _date.fromisoformat(kwargs[field])
                except (ValueError, TypeError):
                    kwargs[field] = None
        
        # If the photo is deleted/cleared, we must also reset the facial encoding to force re-registration
        if "photo_url" in kwargs and not kwargs["photo_url"]:
            kwargs["facial_encoding"] = None

        updated = await self.employee_repo.update(employee_id, **kwargs)
        return {"id": updated.id, "message": "Employee updated successfully"}

    async def delete_employee(self, employee_id: str, db: any = None) -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empleado no encontrado")

        if db:
            from sqlalchemy import select, func
            from app.shared.database.models_access import AccessRecord
            from app.shared.database.models_scheduling import Shift
            from app.shared.database.models_contract import Contract
            from app.shared.database.models_payroll import PayrollRecord

            access_count = (await db.execute(select(func.count(AccessRecord.id)).where(AccessRecord.employee_id == employee_id))).scalar() or 0
            shift_count = (await db.execute(select(func.count(Shift.id)).where(Shift.employee_id == employee_id))).scalar() or 0
            contract_count = (await db.execute(select(func.count(Contract.id)).where(Contract.employee_id == employee_id))).scalar() or 0
            payroll_count = (await db.execute(select(func.count(PayrollRecord.id)).where(PayrollRecord.employee_id == employee_id))).scalar() or 0

            total_movements = access_count + shift_count + contract_count + payroll_count
            if total_movements > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se puede eliminar el empleado '{employee.first_name} {employee.last_name}' porque tiene {total_movements} movimientos históricos registrados (asistencias, turnos, contratos o nómina) necesarios para informes. Le sugerimos modificar su información o cambiar su estado a 'Inactivo'."
                )

        await self.employee_repo.update(employee_id, is_deleted=True, status="terminated")
        return {"message": "Empleado eliminado correctamente"}

    async def list_employees(
        self,
        company_id: str | None = None,
        department_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 25,
    ) -> PaginatedResult:
        skip = (page - 1) * page_size
        items, total = await self.employee_repo.list_employees(
            company_id=company_id,
            department_id=department_id,
            status=status,
            search=search,
            skip=skip,
            limit=page_size,
        )
        return PaginatedResult.create(
            items=[
                {
                    "id": e.id,
                    "code": e.code,
                    "document_type": e.document_type,
                    "document_number": e.document_number,
                    "first_name": e.first_name,
                    "last_name": e.last_name,
                    "email": e.email,
                    "phone": e.phone,
                    "status": e.status,
                    "photo_url": e.photo_url,
                    "department_id": e.department_id,
                    "company_id": e.company_id,
                    "has_access": bool(e.username),
                    "username": e.username,
                    "platform_access": e.platform_access,
                    "account_status": e.account_status,
                    "eps": e.eps,
                    "arl": e.arl,
                    "afp": e.afp,
                    "city": e.city,
                    "department_loc": e.department_loc,
                }
                for e in items
            ],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_employee_documents(self, employee_id: str) -> list[dict]:
        docs = await self.document_repo.list_by_employee(employee_id)
        return [{"id": d.id, "document_type": d.document_type, "name": d.name, "file_url": d.file_url, "expiry_date": str(d.expiry_date) if d.expiry_date else None} for d in docs]

    async def add_employee_document(self, employee_id: str, **kwargs: dict) -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        doc = await self.document_repo.create(employee_id=employee_id, **kwargs)
        return {"id": doc.id, "name": doc.name}

    async def get_company_stats(self, company_id: str) -> dict:
        total = await self.employee_repo.count_by_company(company_id)
        active = await self.employee_repo.count_by_status(company_id, "active")
        inactive = await self.employee_repo.count_by_status(company_id, "inactive")
        terminated = await self.employee_repo.count_by_status(company_id, "terminated")
        return {"total": total, "active": active, "inactive": inactive, "terminated": terminated}

    async def create_access(self, employee_id: str, username: str, password: str,
                            role_id: str | None = None, platform_access: str = "both") -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        if employee.username:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee already has system access")
        existing_username = await self.employee_repo.get_by_username(username)
        if existing_username:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
        hashed = hash_password(password)
        await self.employee_repo.update(employee_id,
            username=username, hashed_password=hashed, role_id=role_id,
            platform_access=platform_access or "both", account_status="active",
        )
        return {"message": "Access created successfully", "username": username}

    async def update_access(self, employee_id: str, **kwargs: dict) -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        if not employee.username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee has no system access")
        new_username = kwargs.pop("username", None)
        if new_username and new_username != employee.username:
            existing = await self.employee_repo.get_by_username(new_username)
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
            kwargs["username"] = new_username
        new_password = kwargs.pop("password", None)
        if new_password:
            kwargs["hashed_password"] = hash_password(new_password)
        allowed = {"username", "hashed_password", "role_id", "platform_access", "account_status"}
        filtered = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if filtered:
            await self.employee_repo.update(employee_id, **filtered)
        return {"message": "Access updated successfully"}

    async def reset_password(self, employee_id: str, new_password: str) -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        if not employee.username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee has no system access")
        hashed = hash_password(new_password)
        await self.employee_repo.update(employee_id, hashed_password=hashed)
        return {"message": "Password reset successfully"}

    async def bulk_import_employees(self, company_id: str, employees_data: list[dict]) -> dict:
        from datetime import date, datetime
        created_count = 0
        skipped_count = 0
        errors = []

        def parse_date(val: any) -> date | None:
            if not val or not str(val).strip():
                return None
            val_str = str(val).strip()
            if "T" in val_str:
                val_str = val_str.split("T")[0]
            try:
                return date.fromisoformat(val_str)
            except Exception:
                for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%y"):
                    try:
                        return datetime.strptime(val_str, fmt).date()
                    except Exception:
                        pass
                return None

        for idx, data in enumerate(employees_data):
            doc_num = str(data.get("document_number", "")).strip()
            first_name = str(data.get("first_name", "")).strip()
            last_name = str(data.get("last_name", "")).strip()

            if not doc_num or not first_name or not last_name:
                errors.append(f"Fila {idx + 1}: Faltan campos obligatorios (Cédula/Documento, Primer Nombre o Primer Apellido)")
                skipped_count += 1
                continue

            existing = await self.employee_repo.get_by_document(doc_num)
            if existing:
                skipped_count += 1
                errors.append(f"Fila {idx + 1}: Ya existe el empleado con cédula '{doc_num}' ({existing.first_name} {existing.last_name})")
                continue

            # Check username uniqueness if provided
            username = str(data.get("username", "")).strip() or None
            if username:
                existing_user = await self.employee_repo.get_by_username(username)
                if existing_user:
                    username = f"{username}_{doc_num[-4:]}"

            pwd = str(data.get("password", "")).strip() or None
            hashed_pwd = hash_password(pwd) if pwd else None
            platform_access = str(data.get("platform_access", "both" if username else "none")).strip().lower()

            try:
                emp_dict = {
                    "company_id": company_id or "dla-company-main",
                    "code": str(data.get("code", "")).strip() or f"EMP-{doc_num}",
                    "document_type": str(data.get("document_type", "CC")).strip().upper(),
                    "document_number": doc_num,
                    "first_name": first_name,
                    "middle_name": str(data.get("middle_name", "")).strip() or None,
                    "last_name": last_name,
                    "second_last_name": str(data.get("second_last_name", "")).strip() or None,
                    "email": str(data.get("email", "")).strip() or f"emp{doc_num}@deacontrol.com",
                    "phone": str(data.get("phone", "")).strip() or None,
                    "mobile": str(data.get("mobile", "")).strip() or None,
                    "address": str(data.get("address", "")).strip() or None,
                    "department_loc": str(data.get("department_loc", "Quindío")).strip(),
                    "city": str(data.get("city", "Armenia")).strip(),
                    "country": "CO",
                    "birth_date": parse_date(data.get("birth_date")),
                    "gender": str(data.get("gender", "")).strip().upper() or None,
                    "blood_type": str(data.get("blood_type", "")).strip().upper() or None,
                    "marital_status": str(data.get("marital_status", "")).strip().lower() or None,
                    "eps": str(data.get("eps", "")).strip() or None,
                    "arl": str(data.get("arl", "")).strip() or None,
                    "afp": str(data.get("afp", "")).strip() or None,
                    "caja_compensacion": str(data.get("caja_compensacion", "")).strip() or None,
                    "emergency_contact_name": str(data.get("emergency_contact_name", "")).strip() or None,
                    "emergency_contact_phone": str(data.get("emergency_contact_phone", "")).strip() or None,
                    "emergency_contact_relation": str(data.get("emergency_contact_relation", "")).strip() or None,
                    "hire_date": parse_date(data.get("hire_date")) or date.today(),
                    "bank_name": str(data.get("bank_name", "")).strip() or None,
                    "bank_account_type": str(data.get("bank_account_type", "")).strip().lower() or None,
                    "bank_account_number": str(data.get("bank_account_number", "")).strip() or None,
                    "username": username,
                    "hashed_password": hashed_pwd,
                    "platform_access": platform_access if platform_access in ("none", "web", "mobile", "both") else "both",
                    "account_status": "active" if username else "inactive",
                    "status": str(data.get("status", "active")).strip().lower(),
                }
                await self.employee_repo.create(**emp_dict)
                created_count += 1
            except Exception as e:
                skipped_count += 1
                errors.append(f"Fila {idx + 1} (Doc {doc_num}): Error de guardado: {str(e)}")

        return {
            "created_count": created_count,
            "skipped_count": skipped_count,
            "total_processed": len(employees_data),
            "errors": errors,
        }
