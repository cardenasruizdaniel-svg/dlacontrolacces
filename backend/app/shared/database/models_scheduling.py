from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database.models_base import BaseModel


class ShiftTemplate(BaseModel):
    __tablename__ = "shift_templates"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#3b82f6", nullable=False)
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)
    duration_hours: Mapped[float] = mapped_column(Float, nullable=False)
    shift_type: Mapped[str] = mapped_column(String(30), default="regular", nullable=False)
    breaks_config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    lunch_config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_days_config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_holiday_applicable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ScheduleSeries(BaseModel):
    __tablename__ = "schedule_series"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("clients.id"), nullable=True)
    persona_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("personas.id"), nullable=True)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    shift_template_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("shift_templates.id"), nullable=True)
    recurrence_type: Mapped[str] = mapped_column(String(20), nullable=False, server_default="none")
    recurrence_days: Mapped[str | None] = mapped_column(String(50), nullable=True)
    start_date: Mapped[str] = mapped_column(Date, nullable=False)
    end_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    max_occurrences: Mapped[int | None] = mapped_column(Integer, nullable=True)
    default_start_time: Mapped[str] = mapped_column(String(5), nullable=False)
    default_end_time: Mapped[str] = mapped_column(String(5), nullable=False)
    default_break_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    default_priority: Mapped[str] = mapped_column(String(10), default="normal", nullable=False)
    default_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(20), default="#3b82f6", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    total_generated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    client: Mapped["Client | None"] = relationship()
    persona: Mapped["Persona | None"] = relationship()
    employee: Mapped["Employee | None"] = relationship(foreign_keys=[employee_id])
    schedules: Mapped[list["Schedule"]] = relationship(back_populates="series")


class Schedule(BaseModel):
    __tablename__ = "schedules"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    client_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("clients.id"), nullable=True, index=True)
    persona_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("personas.id"), nullable=True)
    series_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("schedule_series.id"), nullable=True, index=True)
    shift_template_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("shift_templates.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[str] = mapped_column(Date, nullable=False)
    end_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    recurrence: Mapped[str] = mapped_column(String(20), default="none", nullable=False)
    recurrence_type: Mapped[str] = mapped_column(String(20), default="none", nullable=False)
    recurrence_days: Mapped[str | None] = mapped_column(String(50), nullable=True)
    occurrence_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    client: Mapped["Client | None"] = relationship()
    persona: Mapped["Persona | None"] = relationship()
    series: Mapped["ScheduleSeries | None"] = relationship(back_populates="schedules")
    shift_template: Mapped["ShiftTemplate | None"] = relationship()
    shifts: Mapped[list["Shift"]] = relationship(back_populates="schedule", cascade="all, delete-orphan")


class Shift(BaseModel):
    __tablename__ = "shifts"

    schedule_id: Mapped[str] = mapped_column(String(36), ForeignKey("schedules.id"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    client_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("clients.id"), nullable=True, index=True)
    persona_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("personas.id"), nullable=True, index=True)
    project_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    shift_template_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("shift_templates.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#3b82f6", nullable=False)
    shift_date: Mapped[str] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)
    break_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    priority: Mapped[str] = mapped_column(String(10), default="normal", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="scheduled", nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)
    checklist_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    history_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    schedule: Mapped["Schedule"] = relationship(back_populates="shifts")
    access_records: Mapped[list["AccessRecord"]] = relationship(back_populates="shift")
    employee: Mapped["Employee | None"] = relationship(foreign_keys=[employee_id])
    client_rel: Mapped["Client | None"] = relationship(foreign_keys=[client_id], viewonly=True)
    persona: Mapped["Persona | None"] = relationship()
    shift_template: Mapped["ShiftTemplate | None"] = relationship()


# Late-binding imports to resolve cross-file forward references
from app.shared.database.models_clients import Client, Persona  # noqa: E402, F401
from app.shared.database.models_access import AccessRecord  # noqa: E402, F401
from app.shared.database.models_hr import Employee  # noqa: E402, F401
