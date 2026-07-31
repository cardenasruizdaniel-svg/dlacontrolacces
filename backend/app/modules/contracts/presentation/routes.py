import json
from datetime import date
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.deps import CurrentUser, DbSession
from app.modules.contracts.application.service import ContractService
from app.modules.contracts.infrastructure.repositories import (
    ContractRepository,
    ContractTypeRepository,
)
from app.modules.contracts.presentation.schemas import (
    ContractCreateRequest,
    ContractListResponse,
    ContractTerminateRequest,
    ContractUpdateRequest,
    ContractSignRequest,
)

router = APIRouter(prefix="/contracts", tags=["Contracts"])
public_contracts_router = APIRouter(prefix="/public/contracts", tags=["Public Contracts"])


def get_service(db: DbSession) -> ContractService:
    return ContractService(
        contract_repo=ContractRepository(db),
        type_repo=ContractTypeRepository(db),
    )


class ContractTypeCreateRequest(BaseModel):
    company_id: str
    code: str
    name: str
    labor_law_type: str
    description: Optional[str] = None


class ContractDocumentUploadRequest(BaseModel):
    name: str
    doc_type: str  # pdf, image, certificate, id_card, other
    file_base64: str
    file_size_bytes: Optional[int] = 0


@router.post("", status_code=201)
async def create_contract(body: ContractCreateRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.create_contract(**body.model_dump())


@router.get("", response_model=ContractListResponse)
async def list_contracts(
    current_user: CurrentUser, db: DbSession,
    company_id: str | None = Query(None),
    employee_id: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=1000),
) -> ContractListResponse:
    service = get_service(db)
    result = await service.list_contracts(
        company_id=company_id, employee_id=employee_id,
        status=status, page=page, page_size=page_size,
    )
    return ContractListResponse(**result.__dict__)


@router.get("/types")
async def list_contract_types(company_id: str, current_user: CurrentUser, db: DbSession) -> list[dict]:
    service = get_service(db)
    return await service.list_contract_types(company_id)


@router.post("/types", status_code=201)
async def create_contract_type(body: ContractTypeCreateRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.create_contract_type(**body.model_dump())


@router.put("/types/{type_id}")
async def update_contract_type(type_id: str, body: ContractTypeCreateRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.update_contract_type(type_id, **body.model_dump(exclude_unset=True))


@router.delete("/types/{type_id}")
async def delete_contract_type(type_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.delete_contract_type(type_id)


@router.get("/{contract_id}")
async def get_contract(contract_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    c = await service.get_contract(contract_id)
    employee_name = f"{c.employee.first_name} {c.employee.last_name}" if c.employee else c.employee_id
    docs = []
    if getattr(c, "documents_json", None):
        try:
            docs = json.loads(c.documents_json)
        except Exception:
            docs = []
    return {
        "id": c.id, "code": c.code, "employee_id": c.employee_id,
        "employee_name": employee_name,
        "employee_document": c.employee.document_number if c.employee else "",
        "employee_code": c.employee.code if c.employee else "",
        "contract_type_id": c.contract_type_id, "start_date": str(c.start_date),
        "end_date": str(c.end_date) if c.end_date else None,
        "salary": float(c.salary), "status": c.status,
        "salary_type": getattr(c, "salary_type", "monthly") or "monthly",
        "hourly_rate": float(c.hourly_rate) if getattr(c, "hourly_rate", None) else None,
        "shift_value": float(c.shift_value) if getattr(c, "shift_value", None) else None,
        "daily_rate": float(c.daily_rate) if getattr(c, "daily_rate", None) else None,
        "work_scheme": c.work_scheme, "weekly_hours": c.weekly_hours,
        "daily_hours": c.daily_hours, "notes": c.notes,
        "transportation_assistance": c.transportation_assistance,
        "payment_frequency": c.payment_frequency,
        "health_provider": c.health_provider or (c.employee.eps if c.employee else None),
        "pension_provider": c.pension_provider or (c.employee.afp if c.employee else None),
        "arl_provider": c.arl_provider or (c.employee.arl if c.employee else None),
        "risk_level": c.risk_level,
        "is_signed": getattr(c, "is_signed", False),
        "signature_url": getattr(c, "signature_url", None),
        "signed_at": getattr(c, "signed_at", None),
        "signature_method": getattr(c, "signature_method", None),
        "documents": docs,
    }


@router.post("/{contract_id}/sign")
async def sign_contract(
    contract_id: str,
    body: ContractSignRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    service = get_service(db)
    return await service.sign_contract(
        contract_id=contract_id,
        signature_url=body.signature_url,
        method=body.signature_method,
    )


@router.get("/{contract_id}/documents")
async def get_contract_documents(contract_id: str, current_user: CurrentUser, db: DbSession) -> list[dict]:
    service = get_service(db)
    c = await service.get_contract(contract_id)
    if not getattr(c, "documents_json", None):
        return []
    try:
        return json.loads(c.documents_json)
    except Exception:
        return []


@router.post("/{contract_id}/documents")
async def upload_contract_document(
    contract_id: str,
    body: ContractDocumentUploadRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    service = get_service(db)
    c = await service.get_contract(contract_id)
    docs = []
    if getattr(c, "documents_json", None):
        try:
            docs = json.loads(c.documents_json)
        except Exception:
            docs = []

    import uuid
    doc_id = str(uuid.uuid4())
    new_doc = {
        "id": doc_id,
        "name": body.name,
        "doc_type": body.doc_type,
        "file_base64": body.file_base64,
        "file_size_bytes": body.file_size_bytes or 0,
        "uploaded_at": str(date.today()),
    }
    docs.append(new_doc)
    c.documents_json = json.dumps(docs)
    await db.commit()
    return {"status": "success", "message": "Documento adjuntado exitosamente al contrato", "document": new_doc}


@router.delete("/{contract_id}/documents/{doc_id}")
async def delete_contract_document(
    contract_id: str,
    doc_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    service = get_service(db)
    c = await service.get_contract(contract_id)
    if not getattr(c, "documents_json", None):
        return {"status": "success", "message": "Documento eliminado"}
    try:
        docs = json.loads(c.documents_json)
        docs = [d for d in docs if d.get("id") != doc_id]
        c.documents_json = json.dumps(docs)
        await db.commit()
    except Exception:
        pass
    return {"status": "success", "message": "Documento eliminado exitosamente"}


@router.put("/{contract_id}")
async def update_contract(contract_id: str, body: ContractUpdateRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.update_contract(contract_id, **body.model_dump(exclude_unset=True))


@router.post("/{contract_id}/terminate")
async def terminate_contract(
    contract_id: str, body: ContractTerminateRequest,
    current_user: CurrentUser, db: DbSession,
) -> dict:
    service = get_service(db)
    return await service.terminate_contract(contract_id, body.reason)


@public_contracts_router.get("/{contract_id}/signing-data")
async def get_public_contract_signing_data(contract_id: str, db: DbSession) -> dict:
    repo = ContractRepository(db)
    c = await repo.get_by_id(contract_id)
    if not c:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    emp_name = f"{c.employee.first_name} {c.employee.last_name}" if c.employee else "Empleado"
    emp_doc = c.employee.document_number if c.employee else ""
    return {
        "id": c.id,
        "code": c.code,
        "employee_name": emp_name,
        "employee_document": emp_doc,
        "start_date": str(c.start_date),
        "salary": float(c.salary),
        "work_scheme": c.work_scheme,
        "is_signed": getattr(c, "is_signed", False),
        "signature_url": getattr(c, "signature_url", None),
        "signed_at": getattr(c, "signed_at", None),
    }


@public_contracts_router.post("/{contract_id}/sign")
async def sign_public_contract(contract_id: str, body: ContractSignRequest, db: DbSession) -> dict:
    repo = ContractRepository(db)
    type_repo = ContractTypeRepository(db)
    service = ContractService(contract_repo=repo, type_repo=type_repo)
    return await service.sign_contract(
        contract_id=contract_id,
        signature_url=body.signature_url,
        method=body.signature_method or "qr_mobile",
    )
