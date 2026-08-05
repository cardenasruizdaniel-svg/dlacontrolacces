from __future__ import annotations
from pydantic import BaseModel


class ShiftTemplateCreateRequest(BaseModel):
    company_id: str
    name: str
    color: str = "#3b82f6"
    start_time: str
    end_time: str
    duration_hours: float
    shift_type: str = "regular"
    observations: str | None = None


class ShiftTemplateUpdateRequest(BaseModel):
    name: str | None = None
    color: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    duration_hours: float | None = None
    shift_type: str | None = None
    observations: str | None = None
    status: str | None = None


class ShiftTemplateResponse(BaseModel):
    id: str
    company_id: str
    name: str
    color: str
    start_time: str
    end_time: str
    duration_hours: float
    shift_type: str
    observations: str | None = None
    status: str
    is_active: bool


class ShiftTemplateListResponse(BaseModel):
    items: list[ShiftTemplateResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ScheduleCreateRequest(BaseModel):
    company_id: str
    client_id: str | None = None
    name: str
    description: str | None = None
    start_date: str
    end_date: str | None = None
    recurrence: str = "none"


class ScheduleUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    recurrence: str | None = None
    status: str | None = None


class ScheduleResponse(BaseModel):
    id: str
    company_id: str
    client_id: str | None = None
    name: str
    description: str | None = None
    start_date: str
    end_date: str | None = None
    recurrence: str
    status: str
    is_active: bool
    shift_count: int = 0


class ScheduleListResponse(BaseModel):
    items: list[ScheduleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ShiftResponse(BaseModel):
    id: str
    schedule_id: str
    employee_id: str
    client_id: str | None = None
    persona_id: str | None = None
    project_id: str | None = None
    shift_template_id: str | None = None
    name: str
    color: str
    shift_date: str
    start_time: str
    end_time: str
    break_minutes: int
    priority: str
    status: str
    notes: str | None = None
    observations: str | None = None
    employee_name: str | None = None
    client_name: str | None = None
    client_address: str | None = None
    client_phone: str | None = None
    persona_name: str | None = None


class ShiftListResponse(BaseModel):
    items: list[ShiftResponse]
    total: int


class ShiftCreateRequest(BaseModel):
    schedule_id: str
    employee_id: str
    client_id: str | None = None
    persona_id: str | None = None
    project_id: str | None = None
    shift_template_id: str | None = None
    name: str
    color: str = "#3b82f6"
    shift_date: str
    start_time: str
    end_time: str
    break_minutes: int = 60
    priority: str = "normal"
    notes: str | None = None
    observations: str | None = None


class ShiftUpdateRequest(BaseModel):
    employee_id: str | None = None
    client_id: str | None = None
    persona_id: str | None = None
    project_id: str | None = None
    shift_template_id: str | None = None
    name: str | None = None
    color: str | None = None
    shift_date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    break_minutes: int | None = None
    priority: str | None = None
    notes: str | None = None
    observations: str | None = None
    status: str | None = None


class BulkShiftItem(BaseModel):
    employee_id: str | None = None
    client_id: str | None = None
    persona_id: str | None = None
    project_id: str | None = None
    shift_template_id: str | None = None
    name: str
    color: str = "#3b82f6"
    shift_date: str
    start_time: str
    end_time: str
    break_minutes: int = 60
    priority: str = "normal"
    notes: str | None = None
    observations: str | None = None


class BulkSaveRequest(BaseModel):
    company_id: str
    schedule_id: str | None = None
    events: list[BulkShiftItem]


class ConflictDetail(BaseModel):
    type: str
    message: str
    conflicting_shift_id: str | None = None
    employee_id: str
    date: str


class BulkSaveResponse(BaseModel):
    success: bool
    created: int = 0
    conflicts: list[ConflictDetail] = []
    message: str = ""


class CalendarEvent(BaseModel):
    id: str
    title: str
    start: str
    end: str
    employee_id: str
    employee_name: str | None = None
    client_id: str | None = None
    client_name: str | None = None
    persona_id: str | None = None
    persona_name: str | None = None
    status: str
    priority: str
    color: str
    notes: str | None = None
    observations: str | None = None


class DailySummary(BaseModel):
    date: str
    scheduled: int
    in_progress: int
    completed: int
    cancelled: int
    absent: int
    total: int


class SeriesCreateRequest(BaseModel):
    company_id: str
    name: str
    description: str | None = None
    client_id: str | None = None
    persona_id: str | None = None
    employee_id: str
    shift_template_id: str | None = None
    recurrence_type: str = "none"
    recurrence_days: str | None = None
    start_date: str
    end_date: str | None = None
    max_occurrences: int | None = None
    default_start_time: str
    default_end_time: str
    default_break_minutes: int = 60
    default_priority: str = "normal"
    default_notes: str | None = None
    color: str = "#3b82f6"


class SeriesUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    client_id: str | None = None
    persona_id: str | None = None
    employee_id: str | None = None
    shift_template_id: str | None = None
    recurrence_type: str | None = None
    recurrence_days: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    max_occurrences: int | None = None
    default_start_time: str | None = None
    default_end_time: str | None = None
    default_break_minutes: int | None = None
    default_priority: str | None = None
    default_notes: str | None = None
    color: str | None = None
    status: str | None = None


class SeriesResponse(BaseModel):
    id: str
    company_id: str
    name: str
    description: str | None = None
    client_id: str | None = None
    persona_id: str | None = None
    employee_id: str
    employee_name: str | None = None
    client_name: str | None = None
    persona_name: str | None = None
    shift_template_id: str | None = None
    recurrence_type: str
    recurrence_days: str | None = None
    start_date: str
    end_date: str | None = None
    max_occurrences: int | None = None
    default_start_time: str
    default_end_time: str
    default_break_minutes: int
    default_priority: str
    default_notes: str | None = None
    color: str
    status: str
    total_generated: int
    is_active: bool


class SeriesListResponse(BaseModel):
    items: list[SeriesResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ConflictValidationResult(BaseModel):
    valid: bool
    conflicts: list[ConflictDetail] = []
    warnings: list[str] = []
