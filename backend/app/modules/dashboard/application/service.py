from fastapi import HTTPException, status
from app.modules.dashboard.infrastructure.repositories import DashboardRepository


class DashboardService:
    def __init__(self, repo: DashboardRepository) -> None:
        self.repo = repo

    async def get_executive_dashboard(self, company_id: str) -> dict:
        import asyncio
        (
            total_employees,
            active_today,
            late_today,
            total_hours,
            total_overtime,
            payroll_cost,
            productivity,
        ) = await asyncio.gather(
            self.repo.count_employees_by_company(company_id, "active"),
            self.repo.count_active_today(company_id),
            self.repo.count_late_today(company_id),
            self.repo.get_total_hours_today(),
            self.repo.get_total_overtime_today(),
            self.repo.get_payroll_cost_current_month(company_id),
            self.repo.get_productivity_metrics(company_id),
        )

        return {
            "company_id": company_id,
            "employees": {
                "total_active": total_employees,
                "active_today": active_today,
                "absent_today": total_employees - active_today,
                "late_today": late_today,
                "on_time_today": active_today - late_today,
            },
            "hours": {
                "total_worked": round(total_hours, 2),
                "total_overtime": round(total_overtime, 2),
                "average_per_employee": round(total_hours / active_today, 2) if active_today > 0 else 0,
            },
            "financial": {
                "current_month_cost": round(payroll_cost, 2),
                "cost_per_employee": round(payroll_cost / total_employees, 2) if total_employees > 0 else 0,
            },
            "productivity": productivity,
        }

    async def get_employee_status_map(self, company_id: str) -> dict:
        total = await self.repo.count_employees_by_company(company_id, "active")
        active = await self.repo.count_active_today(company_id)
        return {
            "total": total, "working": active,
            "absent": total - active, "remote": 0, "on_leave": 0,
        }

    async def get_recent_activity(self, limit: int = 10) -> list[dict]:
        records = await self.repo.get_recent_access_records(limit)
        emp_ids = {r.employee_id for r in records if r.employee_id}
        client_ids = {r.client_id for r in records if r.client_id}

        emp_map = {}
        if emp_ids:
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload
            from app.shared.database.models_hr import Employee
            emp_res = await self.repo.db.execute(
                select(Employee).options(selectinload(Employee.branch)).where(Employee.id.in_(emp_ids))
            )
            for emp in emp_res.scalars().all():
                emp_map[emp.id] = {
                    "name": f"{emp.first_name} {emp.last_name}",
                    "code": emp.code,
                    "document_number": emp.document_number,
                    "photo_url": emp.photo_url,
                    "branch_name": emp.branch.name if getattr(emp, "branch", None) else None,
                }

        client_map = {}
        if client_ids:
            from sqlalchemy import select
            from app.shared.database.models_clients import Client
            cl_res = await self.repo.db.execute(
                select(Client).where(Client.id.in_(client_ids))
            )
            for cl in cl_res.scalars().all():
                client_map[cl.id] = cl.name

        return [
            {
                "id": r.id,
                "employee_id": r.employee_id,
                "employee_name": emp_map.get(r.employee_id, {}).get("name", "Empleado"),
                "employee_code": emp_map.get(r.employee_id, {}).get("code", "—"),
                "employee_photo": emp_map.get(r.employee_id, {}).get("photo_url"),
                "sede_name": (
                    client_map.get(r.client_id)
                    or r.geofence_name
                    or emp_map.get(r.employee_id, {}).get("branch_name")
                    or r.address
                    or "Sede Principal"
                ),
                "record_type": r.record_type,
                "timestamp": r.timestamp,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "face_verified": r.face_verified,
                "inside_geofence": r.inside_geofence,
                "worked_hours": r.worked_hours,
            }
            for r in records
        ]

    async def get_hourly_trend(self, company_id: str) -> list[dict]:
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        hours = []
        for h in range(6, 22):
            hours.append({
                "hour": f"{h:02d}:00",
                "entries": 0,
                "exits": 0,
                "active_workers": 0,
            })
        return hours
