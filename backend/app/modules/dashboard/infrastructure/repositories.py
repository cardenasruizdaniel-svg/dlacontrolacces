from datetime import date, datetime, timedelta, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database.models_access import AccessRecord
from app.shared.database.models_hr import Employee
from app.shared.database.models_payroll import PayrollRecord
from app.shared.database.models_scheduling import Shift


class DashboardRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def count_employees_by_company(self, company_id: str, status: str = "active") -> int:
        r = await self.db.execute(
            select(func.count(Employee.id)).where(
                Employee.company_id == company_id, Employee.status == status, Employee.is_deleted == False
            )
        )
        return r.scalar() or 0

    async def count_active_today(self, company_id: str) -> int:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = await self.db.execute(
            select(func.count(func.distinct(AccessRecord.employee_id))).where(
                AccessRecord.record_type == "entry",
                AccessRecord.timestamp.like(f"{today}%"),
                AccessRecord.is_deleted == False,
            )
        )
        return r.scalar() or 0

    async def count_late_today(self, company_id: str) -> int:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = await self.db.execute(
            select(func.count(AccessRecord.id)).where(
                AccessRecord.record_type == "entry",
                AccessRecord.timestamp.like(f"{today}T0[7-9]%"),
                AccessRecord.is_deleted == False,
            )
        )
        return r.scalar() or 0

    async def get_total_hours_today(self) -> float:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = await self.db.execute(
            select(func.sum(AccessRecord.worked_hours)).where(
                AccessRecord.record_type == "exit",
                AccessRecord.timestamp.like(f"{today}%"),
                AccessRecord.is_deleted == False,
            )
        )
        return r.scalar() or 0.0

    async def get_total_overtime_today(self) -> float:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = await self.db.execute(
            select(func.sum(AccessRecord.overtime_hours)).where(
                AccessRecord.record_type == "exit",
                AccessRecord.timestamp.like(f"{today}%"),
                AccessRecord.is_deleted == False,
            )
        )
        return r.scalar() or 0.0

    async def get_payroll_cost_current_month(self, company_id: str) -> float:
        now = datetime.now(timezone.utc)
        r = await self.db.execute(
            select(func.sum(PayrollRecord.total_employer_cost)).where(
                PayrollRecord.company_id == company_id,
                PayrollRecord.is_deleted == False,
            )
        )
        return r.scalar() or 0.0

    async def count_shifts_by_status(self, company_id: str, status: str) -> int:
        today = date.today()
        r = await self.db.execute(
            select(func.count(Shift.id)).join(Shift.schedule).where(
                Shift.status == status, Shift.shift_date == today, Shift.is_deleted == False,
            )
        )
        return r.scalar() or 0

    async def get_recent_access_records(self, limit: int = 10) -> list[AccessRecord]:
        r = await self.db.execute(
            select(AccessRecord).where(AccessRecord.is_deleted == False)
            .order_by(AccessRecord.created_at.desc()).limit(limit)
        )
        return list(r.scalars().all())

    async def get_productivity_metrics(self, company_id: str) -> dict:
        import asyncio
        total_shifts, completed, in_progress, absent = await asyncio.gather(
            self.count_shifts_by_status(company_id, "scheduled"),
            self.count_shifts_by_status(company_id, "completed"),
            self.count_shifts_by_status(company_id, "in_progress"),
            self.count_shifts_by_status(company_id, "absent"),
        )
        rate = (completed / total_shifts * 100) if total_shifts > 0 else 0
        return {
            "total_shifts": total_shifts, "completed": completed,
            "in_progress": in_progress, "absent": absent,
            "completion_rate": round(rate, 1),
        }
