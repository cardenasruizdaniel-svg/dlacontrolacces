from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.modules.payroll.application.service import PayrollService
from app.modules.payroll.infrastructure.repositories import (
    PayrollConceptRepository,
    PayrollPeriodRepository,
    PayrollRecordRepository,
)
from app.modules.payroll.presentation.schemas import (
    PayrollCalculateRequest,
    PayrollListResponse,
    PayrollPeriodCreateRequest,
)

router = APIRouter(prefix="/payroll", tags=["Payroll"])


def get_service(db: DbSession) -> PayrollService:
    return PayrollService(
        period_repo=PayrollPeriodRepository(db),
        record_repo=PayrollRecordRepository(db),
        concept_repo=PayrollConceptRepository(db),
    )


@router.post("/periods", status_code=201)
async def create_period(body: PayrollPeriodCreateRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.create_period(**body.model_dump())


@router.get("/periods")
async def list_periods(
    company_id: str, current_user: CurrentUser, db: DbSession,
    page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
) -> PayrollListResponse:
    service = get_service(db)
    result = await service.list_periods(company_id, page=page, page_size=page_size)
    return PayrollListResponse(**result.__dict__)


@router.get("/periods/{period_id}")
async def get_period(period_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.get_period(period_id)


@router.post("/calculate")
async def calculate_payroll(body: PayrollCalculateRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.calculate_payroll(
        period_id=body.period_id, employee_id=body.employee_id,
        contract={"id": body.contract_id, "company_id": body.company_id,
                  "salary": body.salary, "transportation_assistance": body.transportation_assistance,
                  "daily_hours": body.daily_hours, "risk_level": body.risk_level},
        overtime_hours=body.overtime_hours, night_hours=body.night_hours,
        sunday_holiday_hours=body.sunday_holiday_hours, bonuses=body.bonuses,
        commissions=body.commissions, other_earnings=body.other_earnings,
        worked_days=body.worked_days,
    )


@router.get("/periods/{period_id}/records")
async def list_records(period_id: str, current_user: CurrentUser, db: DbSession) -> list[dict]:
    service = get_service(db)
    return await service.list_records_by_period(period_id)


@router.post("/periods/{period_id}/close")
async def close_period(period_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.close_period(period_id)


@router.get("/pending-report")
async def pending_report(
    company_id: str,
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: DbSession = None,
    current_user: CurrentUser = None
):
    from sqlalchemy import select
    from app.shared.database.models_contract import Contract
    from app.shared.database.models_auth import Employee
    from app.shared.database.models_scheduling import Shift
    from app.shared.database.models_access import AccessRecord
    from datetime import datetime as dt_mod

    # 1. Obtener empleados activos y contratos de la empresa
    contracts_q = select(Contract, Employee).join(
        Employee, Contract.employee_id == Employee.id
    ).where(
        Contract.company_id == company_id,
        Contract.is_deleted == False,
        Employee.is_deleted == False
    )
    results = (await db.execute(contracts_q)).all()
    
    report_data = []

    for contract, emp in results:
        # Consultar turnos
        shifts_q = select(Shift).where(
            Shift.employee_id == emp.id,
            Shift.shift_date >= start_date,
            Shift.shift_date <= end_date,
            Shift.is_deleted == False
        )
        shifts = (await db.execute(shifts_q)).scalars().all()
        
        status_counts = {
            "scheduled": 0, "in_progress": 0, "completed": 0,
            "salida_anticipada": 0, "lost": 0, "cancelled": 0
        }
        
        total_worked_h = 0.0
        total_overtime_h = 0.0
        total_night_h = 0.0
        total_earned = 0.0
        worked_days = 0

        # Para pago por turno/horas
        hourly_rate = float(contract.hourly_rate or 0)
        if hourly_rate <= 0 and contract.shift_value:
            shift_h = float(contract.shift_duration_hours or 8.0)
            hourly_rate = float(contract.shift_value) / shift_h if shift_h > 0 else 0.0

        for s in shifts:
            st = s.status if s.status else "scheduled"
            status_counts[st] = status_counts.get(st, 0) + 1
            
            exit_q = select(AccessRecord).where(
                AccessRecord.shift_id == s.id,
                AccessRecord.record_type == "exit",
                AccessRecord.is_deleted == False
            ).order_by(AccessRecord.created_at.desc())
            exit_rec = (await db.execute(exit_q)).scalar_one_or_none()
            
            worked_h = float(exit_rec.worked_hours or 0.0) if exit_rec else 0.0
            overtime_h = float(exit_rec.overtime_hours or 0.0) if exit_rec else 0.0
            night_h = float(exit_rec.night_hours or 0.0) if exit_rec else 0.0
            
            if s.start_time and s.end_time:
                try:
                    t1 = dt_mod.strptime(s.start_time, "%H:%M")
                    t2 = dt_mod.strptime(s.end_time, "%H:%M")
                    scheduled_h = (t2 - t1).total_seconds() / 3600.0
                    if scheduled_h < 0: scheduled_h += 24
                    if worked_h > scheduled_h: worked_h = scheduled_h
                except Exception:
                    pass
            
            total_worked_h += worked_h
            total_overtime_h += overtime_h
            total_night_h += night_h
            if worked_h > 0: worked_days += 1
            
            if contract.salary_type != "Fijo":
                total_earned += (worked_h * hourly_rate)
        
        # Calcular valores
        base_to_pay = 0.0
        health_pension = 0.0
        extra_pay = 0.0
        
        if contract.salary_type == "Fijo" and float(contract.salary or 0) > 0:
            daily_rate = float(contract.salary) / 30.0
            base_to_pay = daily_rate * worked_days
            extra_pay = (total_overtime_h * hourly_rate * 1.25) + (total_night_h * hourly_rate * 0.35)
            health_pension = (base_to_pay + extra_pay) * 0.08
        else:
            base_to_pay = total_earned
            health_pension = base_to_pay * 0.08

        net_to_pay = base_to_pay + extra_pay - health_pension

        # Cálculo de Parafiscales y Seguridad Social Patronal
        base_parafiscales = base_to_pay + extra_pay
        health_emp = round(base_parafiscales * 0.085, 2)
        pension_emp = round(base_parafiscales * 0.12, 2)
        arl_emp = round(base_parafiscales * 0.00522, 2)
        sena = round(base_parafiscales * 0.02, 2)
        icbf = round(base_parafiscales * 0.03, 2)
        caja = round(base_parafiscales * 0.04, 2)
        total_parafiscales = health_emp + pension_emp + arl_emp + sena + icbf + caja
        employer_cost = base_parafiscales + total_parafiscales

        report_data.append({
            "employee_id": emp.id,
            "full_name": f"{emp.first_name} {emp.last_name or ''}".strip(),
            "document": emp.document_number,
            "salary_type": contract.salary_type or "Turnos",
            "base_salary": float(contract.salary or 0),
            "hourly_rate": hourly_rate,
            "status_counts": status_counts,
            "total_worked_hours": round(total_worked_h, 2),
            "total_overtime_hours": round(total_overtime_h, 2),
            "accrued_base": round(base_to_pay, 2),
            "extras_sundays_holidays": round(extra_pay, 2),
            "deductions": round(health_pension, 2),
            "total_to_pay": round(net_to_pay, 2),
            "employer_parafiscals": round(total_parafiscales, 2),
            "total_employer_cost": round(employer_cost, 2)
        })

    return {"report": report_data}
