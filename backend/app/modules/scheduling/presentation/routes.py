import logging
from fastapi import APIRouter, Depends, Query

from app.core.deps import CurrentUser, DbSession, require_permission
from app.modules.scheduling.application.service import SchedulingService
from app.modules.scheduling.infrastructure.repositories import (
    ScheduleRepository,
    ShiftRepository,
    ShiftTemplateRepository,
    ScheduleSeriesRepository,
)
from app.modules.scheduling.presentation.schemas import (
    BulkSaveRequest,
    BulkSaveResponse,
    CalendarEvent,
    ConflictDetail,
    ConflictValidationResult,
    DailySummary,
    ScheduleCreateRequest,
    ScheduleListResponse,
    ScheduleResponse,
    ScheduleUpdateRequest,
    SeriesCreateRequest,
    SeriesListResponse,
    SeriesResponse,
    SeriesUpdateRequest,
    ShiftCreateRequest,
    ShiftResponse,
    ShiftTemplateCreateRequest,
    ShiftTemplateListResponse,
    ShiftTemplateResponse,
    ShiftTemplateUpdateRequest,
    ShiftUpdateRequest,
)

router = APIRouter(prefix="/scheduling", tags=["Scheduling"])


def get_service(db: DbSession) -> SchedulingService:
    return SchedulingService(
        template_repo=ShiftTemplateRepository(db),
        schedule_repo=ScheduleRepository(db),
        shift_repo=ShiftRepository(db),
        series_repo=ScheduleSeriesRepository(db),
    )


def _template_to_response(t) -> ShiftTemplateResponse:
    return ShiftTemplateResponse(
        id=t.id, company_id=t.company_id, name=t.name, color=t.color,
        start_time=t.start_time, end_time=t.end_time, duration_hours=t.duration_hours,
        shift_type=t.shift_type, observations=t.observations, status=t.status, is_active=t.is_active,
    )


def _schedule_to_response(s, shift_count: int = 0) -> ScheduleResponse:
    return ScheduleResponse(
        id=s.id, company_id=s.company_id, client_id=s.client_id,
        name=s.name, description=s.description,
        start_date=str(s.start_date), end_date=str(s.end_date) if s.end_date else None,
        recurrence=s.recurrence, status=s.status, is_active=s.is_active, shift_count=shift_count,
    )


def _series_to_response(s) -> SeriesResponse:
    emp_name = None
    try:
        if s.employee:
            emp_name = f"{s.employee.first_name} {s.employee.last_name}"
    except Exception as e:
        logging.getLogger(__name__).warning("Failed to resolve employee name for series %s: %s", s.id, e)
    return SeriesResponse(
        id=s.id, company_id=s.company_id, name=s.name, description=s.description,
        client_id=s.client_id, persona_id=s.persona_id,
        employee_id=s.employee_id, employee_name=emp_name,
        client_name=None, persona_name=None,
        shift_template_id=s.shift_template_id,
        recurrence_type=s.recurrence_type, recurrence_days=s.recurrence_days,
        start_date=str(s.start_date), end_date=str(s.end_date) if s.end_date else None,
        max_occurrences=s.max_occurrences,
        default_start_time=s.default_start_time, default_end_time=s.default_end_time,
        default_break_minutes=s.default_break_minutes, default_priority=s.default_priority,
        default_notes=s.default_notes, color=s.color, status=s.status,
        total_generated=s.total_generated, is_active=s.is_active,
    )


def _shift_to_response(s) -> ShiftResponse:
    emp_name = None
    if hasattr(s, "employee") and s.employee:
        emp_name = f"{s.employee.first_name} {s.employee.last_name}"
    
    client_name = None
    client_address = None
    client_phone = None
    if hasattr(s, "client_rel") and s.client_rel:
        client_name = s.client_rel.name
        client_address = getattr(s.client_rel, "address", None)
        client_phone = getattr(s.client_rel, "phone", None)
        
    persona_name = None
    if hasattr(s, "persona") and s.persona:
        persona_name = f"{s.persona.first_name} {s.persona.last_name}"
        if not client_address:
            client_address = getattr(s.persona, "address", None)
        if not client_phone:
            client_phone = getattr(s.persona, "phone", None)
            
    return ShiftResponse(
        id=s.id, schedule_id=s.schedule_id, employee_id=s.employee_id,
        client_id=s.client_id, persona_id=s.persona_id, project_id=s.project_id,
        shift_template_id=s.shift_template_id, name=s.name, color=s.color,
        shift_date=str(s.shift_date), start_time=s.start_time, end_time=s.end_time,
        break_minutes=s.break_minutes, priority=s.priority, status=s.status,
        notes=s.notes, observations=s.observations,
        employee_name=emp_name, client_name=client_name, persona_name=persona_name,
        client_address=client_address, client_phone=client_phone,
    )


# --- Shift Templates ---

@router.post("/templates", status_code=201, response_model=ShiftTemplateResponse)
async def create_template(body: ShiftTemplateCreateRequest, db: DbSession, current_user = Depends(require_permission("scheduling", "create"))) -> ShiftTemplateResponse:
    template = await get_service(db).create_template(**body.model_dump())
    return _template_to_response(template)


@router.get("/templates", response_model=ShiftTemplateListResponse)
async def list_templates(
    company_id: str, current_user: CurrentUser, db: DbSession,
    page: int = Query(1, ge=1), page_size: int = Query(100, ge=1, le=200),
) -> ShiftTemplateListResponse:
    result = await get_service(db).list_templates(company_id, page=page, page_size=page_size)
    items = [_template_to_response(t) for t in result["items"]]
    return ShiftTemplateListResponse(items=items, total=result["total"], page=result["page"],
                                     page_size=result["page_size"], total_pages=result["total_pages"])


@router.get("/templates/{template_id}", response_model=ShiftTemplateResponse)
async def get_template(template_id: str, current_user: CurrentUser, db: DbSession) -> ShiftTemplateResponse:
    template = await get_service(db).get_template(template_id)
    return _template_to_response(template)


@router.put("/templates/{template_id}", response_model=ShiftTemplateResponse)
async def update_template(template_id: str, body: ShiftTemplateUpdateRequest, db: DbSession, current_user = Depends(require_permission("scheduling", "update"))) -> ShiftTemplateResponse:
    template = await get_service(db).update_template(template_id, **body.model_dump(exclude_unset=True))
    return _template_to_response(template)


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, db: DbSession, current_user = Depends(require_permission("scheduling", "delete"))) -> dict:
    await get_service(db).delete_template(template_id, db=db)
    await db.commit()
    return {"message": "Template deleted"}


# --- Schedules ---

@router.post("/schedules", status_code=201, response_model=ScheduleResponse)
async def create_schedule(body: ScheduleCreateRequest, db: DbSession, current_user = Depends(require_permission("scheduling", "create"))) -> ScheduleResponse:
    schedule = await get_service(db).create_schedule(**body.model_dump())
    return _schedule_to_response(schedule)


@router.get("/schedules", response_model=ScheduleListResponse)
async def list_schedules(
    company_id: str, current_user: CurrentUser, db: DbSession,
    page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=1000),
) -> ScheduleListResponse:
    result = await get_service(db).list_schedules(company_id, page=page, page_size=page_size)
    items = []
    for s in result["items"]:
        sc = await get_service(db).list_shifts(s.id)
        items.append(_schedule_to_response(s, shift_count=len(sc)))
    return ScheduleListResponse(items=items, total=result["total"], page=result["page"],
                                page_size=result["page_size"], total_pages=result["total_pages"])


@router.get("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(schedule_id: str, current_user: CurrentUser, db: DbSession) -> ScheduleResponse:
    schedule = await get_service(db).get_schedule(schedule_id)
    sc = await get_service(db).list_shifts(schedule_id)
    return _schedule_to_response(schedule, shift_count=len(sc))


@router.put("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(schedule_id: str, body: ScheduleUpdateRequest, db: DbSession, current_user = Depends(require_permission("scheduling", "update"))) -> ScheduleResponse:
    schedule = await get_service(db).update_schedule(schedule_id, **body.model_dump(exclude_unset=True))
    return _schedule_to_response(schedule)


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, db: DbSession, current_user = Depends(require_permission("scheduling", "delete"))) -> dict:
    svc = get_service(db)
    await svc.get_schedule(schedule_id)  # validates exists
    await svc.shift_repo.soft_delete_by_schedule(schedule_id)
    await svc.delete_schedule(schedule_id)
    return {"message": "Schedule and all its shifts deleted"}


@router.get("/schedules/{schedule_id}/shifts", response_model=list[ShiftResponse])
async def list_shifts(schedule_id: str, current_user: CurrentUser, db: DbSession) -> list[ShiftResponse]:
    items = await get_service(db).list_shifts(schedule_id)
    return [_shift_to_response(s) for s in items]


@router.post("/schedules/{schedule_id}/cancel-all-shifts")
async def cancel_all_shifts(schedule_id: str, db: DbSession, current_user = Depends(require_permission("scheduling", "update"))) -> dict:
    svc = get_service(db)
    await svc.get_schedule(schedule_id)  # validates exists
    count = await svc.shift_repo.cancel_by_schedule(schedule_id)
    return {"message": f"{count} turnos cancelados", "cancelled": count}


# --- Shifts ---

@router.post("/shifts", status_code=201, response_model=ShiftResponse)
async def create_shift(body: ShiftCreateRequest, db: DbSession, current_user = Depends(require_permission("scheduling", "create"))) -> ShiftResponse:
    shift = await get_service(db).create_shift(**body.model_dump())
    return _shift_to_response(shift)


@router.get("/shifts/{shift_id}", response_model=ShiftResponse)
async def get_shift(shift_id: str, current_user: CurrentUser, db: DbSession) -> ShiftResponse:
    shift = await get_service(db).get_shift(shift_id)
    return _shift_to_response(shift)


@router.put("/shifts/{shift_id}", response_model=ShiftResponse)
async def update_shift(shift_id: str, body: ShiftUpdateRequest, db: DbSession, current_user = Depends(require_permission("scheduling", "update"))) -> ShiftResponse:
    shift = await get_service(db).update_shift(shift_id, **body.model_dump(exclude_unset=True))
    return _shift_to_response(shift)


@router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, db: DbSession, current_user = Depends(require_permission("scheduling", "delete"))) -> dict:
    await get_service(db).delete_shift(shift_id)
    return {"message": "Shift deleted"}


@router.put("/shifts/{shift_id}/cancel", response_model=ShiftResponse)
async def cancel_shift(shift_id: str, db: DbSession, current_user = Depends(require_permission("scheduling", "update"))) -> ShiftResponse:
    shift = await get_service(db).shift_repo.cancel_shift(shift_id)
    if not shift:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Shift not found")
    return _shift_to_response(shift)


@router.put("/shifts/{shift_id}/status", response_model=ShiftResponse)
async def update_shift_status(shift_id: str, new_status: str, db: DbSession, current_user = Depends(require_permission("scheduling", "update"))) -> ShiftResponse:
    shift = await get_service(db).update_shift_status(shift_id, new_status)
    return _shift_to_response(shift)


# --- Employee Shifts ---

@router.get("/employee/{employee_id}/shifts", response_model=list[ShiftResponse])
async def list_employee_shifts(
    employee_id: str, current_user: CurrentUser, db: DbSession,
    start_date: str | None = Query(None), end_date: str | None = Query(None),
) -> list[ShiftResponse]:
    items = await get_service(db).list_employee_shifts(employee_id, start_date=start_date, end_date=end_date)
    return [_shift_to_response(s) for s in items]


# --- Calendar ---

@router.get("/calendar", response_model=list[CalendarEvent])
async def get_calendar(
    company_id: str, start_date: str, end_date: str,
    current_user: CurrentUser, db: DbSession,
) -> list[CalendarEvent]:
    shifts = await get_service(db).get_calendar(company_id, start_date, end_date)
    return [_shift_to_calendar_event(s) for s in shifts]


def _shift_to_calendar_event(s) -> CalendarEvent:
    emp_name = None
    if hasattr(s, "employee") and s.employee:
        emp_name = f"{s.employee.first_name} {s.employee.last_name}"
    client_name = None
    if hasattr(s, "client_rel") and s.client_rel:
        client_name = s.client_rel.name
    persona_name = None
    if hasattr(s, "persona") and s.persona:
        persona_name = f"{s.persona.first_name} {s.persona.last_name}"
    return CalendarEvent(
        id=s.id, title=s.name, start=f"{s.shift_date}T{s.start_time}:00",
        end=f"{s.shift_date}T{s.end_time}:00", employee_id=s.employee_id,
        employee_name=emp_name, client_id=s.client_id, client_name=client_name,
        persona_id=s.persona_id, persona_name=persona_name,
        status=s.status, priority=s.priority, color=s.color,
        notes=s.notes, observations=s.observations,
    )


# --- Daily Summary ---

@router.get("/daily-summary", response_model=DailySummary)
async def get_daily_summary(
    company_id: str, shift_date: str,
    current_user: CurrentUser, db: DbSession,
) -> DailySummary:
    result = await get_service(db).get_daily_summary(company_id, shift_date)
    return DailySummary(**result)


# --- Bulk Save with Conflict Detection ---

@router.post("/bulk-check", response_model=list[ConflictDetail])
async def bulk_check(
    body: BulkSaveRequest, db: DbSession, current_user = Depends(require_permission("scheduling", "read")),
) -> list[ConflictDetail]:
    events = [ev.model_dump() for ev in body.events]
    conflicts = await get_service(db).check_conflicts(body.company_id, events)
    return [ConflictDetail(**c) for c in conflicts]


@router.post("/bulk-save", response_model=BulkSaveResponse)
async def bulk_save(
    body: BulkSaveRequest, db: DbSession, current_user = Depends(require_permission("scheduling", "create")),
) -> BulkSaveResponse:
    events = [ev.model_dump() for ev in body.events]
    result = await get_service(db).bulk_save(body.company_id, events, schedule_id=body.schedule_id)
    return BulkSaveResponse(**result)


# --- Enhanced Validate Shift ---

@router.post("/validate-shift", response_model=ConflictValidationResult)
async def validate_shift_endpoint(
    employee_id: str, shift_date: str, start_time: str, end_time: str,
    break_minutes: int = 60, current_user: CurrentUser = None, db: DbSession = None,
) -> ConflictValidationResult:
    from datetime import date as _date
    try:
        shift_date_val = _date.fromisoformat(shift_date)
    except ValueError:
        return ConflictValidationResult(valid=False, conflicts=[ConflictDetail(
            type="invalid_date", message="Fecha inválida", employee_id=employee_id, date=shift_date)])
    result = await get_service(db).validate_shift(employee_id, shift_date_val, start_time, end_time, break_minutes)
    return ConflictValidationResult(
        valid=result["valid"],
        conflicts=[ConflictDetail(**c) for c in result["conflicts"]],
        warnings=result["warnings"],
    )


# --- Series CRUD ---

@router.post("/series", status_code=201, response_model=SeriesResponse)
async def create_series(body: SeriesCreateRequest, db: DbSession, current_user = Depends(require_permission("scheduling", "create"))) -> SeriesResponse:
    svc = get_service(db)
    series = await svc.create_series(**body.model_dump())
    repo = ScheduleSeriesRepository(db)
    series = await repo.get_by_id(series.id)
    return _series_to_response(series)


@router.get("/series", response_model=SeriesListResponse)
async def list_series(
    company_id: str, current_user: CurrentUser, db: DbSession,
    page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=1000),
) -> SeriesListResponse:
    result = await get_service(db).list_series(company_id, page=page, page_size=page_size)
    items = [_series_to_response(s) for s in result["items"]]
    return SeriesListResponse(items=items, total=result["total"], page=result["page"],
                              page_size=result["page_size"], total_pages=result["total_pages"])


@router.get("/series/{series_id}", response_model=SeriesResponse)
async def get_series(series_id: str, current_user: CurrentUser, db: DbSession) -> SeriesResponse:
    series = await get_service(db).get_series(series_id)
    return _series_to_response(series)


@router.put("/series/{series_id}", response_model=SeriesResponse)
async def update_series(series_id: str, body: SeriesUpdateRequest, db: DbSession, current_user = Depends(require_permission("scheduling", "update"))) -> SeriesResponse:
    await get_service(db).update_series(series_id, **body.model_dump(exclude_unset=True))
    repo = ScheduleSeriesRepository(db)
    series = await repo.get_by_id(series_id)
    return _series_to_response(series)


@router.delete("/series/{series_id}")
async def delete_series(series_id: str, db: DbSession, current_user = Depends(require_permission("scheduling", "delete"))) -> dict:
    await get_service(db).delete_series(series_id)
    return {"message": "Series deleted"}


@router.post("/series/{series_id}/generate", response_model=BulkSaveResponse)
async def generate_series_shifts(series_id: str, db: DbSession, current_user = Depends(require_permission("scheduling", "create"))) -> BulkSaveResponse:
    result = await get_service(db).generate_series_shifts(series_id)
    return BulkSaveResponse(**result)
