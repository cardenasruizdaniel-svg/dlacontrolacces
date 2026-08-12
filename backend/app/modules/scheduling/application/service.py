from math import ceil
from datetime import date, datetime, timedelta

from fastapi import HTTPException, status

from app.modules.scheduling.infrastructure.repositories import (
    ScheduleRepository,
    ShiftRepository,
    ShiftTemplateRepository,
    ScheduleSeriesRepository,
)


def generate_recurrence_dates(
    recurrence_type: str,
    start_date: date,
    end_date: date | None = None,
    max_occurrences: int | None = None,
    recurrence_days: str | None = None,
) -> list[date]:
    """Generate dates based on recurrence rules.
    recurrence_type: none, daily, weekly, biweekly, monthly, custom
    recurrence_days: comma-separated day-of-week numbers (1=Mon..7=Sun) for weekly/custom
    """
    if recurrence_type == "none" or not start_date:
        return [start_date] if start_date else []

    dates: list[date] = []
    current = start_date
    limit = max_occurrences or 365
    deadline = end_date or (start_date + timedelta(days=365))

    while len(dates) < limit and current <= deadline:
        if recurrence_type == "daily":
            dates.append(current)
            current += timedelta(days=1)

        elif recurrence_type in ("weekly", "biweekly", "custom"):
            if recurrence_days:
                try:
                    allowed_days = [int(d.strip()) for d in recurrence_days.split(",")]
                except ValueError:
                    allowed_days = []
                if allowed_days:
                    python_weekday = current.isoweekday()
                    if python_weekday in allowed_days:
                        dates.append(current)
                else:
                    dates.append(current)
                current += timedelta(days=1)
            else:
                dates.append(current)
                current += timedelta(days=14 if recurrence_type == "biweekly" else 7)

        elif recurrence_type == "monthly":
            dates.append(current)
            month = current.month + 1
            year = current.year
            if month > 12:
                month = 1
                year += 1
            day = min(current.day, 28)
            current = date(year, month, day)

        else:
            break

    return dates


class SchedulingService:
    def __init__(self, template_repo: ShiftTemplateRepository, schedule_repo: ScheduleRepository,
                 shift_repo: ShiftRepository, series_repo: ScheduleSeriesRepository | None = None) -> None:
        self.template_repo = template_repo
        self.schedule_repo = schedule_repo
        self.shift_repo = shift_repo
        self.series_repo = series_repo

    def _validate_future_datetime(self, shift_date: date | str, start_time_str: str | None = None) -> date:
        from datetime import datetime, date as _date, timedelta, timezone
        now_utc = datetime.now(timezone.utc)
        now_cot = now_utc - timedelta(hours=5)  # Colombian local time (COT, UTC-5)
        today_cot = now_cot.date()

        if isinstance(shift_date, str):
            try:
                shift_date_val = _date.fromisoformat(shift_date)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {shift_date}")
        else:
            shift_date_val = shift_date

        if shift_date_val < today_cot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede programar una visita en una fecha pasada ({shift_date_val.strftime('%d/%m/%Y')}). La fecha mínima permitida es hoy ({today_cot.strftime('%d/%m/%Y')})."
            )

        if shift_date_val == today_cot and start_time_str:
            try:
                sh, sm = map(int, start_time_str.split(":")[:2])
                current_time = now_cot.time()
                if (sh, sm) < (current_time.hour, current_time.minute):
                    now_formatted = now_cot.strftime("%I:%M %p")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"No se puede programar una visita en una hora pasada del día de hoy ({start_time_str}). La hora actual del servidor es {now_formatted}. Debe seleccionar una hora igual o posterior."
                    )
            except HTTPException:
                raise
            except Exception:
                pass

        return shift_date_val

    # --- Shift Templates ---

    async def create_template(self, **kwargs: dict):
        return await self.template_repo.create(**kwargs)

    async def get_template(self, template_id: str):
        template = await self.template_repo.get_by_id(template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift template not found")
        return template

    async def update_template(self, template_id: str, **kwargs: dict):
        template = await self.template_repo.get_by_id(template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift template not found")
        return await self.template_repo.update(template_id, **kwargs)

    async def delete_template(self, template_id: str, db: any = None) -> None:
        template = await self.template_repo.get_by_id(template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla de turno no encontrada")

        if db:
            from sqlalchemy import select, func
            from app.shared.database.models_scheduling import Shift, ScheduleSeries

            shift_count = (await db.execute(select(func.count(Shift.id)).where(Shift.shift_template_id == template_id))).scalar() or 0
            series_count = (await db.execute(select(func.count(ScheduleSeries.id)).where(ScheduleSeries.shift_template_id == template_id))).scalar() or 0

            # Allow soft delete even if in use. The history remains for old shifts.
            
        await self.template_repo.soft_delete(template_id)

    async def list_templates(self, company_id: str, page: int = 1, page_size: int = 100) -> dict:
        skip = (page - 1) * page_size
        items, total = await self.template_repo.list_by_company(company_id, skip=skip, limit=page_size)
        if not items:
            has_ever = await self.template_repo.has_any_templates_ever(company_id)
            if not has_ever:
                default_templates = [
                    {"name": "Turno Mañana", "color": "#3b82f6", "start_time": "07:00", "end_time": "15:00", "duration_hours": 8.0, "shift_type": "morning", "observations": "Turno ordinario diurno"},
                    {"name": "Turno Tarde", "color": "#10b981", "start_time": "15:00", "end_time": "23:00", "duration_hours": 8.0, "shift_type": "afternoon", "observations": "Turno vespertino"},
                    {"name": "Turno Noche", "color": "#8b5cf6", "start_time": "23:00", "end_time": "07:00", "duration_hours": 8.0, "shift_type": "night", "observations": "Turno nocturno recargo Art. 168 CST"},
                    {"name": "Visita Domiciliaria AM", "color": "#06b6d4", "start_time": "08:00", "end_time": "12:00", "duration_hours": 4.0, "shift_type": "home_visit", "observations": "Atención de pacientes domiciliaria mañana"},
                    {"name": "Visita Domiciliaria PM", "color": "#f59e0b", "start_time": "13:00", "end_time": "17:00", "duration_hours": 4.0, "shift_type": "home_visit", "observations": "Atención de pacientes domiciliaria tarde"},
                ]
                for dt in default_templates:
                    try:
                        await self.template_repo.create(company_id=company_id, **dt)
                    except Exception:
                        pass
                items, total = await self.template_repo.list_by_company(company_id, skip=skip, limit=page_size)

        return {"items": items, "total": total, "page": page, "page_size": page_size,
                "total_pages": ceil(total / page_size) if total > 0 else 0}

    # --- Schedules ---

    async def create_schedule(self, **kwargs: dict):
        start_date_val = kwargs.get("start_date")
        if start_date_val:
            self._validate_future_datetime(start_date_val)
        return await self.schedule_repo.create(**kwargs)

    async def get_schedule(self, schedule_id: str):
        schedule = await self.schedule_repo.get_by_id(schedule_id)
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
        return schedule

    async def update_schedule(self, schedule_id: str, **kwargs: dict):
        schedule = await self.schedule_repo.get_by_id(schedule_id)
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
        return await self.schedule_repo.update(schedule_id, **kwargs)

    async def delete_schedule(self, schedule_id: str) -> None:
        schedule = await self.schedule_repo.get_by_id(schedule_id)
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
        await self.schedule_repo.soft_delete(schedule_id)

    async def list_schedules(self, company_id: str, page: int = 1, page_size: int = 25) -> dict:
        skip = (page - 1) * page_size
        items, total = await self.schedule_repo.list_by_company(company_id, skip=skip, limit=page_size)
        return {"items": items, "total": total, "page": page, "page_size": page_size,
                "total_pages": ceil(total / page_size) if total > 0 else 0}

    # --- Shifts ---

    async def create_shift(self, **kwargs: dict):
        shift_date = kwargs.get("shift_date")
        employee_id = kwargs.get("employee_id")
        start_time = kwargs.get("start_time", "08:00")
        end_time = kwargs.get("end_time", "17:00")

        if shift_date is not None:
            shift_date_val = self._validate_future_datetime(shift_date, start_time)
        else:
            shift_date_val = None

        if employee_id and shift_date_val:
            break_minutes = kwargs.get("break_minutes", 60)
            validation = await self.validate_shift(employee_id, shift_date_val, start_time, end_time, break_minutes)
            if not validation["valid"]:
                msgs = "; ".join(c["message"] for c in validation["conflicts"])
                raise HTTPException(status_code=409, detail=f"Conflicto de programación: {msgs}")

        return await self.shift_repo.create(**kwargs)

    async def get_shift(self, shift_id: str):
        shift = await self.shift_repo.get_by_id(shift_id)
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
        return shift

    async def update_shift(self, shift_id: str, **kwargs: dict):
        shift = await self.shift_repo.get_by_id(shift_id)
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

        employee_id = kwargs.get("employee_id", shift.employee_id)
        shift_date = kwargs.get("shift_date")
        start_time = kwargs.get("start_time", shift.start_time)
        end_time = kwargs.get("end_time", shift.end_time)

        if shift_date is not None:
            from datetime import date as _date
            if isinstance(shift_date, str):
                shift_date_val = _date.fromisoformat(shift_date)
            else:
                shift_date_val = shift_date
        else:
            shift_date_val = shift.shift_date if isinstance(shift.shift_date, date) else date.fromisoformat(str(shift.shift_date)) if shift.shift_date else None

        break_minutes = kwargs.get("break_minutes", shift.break_minutes or 60)

        if employee_id and shift_date_val and start_time and end_time:
            validation = await self.validate_shift(employee_id, shift_date_val, start_time, end_time, break_minutes, exclude_shift_id=shift_id)
            if not validation["valid"]:
                msgs = "; ".join(c["message"] for c in validation["conflicts"])
                raise HTTPException(status_code=409, detail=f"Conflicto de programación: {msgs}")

        return await self.shift_repo.update(shift_id, **kwargs)

    async def delete_shift(self, shift_id: str) -> None:
        shift = await self.shift_repo.get_by_id(shift_id)
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
        await self.shift_repo.soft_delete(shift_id)

    async def list_shifts(self, schedule_id: str):
        return await self.shift_repo.list_by_schedule(schedule_id)

    async def list_employee_shifts(self, employee_id: str, start_date=None, end_date=None):
        return await self.shift_repo.list_by_employee(employee_id, start_date=start_date, end_date=end_date)

    async def get_calendar(self, company_id: str, start_date: str, end_date: str):
        return await self.shift_repo.list_by_date_range(company_id, start_date, end_date)

    async def update_shift_status(self, shift_id: str, status_val: str):
        shift = await self.shift_repo.get_by_id(shift_id)
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
        return await self.shift_repo.update(shift_id, status=status_val)

    async def get_daily_summary(self, company_id: str, shift_date: str) -> dict:
        scheduled = await self.shift_repo.count_by_status(company_id, "scheduled", shift_date)
        in_progress = await self.shift_repo.count_by_status(company_id, "in_progress", shift_date)
        completed = await self.shift_repo.count_by_status(company_id, "completed", shift_date)
        cancelled = await self.shift_repo.count_by_status(company_id, "cancelled", shift_date)
        absent = await self.shift_repo.count_by_status(company_id, "absent", shift_date)
        return {
            "date": shift_date, "scheduled": scheduled, "in_progress": in_progress,
            "completed": completed, "cancelled": cancelled, "absent": absent,
            "total": scheduled + in_progress + completed + cancelled + absent,
        }

    # --- Conflict Detection & Enhanced Validation ---

    async def validate_shift(self, employee_id: str, shift_date_val: date, start_time: str,
                             end_time: str, break_minutes: int = 60,
                             exclude_shift_id: str | None = None) -> dict:
        """Enhanced conflict validation: double-booking, excessive hours, rest periods, work hours."""
        conflicts = []
        warnings = []

        # 1. Double-booking check
        existing = await self.shift_repo.check_conflicts(employee_id, shift_date_val, start_time, end_time, exclude_shift_id)
        for c in existing:
            conflicts.append({
                "type": "double_booking",
                "message": f"El empleado ya tiene un turno programado de {c.start_time} a {c.end_time} en esta fecha",
                "conflicting_shift_id": c.id,
                "employee_id": employee_id,
                "date": str(shift_date_val),
            })

        # 2. Excessive hours (>12h daily) and valid time check
        start_h, start_m = map(int, start_time.split(":")[:2])
        end_h, end_m = map(int, end_time.split(":")[:2])
        start_total_mins = start_h * 60 + start_m
        end_total_mins = end_h * 60 + end_m
        
        if start_total_mins == end_total_mins:
            conflicts.append({
                "type": "invalid_time",
                "message": "La hora de fin debe ser diferente a la hora de inicio",
                "conflicting_shift_id": None,
                "employee_id": employee_id,
                "date": str(shift_date_val),
            })
            work_minutes = 0
        else:
            work_minutes = end_total_mins - start_total_mins
            if work_minutes < 0:
                work_minutes += 24 * 60  # overnight shift

        effective_break = min(break_minutes, max(0, work_minutes - 1))
        total_hours = (work_minutes - effective_break) / 60
        if total_hours > 24:
            conflicts.append({
                "type": "excessive_hours",
                "message": f"Jornada de {total_hours:.1f}h excede el máximo de 24 horas diarias",
                "conflicting_shift_id": None,
                "employee_id": employee_id,
                "date": str(shift_date_val),
            })
        elif total_hours > 12:
            warnings.append(f"Jornada de {total_hours:.1f}h excede las 12 horas diarias (revisar límites legales)")

        # 3. Rest period check (< 8h between consecutive shifts)
        rest_conflicts = await self.shift_repo.check_rest_period(employee_id, shift_date_val, start_time, exclude_shift_id)
        for c in rest_conflicts:
            conflicts.append({
                "type": "insufficient_rest",
                "message": f"Periodo de descanso insuficiente: turno anterior termina a {c.end_time}",
                "conflicting_shift_id": c.id,
                "employee_id": employee_id,
                "date": str(shift_date_val),
            })

        # 4. Warning for >8h (overtime notice)
        if 8 < total_hours <= 12:
            warnings.append(f"Jornada de {total_hours:.1f}h genera horas extras (supera 8h diarias)")

        return {"valid": len(conflicts) == 0, "conflicts": conflicts, "warnings": warnings}

    async def check_conflicts(self, company_id: str, events: list[dict]) -> list[dict]:
        conflicts = []
        for ev in events:
            if not ev.get("employee_id"):
                continue
            try:
                shift_date_val = date.fromisoformat(ev["shift_date"])
                self._validate_future_datetime(shift_date_val, ev.get("start_time"))
            except HTTPException as exc:
                conflicts.append({
                    "type": "past_datetime",
                    "message": exc.detail,
                    "conflicting_shift_id": None,
                    "employee_id": ev.get("employee_id"),
                    "date": ev.get("shift_date"),
                })
                continue
            except (ValueError, KeyError):
                continue
            result = await self.validate_shift(
                employee_id=ev["employee_id"],
                shift_date_val=shift_date_val,
                start_time=ev["start_time"],
                end_time=ev["end_time"],
                break_minutes=ev.get("break_minutes", 60),
            )
            conflicts.extend(result["conflicts"])
        return conflicts

    async def bulk_save(self, company_id: str, events: list[dict], schedule_id: str | None = None) -> dict:
        # Filter out events without a valid shift_date (not yet assigned via drag-and-drop)
        valid_events = [ev for ev in events if ev.get("shift_date")]
        if not valid_events:
            return {"success": False, "created": 0, "conflicts": [],
                    "message": "Ningún evento tiene fecha asignada. Arrastre los eventos al calendario antes de guardar."}

        conflicts = await self.check_conflicts(company_id, valid_events)
        if conflicts:
            return {"success": False, "created": 0, "conflicts": conflicts,
                    "message": f"{len(conflicts)} conflicto(s) detectado(s). Corrija antes de guardar."}

        dates = [ev["shift_date"] for ev in valid_events]
        if not schedule_id:
            schedule = await self.schedule_repo.create(
                company_id=company_id,
                name=f"Programación {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                start_date=min(dates),
                end_date=max(dates),
            )
            schedule_id = schedule.id

        shifts_data = []
        skipped = 0
        for ev in valid_events:
            if not ev.get("employee_id"):
                skipped += 1
                continue
            ev_date_val = ev.get("shift_date")
            if ev_date_val:
                try:
                    self._validate_future_datetime(ev_date_val, ev.get("start_time"))
                except HTTPException:
                    skipped += 1
                    continue
            shifts_data.append({
                "schedule_id": schedule_id,
                "employee_id": ev["employee_id"],
                "client_id": ev.get("client_id") or None,
                "persona_id": ev.get("persona_id") or None,
                "project_id": ev.get("project_id") or None,
                "shift_template_id": ev.get("shift_template_id") or None,
                "name": ev["name"],
                "color": ev.get("color", "#3b82f6"),
                "shift_date": ev["shift_date"],
                "start_time": ev["start_time"],
                "end_time": ev["end_time"],
                "break_minutes": ev.get("break_minutes", 0),
                "priority": ev.get("priority", "normal"),
                "notes": ev.get("notes") or None,
                "observations": ev.get("observations") or None,
            })

        await self.shift_repo.bulk_create(shifts_data)
        msg = f"{len(shifts_data)} turno(s) creado(s) exitosamente."
        if skipped > 0:
            msg += f" {skipped} evento(s) omitido(s)."
        return {"success": True, "created": len(shifts_data), "conflicts": [], "message": msg}

    # --- Series CRUD (Recurring Events) ---

    async def create_series(self, **kwargs: dict):
        if not self.series_repo:
            raise HTTPException(status_code=500, detail="Series repository not configured")
        start_date_val = kwargs.get("start_date")
        if start_date_val:
            self._validate_future_datetime(start_date_val, kwargs.get("default_start_time"))
        return await self.series_repo.create(**kwargs)

    async def get_series(self, series_id: str):
        if not self.series_repo:
            raise HTTPException(status_code=500, detail="Series repository not configured")
        series = await self.series_repo.get_by_id(series_id)
        if not series:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")
        return series

    async def update_series(self, series_id: str, **kwargs: dict):
        if not self.series_repo:
            raise HTTPException(status_code=500, detail="Series repository not configured")
        series = await self.series_repo.get_by_id(series_id)
        if not series:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")
        return await self.series_repo.update(series_id, **kwargs)

    async def delete_series(self, series_id: str) -> None:
        if not self.series_repo:
            raise HTTPException(status_code=500, detail="Series repository not configured")
        series = await self.series_repo.get_by_id(series_id)
        if not series:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")
        await self.series_repo.soft_delete(series_id)

    async def list_series(self, company_id: str, page: int = 1, page_size: int = 25) -> dict:
        if not self.series_repo:
            return {"items": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 0}
        skip = (page - 1) * page_size
        items, total = await self.series_repo.list_by_company(company_id, skip=skip, limit=page_size)
        return {"items": items, "total": total, "page": page, "page_size": page_size,
                "total_pages": ceil(total / page_size) if total > 0 else 0}

    async def generate_series_shifts(self, series_id: str) -> dict:
        """Generate schedule+shifts from a series definition based on recurrence rules."""
        if not self.series_repo:
            raise HTTPException(status_code=500, detail="Series repository not configured")

        series = await self.series_repo.get_by_id(series_id)
        if not series:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")

        # Generate dates based on recurrence
        start = series.start_date if isinstance(series.start_date, date) else date.fromisoformat(str(series.start_date))
        end = series.end_date if series.end_date and isinstance(series.end_date, date) else (
            date.fromisoformat(str(series.end_date)) if series.end_date else None
        )
        dates = generate_recurrence_dates(
            recurrence_type=series.recurrence_type,
            start_date=start,
            end_date=end,
            max_occurrences=series.max_occurrences,
            recurrence_days=series.recurrence_days,
        )

        from datetime import date as _date
        dates = [d for d in dates if d >= _date.today()]

        if not dates:
            return {"success": False, "created": 0, "message": "No se generaron fechas con las reglas actuales."}

        # Create a schedule for this generation run
        schedule = await self.schedule_repo.create(
            company_id=series.company_id,
            name=f"{series.name} - Generado",
            description=f"Generado desde serie: {series.name}",
            start_date=str(dates[0]),
            end_date=str(dates[-1]) if dates else None,
            series_id=series_id,
            client_id=series.client_id,
            persona_id=series.persona_id,
            shift_template_id=series.shift_template_id,
            recurrence_type=series.recurrence_type,
            recurrence_days=series.recurrence_days,
        )

        # Validate and create shifts for each date
        shifts_data = []
        skipped = 0
        for i, d in enumerate(dates):
            validation = await self.validate_shift(
                employee_id=series.employee_id,
                shift_date_val=d,
                start_time=series.default_start_time,
                end_time=series.default_end_time,
                break_minutes=series.default_break_minutes,
            )
            if not validation["valid"]:
                skipped += 1
                continue

            shifts_data.append({
                "schedule_id": schedule.id,
                "employee_id": series.employee_id,
                "client_id": series.client_id,
                "persona_id": series.persona_id,
                "shift_template_id": series.shift_template_id,
                "name": series.name,
                "color": series.color,
                "shift_date": str(d),
                "start_time": series.default_start_time,
                "end_time": series.default_end_time,
                "break_minutes": series.default_break_minutes,
                "priority": series.default_priority,
                "notes": series.default_notes,
            })

        if shifts_data:
            await self.shift_repo.bulk_create(shifts_data)
            await self.series_repo.increment_generated(series_id, len(shifts_data))

        return {
            "success": True,
            "created": len(shifts_data),
            "skipped": skipped,
            "total_dates": len(dates),
            "message": f"{len(shifts_data)} turno(s) generado(s). {skipped} omitido(s) por conflictos.",
        }
