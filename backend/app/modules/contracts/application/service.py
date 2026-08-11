from datetime import date
from fastapi import HTTPException, status

from app.core.pagination import PaginatedResult
from app.modules.contracts.infrastructure.repositories import (
    ContractRepository,
    ContractTypeRepository,
)


class ContractService:
    def __init__(self, contract_repo: ContractRepository, type_repo: ContractTypeRepository) -> None:
        self.contract_repo = contract_repo
        self.type_repo = type_repo

    async def create_contract(self, **kwargs: dict) -> dict:
        active = await self.contract_repo.get_active_by_employee(kwargs["employee_id"])
        if active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El empleado ya tiene un contrato activo. Debe terminar el contrato actual antes de crear uno nuevo.",
            )
        from datetime import date as _date
        for field in ("start_date", "end_date"):
            if field in kwargs and isinstance(kwargs[field], str) and kwargs[field]:
                kwargs[field] = _date.fromisoformat(kwargs[field])
            elif field in kwargs and not kwargs[field]:
                kwargs[field] = None

        sig_url = kwargs.pop("signature_url", None)
        sig_method = kwargs.pop("signature_method", None)
        if sig_url:
            from datetime import datetime, timezone
            kwargs["signature_url"] = sig_url
            kwargs["is_signed"] = True
            kwargs["signed_at"] = datetime.now(timezone.utc).isoformat()
            kwargs["signature_method"] = sig_method or "screen_pad"

        contract = await self.contract_repo.create(**kwargs)
        if sig_url and contract.employee:
            contract.employee.signature_url = sig_url
            await self.contract_repo.db.commit()

        return {"id": contract.id, "code": contract.code, "status": contract.status, "is_signed": contract.is_signed}

    async def get_contract(self, contract_id: str):
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato no encontrado")
        return contract

    async def sign_contract(self, contract_id: str, signature_url: str, method: str = "screen_pad") -> dict:
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato no encontrado")

        from datetime import datetime, timezone
        now_str = datetime.now(timezone.utc).isoformat()

        contract.signature_url = signature_url
        contract.is_signed = True
        contract.signed_at = now_str
        contract.signature_method = method

        if contract.employee:
            contract.employee.signature_url = signature_url

        await self.contract_repo.db.commit()
        return {
            "status": "success",
            "message": "Contrato firmado digitalmente exitosamente",
            "contract_id": contract.id,
            "signed_at": now_str,
            "signature_method": method,
        }

    async def update_contract(self, contract_id: str, **kwargs: dict) -> dict:
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato no encontrado")
        employee_id = kwargs.get("employee_id", contract.employee_id)
        active = await self.contract_repo.get_active_by_employee_except(employee_id, contract_id)
        if active:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El empleado ya tiene otro contrato activo")
        from datetime import date as _date
        for field in ("start_date", "end_date"):
            if field in kwargs and isinstance(kwargs[field], str) and kwargs[field]:
                kwargs[field] = _date.fromisoformat(kwargs[field])
            elif field in kwargs and not kwargs[field]:
                kwargs[field] = None

        allowed = {"employee_id", "contract_type_id", "code", "start_date", "end_date", "salary",
                    "work_scheme", "weekly_hours", "daily_hours", "notes", "status", "transportation_assistance",
                    "payment_frequency", "payment_method", "bank_name", "bank_account_number", "health_provider", "pension_provider", "arl_provider", "risk_level", "is_renewable"}
        filtered = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        updated = await self.contract_repo.update(contract_id, **filtered)
        return {"id": updated.id, "code": updated.code, "status": updated.status}

    async def delete_contract(self, contract_id: str) -> None:
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato no encontrado")
        await self.contract_repo.update(contract_id, is_deleted=True)

    async def list_contracts(
        self, company_id: str | None = None, employee_id: str | None = None,
        status: str | None = None, search: str | None = None,
        page: int = 1, page_size: int = 25,
    ) -> PaginatedResult:
        skip = (page - 1) * page_size
        items, total = await self.contract_repo.list_contracts(
            company_id=company_id, employee_id=employee_id,
            status=status, search=search, skip=skip, limit=page_size,
        )
        return PaginatedResult.create(
            items=[
                {
                    "id": c.id, "code": c.code,
                    "employee_id": c.employee_id,
                    "employee_name": f"{c.employee.first_name} {c.employee.last_name}" if c.employee else c.employee_id,
                    "employee_document": c.employee.document_number if c.employee else "",
                    "employee_code": c.employee.code if c.employee else "",
                    "contract_type_id": c.contract_type_id, "start_date": str(c.start_date),
                    "end_date": str(c.end_date) if c.end_date else None,
                    "salary": float(c.salary), "status": c.status,
                    "work_scheme": c.work_scheme, "weekly_hours": c.weekly_hours,
                    "daily_hours": c.daily_hours, "notes": c.notes,
                    "transportation_assistance": c.transportation_assistance,
                    "health_provider": c.health_provider or (c.employee.eps if c.employee else None),
                    "pension_provider": c.pension_provider or (c.employee.afp if c.employee else None),
                    "arl_provider": c.arl_provider or (c.employee.arl if c.employee else None),
                    "risk_level": c.risk_level,
                    "is_renewable": getattr(c, "is_renewable", True),
                    "is_signed": getattr(c, "is_signed", False),
                    "signature_url": getattr(c, "signature_url", None),
                    "payment_method": getattr(c, "payment_method", None),
                    "bank_name": getattr(c, "bank_name", None),
                    "bank_account_number": getattr(c, "bank_account_number", None),
                }
                for c in items
            ],
            total=total, page=page, page_size=page_size,
        )

    async def terminate_contract(self, contract_id: str, reason: str) -> dict:
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato no encontrado")
        if contract.status != "active":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El contrato ya se encuentra terminado")
        await self.contract_repo.terminate(contract_id, reason)
        return {"message": "Contrato terminado correctamente"}

    async def list_contract_types(self, company_id: str) -> list[dict]:
        types = await self.type_repo.list_by_company(company_id)
        if not types:
            # Seed standard Colombian labor contract types
            default_types = [
                {"code": "TF-COL", "name": "Contrato a Término Fijo (Art. 46 CST)", "labor_law_type": "fixed_term", "description": "Duración determinada desde 1 día hasta 3 años"},
                {"code": "TI-COL", "name": "Contrato a Término Indefinido (Art. 47 CST)", "labor_law_type": "indefinite", "description": "Sin fecha de terminación estipulada"},
                {"code": "OL-COL", "name": "Contrato por Obra o Labor (Art. 45 CST)", "labor_law_type": "specific_work", "description": "Dura lo que tarden en ejecutarse los trabajos"},
                {"code": "PS-COL", "name": "Contrato de Prestación de Servicios (Civil/Comercial)", "labor_law_type": "services", "description": "Contratación independiente por honorarios"},
                {"code": "AP-COL", "name": "Contrato de Aprendizaje (Ley 789 de 2002)", "labor_law_type": "apprenticeship", "description": "Formación teórica y práctica SENA"},
                {"code": "OC-COL", "name": "Contrato Ocasional o Transitorio (Art. 6 CST)", "labor_law_type": "transitory", "description": "Actividades ajenas al giro ordinario (máximo 1 mes)"},
            ]
            for dt in default_types:
                try:
                    await self.type_repo.create(company_id=company_id, **dt)
                except Exception:
                    pass
            types = await self.type_repo.list_by_company(company_id)
        return [{"id": t.id, "code": t.code, "name": t.name, "labor_law_type": t.labor_law_type, "description": t.description} for t in types]

    async def create_contract_type(self, **kwargs: dict) -> dict:
        ct = await self.type_repo.create(**kwargs)
        return {"id": ct.id, "code": ct.code, "name": ct.name, "labor_law_type": ct.labor_law_type}

    async def update_contract_type(self, type_id: str, **kwargs: dict) -> dict:
        ct = await self.type_repo.update(type_id, **kwargs)
        return {"id": ct.id, "code": ct.code, "name": ct.name, "labor_law_type": ct.labor_law_type}

    async def delete_contract_type(self, type_id: str) -> dict:
        await self.type_repo.update(type_id, is_deleted=True)
        return {"message": "Tipo de contrato eliminado"}
