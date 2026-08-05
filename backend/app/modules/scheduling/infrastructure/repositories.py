from datetime import date, datetime, timedelta

from sqlalchemy import func, select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.shared.database.models_scheduling import Schedule, Shift, ShiftTemplate, ScheduleSeries
from app.shared.database.models_hr import Employee
from app.shared.database.models_clients import Client, Persona


class ShiftTemplateRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, template_id: str) -> ShiftTemplate | None:
        result = await self.db.execute(
            select(ShiftTemplate).where(ShiftTemplate.id == template_id, ShiftTemplate.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> ShiftTemplate:
        template = ShiftTemplate(**kwargs)
        self.db.add(template)
        await self.db.flush()
        return template

    async def update(self, template_id: str, **kwargs: dict) -> ShiftTemplate | None:
        await self.db.execute(update(ShiftTemplate).where(ShiftTemplate.id == template_id).values(**kwargs))
        await self.db.flush()
        return await self.get_by_id(template_id)

    async def soft_delete(self, template_id: str) -> None:
        await self.db.execute(update(ShiftTemplate).where(ShiftTemplate.id == template_id).values(is_deleted=True))
        await self.db.flush()

    async def list_by_company(self, company_id: str, skip: int = 0, limit: int = 100) -> tuple[list[ShiftTemplate], int]:
        query = select(ShiftTemplate).where(ShiftTemplate.is_deleted == False)
        count_q = select(func.count(ShiftTemplate.id)).where(ShiftTemplate.is_deleted == False)
        if company_id:
            if company_id == "dla-company-main":
                comp_filter = (ShiftTemplate.company_id != None)
            else:
                comp_filter = (ShiftTemplate.company_id == company_id) | (ShiftTemplate.company_id == None) | (ShiftTemplate.company_id == "dla-company-main")
            query = query.where(comp_filter)
            count_q = count_q.where(comp_filter)
        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(query.offset(skip).limit(limit).order_by(ShiftTemplate.name))
        return list(result.scalars().all()), total


class ScheduleRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, schedule_id: str) -> Schedule | None:
        result = await self.db.execute(select(Schedule).where(Schedule.id == schedule_id, Schedule.is_deleted == False))
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> Schedule:
        for field in ("start_date", "end_date"):
            val = kwargs.get(field)
            if isinstance(val, str) and val:
                try:
                    kwargs[field] = date.fromisoformat(val)
                except ValueError:
                    kwargs[field] = None
            elif not val:
                kwargs[field] = None
        schedule = Schedule(**kwargs)
        self.db.add(schedule)
        await self.db.flush()
        return schedule

    async def update(self, schedule_id: str, **kwargs: dict) -> Schedule | None:
        for field in ("start_date", "end_date"):
            val = kwargs.get(field)
            if isinstance(val, str) and val:
                try:
                    kwargs[field] = date.fromisoformat(val)
                except ValueError:
                    kwargs.pop(field, None)
            elif not val and field in kwargs:
                kwargs[field] = None
        await self.db.execute(update(Schedule).where(Schedule.id == schedule_id).values(**kwargs))
        await self.db.flush()
        return await self.get_by_id(schedule_id)

    async def soft_delete(self, schedule_id: str) -> None:
        await self.db.execute(update(Schedule).where(Schedule.id == schedule_id).values(is_deleted=True))
        await self.db.flush()

    async def cancel_shifts(self, schedule_id: str) -> int:
        """Cancel all active shifts in a schedule."""
        result = await self.db.execute(
            update(Shift).where(
                Shift.schedule_id == schedule_id, Shift.is_deleted == False,
                Shift.status.in_(["scheduled", "in_progress"])
            ).values(status="cancelled")
        )
        await self.db.flush()
        return result.rowcount

    async def list_by_company(self, company_id: str, skip: int = 0, limit: int = 25) -> tuple[list[Schedule], int]:
        query = select(Schedule).where(Schedule.is_deleted == False)
        count_q = select(func.count(Schedule.id)).where(Schedule.is_deleted == False)
        if company_id:
            if company_id == "dla-company-main":
                comp_filter = (Schedule.company_id != None)
            else:
                comp_filter = (Schedule.company_id == company_id) | (Schedule.company_id == None) | (Schedule.company_id == "dla-company-main")
            query = query.where(comp_filter)
            count_q = count_q.where(comp_filter)
        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(query.offset(skip).limit(limit).order_by(Schedule.created_at.desc()))
        return list(result.scalars().all()), total

    async def count_shifts(self, schedule_id: str) -> int:
        q = select(func.count(Shift.id)).where(Shift.schedule_id == schedule_id, Shift.is_deleted == False)
        return (await self.db.execute(q)).scalar() or 0


class ShiftRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, shift_id: str) -> Shift | None:
        result = await self.db.execute(select(Shift).where(Shift.id == shift_id, Shift.is_deleted == False))
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> Shift:
        val = kwargs.get("shift_date")
        if isinstance(val, str) and val:
            try:
                kwargs["shift_date"] = date.fromisoformat(val)
            except ValueError:
                kwargs["shift_date"] = None
        elif not val:
            kwargs["shift_date"] = None
        shift = Shift(**kwargs)
        self.db.add(shift)
        await self.db.flush()
        return shift

    async def update(self, shift_id: str, **kwargs: dict) -> Shift | None:
        val = kwargs.get("shift_date")
        if isinstance(val, str) and val:
            try:
                kwargs["shift_date"] = date.fromisoformat(val)
            except ValueError:
                kwargs.pop("shift_date", None)
        elif not val and "shift_date" in kwargs:
            kwargs["shift_date"] = None
        await self.db.execute(update(Shift).where(Shift.id == shift_id).values(**kwargs))
        await self.db.flush()
        return await self.get_by_id(shift_id)

    async def soft_delete(self, shift_id: str) -> None:
        await self.db.execute(update(Shift).where(Shift.id == shift_id).values(is_deleted=True))
        await self.db.flush()

    async def list_by_schedule(self, schedule_id: str, skip: int = 0, limit: int = 100) -> list[Shift]:
        result = await self.db.execute(
            select(Shift)
            .options(selectinload(Shift.employee), selectinload(Shift.client_rel), selectinload(Shift.persona))
            .where(Shift.schedule_id == schedule_id, Shift.is_deleted == False)
            .offset(skip).limit(limit).order_by(Shift.shift_date)
        )
        return list(result.scalars().unique().all())

    async def list_by_employee(self, employee_id: str, start_date: str | None = None, end_date: str | None = None) -> list[Shift]:
        query = select(Shift).options(selectinload(Shift.employee), selectinload(Shift.client_rel), selectinload(Shift.persona)).where(Shift.employee_id == employee_id, Shift.is_deleted == False)
        if start_date:
            query = query.where(Shift.shift_date >= date.fromisoformat(start_date))
        if end_date:
            query = query.where(Shift.shift_date <= date.fromisoformat(end_date))
        result = await self.db.execute(query.order_by(Shift.shift_date, Shift.start_time))
        return list(result.scalars().unique().all())

    async def list_by_date_range(self, company_id: str, start_date: str, end_date: str) -> list[Shift]:
        try:
            sd = date.fromisoformat(start_date)
            ed = date.fromisoformat(end_date)
        except (ValueError, TypeError):
            return []
            
        query = select(Shift).join(Schedule).options(selectinload(Shift.employee), selectinload(Shift.client_rel), selectinload(Shift.persona)).where(
            Shift.shift_date >= sd, Shift.shift_date <= ed, Shift.is_deleted == False
        )
        if company_id:
            if company_id == "dla-company-main":
                comp_filter = (Schedule.company_id != None)
            else:
                comp_filter = (Schedule.company_id == company_id) | (Schedule.company_id == None) | (Schedule.company_id == "dla-company-main")
            query = query.where(comp_filter)
            
        result = await self.db.execute(query.order_by(Shift.shift_date, Shift.start_time))
        return list(result.scalars().unique().all())

    async def list_by_date(self, company_id: str, shift_date: str) -> list[Shift]:
        try:
            sd = date.fromisoformat(shift_date)
        except (ValueError, TypeError):
            return []
        
        query = select(Shift).join(Schedule).options(selectinload(Shift.employee), selectinload(Shift.client_rel), selectinload(Shift.persona)).where(
            Shift.shift_date == sd, Shift.is_deleted == False
        )
        if company_id:
            if company_id == "dla-company-main":
                comp_filter = (Schedule.company_id != None)
            else:
                comp_filter = (Schedule.company_id == company_id) | (Schedule.company_id == None) | (Schedule.company_id == "dla-company-main")
            query = query.where(comp_filter)
            
        result = await self.db.execute(query.order_by(Shift.start_time))
        return list(result.scalars().unique().all())

    async def count_by_status(self, company_id: str, status_val: str, shift_date: str | None = None) -> int:
        query = select(func.count(Shift.id)).join(Schedule).where(
            Shift.status == status_val, Shift.is_deleted == False
        )
        if company_id:
            if company_id == "dla-company-main":
                comp_filter = (Schedule.company_id != None)
            else:
                comp_filter = (Schedule.company_id == company_id) | (Schedule.company_id == None) | (Schedule.company_id == "dla-company-main")
            query = query.where(comp_filter)
        if shift_date:
            try:
                sd = date.fromisoformat(shift_date)
            except (ValueError, TypeError):
                sd = shift_date
            query = query.where(Shift.shift_date == sd)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def check_conflicts(self, employee_id: str, shift_date_val: date, start_time: str, end_time: str, exclude_shift_id: str | None = None) -> list[Shift]:
        query = select(Shift).where(
            Shift.employee_id == employee_id,
            Shift.shift_date == shift_date_val,
            Shift.is_deleted == False,
            Shift.status.in_(["scheduled", "in_progress"]),
        )
        if exclude_shift_id:
            query = query.where(Shift.id != exclude_shift_id)
        result = await self.db.execute(query)
        existing = list(result.scalars().all())
        conflicts = []
        for s in existing:
            if not (end_time <= s.start_time or start_time >= s.end_time):
                conflicts.append(s)
        return conflicts

    async def check_rest_period(self, employee_id: str, shift_date_val: date, start_time: str,
                                exclude_shift_id: str | None = None, min_rest_hours: int = 8) -> list[Shift]:
        """Check if there's at least min_rest_hours between the end of previous shift and start of new shift."""
        # Check day before
        prev_day = shift_date_val - timedelta(days=1)
        query = select(Shift).where(
            Shift.employee_id == employee_id,
            Shift.shift_date == prev_day,
            Shift.is_deleted == False,
            Shift.status.in_(["scheduled", "in_progress"]),
        )
        if exclude_shift_id:
            query = query.where(Shift.id != exclude_shift_id)
        result = await self.db.execute(query)
        prev_shifts = list(result.scalars().all())

        violations = []
        new_h, new_m = map(int, start_time.split(":"))
        new_minutes = new_h * 60 + new_m

        for s in prev_shifts:
            prev_h, prev_m = map(int, s.end_time.split(":"))
            prev_minutes = prev_h * 60 + prev_m
            rest_minutes = (24 * 60 - prev_minutes) + new_minutes
            if rest_minutes < min_rest_hours * 60:
                violations.append(s)

        # Also check same day (shift starting before previous one ends)
        same_day = await self.check_conflicts(employee_id, shift_date_val, start_time, start_time, exclude_shift_id)
        # If same-day overlap exists, it's caught by check_conflicts, not rest period

        return violations

    async def soft_delete_by_schedule(self, schedule_id: str) -> int:
        """Soft-delete all shifts in a schedule. Returns count."""
        result = await self.db.execute(
            update(Shift).where(Shift.schedule_id == schedule_id, Shift.is_deleted == False).values(is_deleted=True)
        )
        await self.db.flush()
        return result.rowcount

    async def cancel_by_schedule(self, schedule_id: str) -> int:
        """Set status to 'cancelled' for all shifts in a schedule. Returns count."""
        result = await self.db.execute(
            update(Shift).where(
                Shift.schedule_id == schedule_id, Shift.is_deleted == False,
                Shift.status.in_(["scheduled", "in_progress"])
            ).values(status="cancelled")
        )
        await self.db.flush()
        return result.rowcount

    async def cancel_shift(self, shift_id: str) -> Shift | None:
        """Cancel a single shift."""
        await self.db.execute(
            update(Shift).where(Shift.id == shift_id, Shift.is_deleted == False).values(status="cancelled")
        )
        await self.db.flush()
        result = await self.db.execute(
            select(Shift)
            .options(joinedload(Shift.employee), joinedload(Shift.client_rel), joinedload(Shift.persona))
            .where(Shift.id == shift_id, Shift.is_deleted == False)
        )
        return result.unique().scalar_one_or_none()

    async def bulk_create(self, shifts_data: list[dict]) -> list[Shift]:
        shifts = []
        for data in shifts_data:
            val = data.get("shift_date")
            if isinstance(val, str) and val:
                try:
                    data["shift_date"] = date.fromisoformat(val)
                except ValueError:
                    data["shift_date"] = None
            shift = Shift(**data)
            self.db.add(shift)
            shifts.append(shift)
        await self.db.flush()
        return shifts


class ScheduleSeriesRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, series_id: str) -> ScheduleSeries | None:
        result = await self.db.execute(
            select(ScheduleSeries)
            .options(selectinload(ScheduleSeries.employee))
            .where(ScheduleSeries.id == series_id, ScheduleSeries.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> ScheduleSeries:
        for field in ("start_date", "end_date"):
            val = kwargs.get(field)
            if isinstance(val, str) and val:
                try:
                    kwargs[field] = date.fromisoformat(val)
                except ValueError:
                    kwargs[field] = None
            elif not val:
                kwargs[field] = None
        series = ScheduleSeries(**kwargs)
        self.db.add(series)
        await self.db.flush()
        return series

    async def update(self, series_id: str, **kwargs: dict) -> ScheduleSeries | None:
        for field in ("start_date", "end_date"):
            val = kwargs.get(field)
            if isinstance(val, str) and val:
                try:
                    kwargs[field] = date.fromisoformat(val)
                except ValueError:
                    kwargs.pop(field, None)
            elif not val and field in kwargs:
                kwargs[field] = None
        await self.db.execute(update(ScheduleSeries).where(ScheduleSeries.id == series_id).values(**kwargs))
        await self.db.flush()
        return await self.get_by_id(series_id)

    async def soft_delete(self, series_id: str) -> None:
        await self.db.execute(update(ScheduleSeries).where(ScheduleSeries.id == series_id).values(is_deleted=True, is_active=False))
        await self.db.flush()

    async def list_by_company(self, company_id: str, skip: int = 0, limit: int = 25) -> tuple[list[ScheduleSeries], int]:
        query = (
            select(ScheduleSeries)
            .options(selectinload(ScheduleSeries.employee))
            .where(ScheduleSeries.is_deleted == False)
        )
        count_q = select(func.count(ScheduleSeries.id)).where(ScheduleSeries.is_deleted == False)
        if company_id:
            if company_id == "dla-company-main":
                comp_filter = (ScheduleSeries.company_id != None)
            else:
                comp_filter = (ScheduleSeries.company_id == company_id) | (ScheduleSeries.company_id == None) | (ScheduleSeries.company_id == "dla-company-main")
            query = query.where(comp_filter)
            count_q = count_q.where(comp_filter)
        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(query.offset(skip).limit(limit).order_by(ScheduleSeries.created_at.desc()))
        return list(result.scalars().unique().all()), total

    async def increment_generated(self, series_id: str, count: int) -> None:
        from sqlalchemy import text
        await self.db.execute(
            update(ScheduleSeries)
            .where(ScheduleSeries.id == series_id)
            .values(total_generated=ScheduleSeries.total_generated + count)
        )
        await self.db.flush()
