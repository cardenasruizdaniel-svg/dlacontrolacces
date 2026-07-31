from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.modules.access_control.application.service import AccessControlService
from app.modules.access_control.infrastructure.repositories import AccessRecordRepository
from app.modules.access_control.presentation.schemas import (
    EntryRequest,
    ExitRequest,
    AccessRecordResponse,
)

router = APIRouter(prefix="/access", tags=["Access Control"])


def get_service(db: DbSession) -> AccessControlService:
    return AccessControlService(record_repo=AccessRecordRepository(db), db=db)


@router.post("/entry")
async def register_entry(body: EntryRequest, db: DbSession) -> dict:
    return await get_service(db).register_entry(**body.model_dump())


@router.post("/exit")
async def register_exit(body: ExitRequest, db: DbSession) -> dict:
    return await get_service(db).register_exit(**body.model_dump())


@router.get("/records")
async def list_records(
    current_user: CurrentUser, db: DbSession,
    employee_id: str | None = Query(None),
    record_type: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> dict:
    result = await get_service(db).list_records(
        employee_id=employee_id, record_type=record_type,
        start_date=start_date, end_date=end_date,
        page=page, page_size=page_size,
    )
    return result.__dict__


@router.get("/history/{employee_id}")
async def get_employee_history(
    employee_id: str, current_user: CurrentUser, db: DbSession,
    start_date: str | None = Query(None), end_date: str | None = Query(None),
) -> list[dict]:
    return await get_service(db).get_employee_history(employee_id, start_date=start_date, end_date=end_date)


@router.get("/attendance/{date}")
async def get_attendance(date: str, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).get_attendance_summary(date)
