from datetime import date
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.pagination import PaginatedResult
from app.modules.payroll.infrastructure.repositories import (
    PayrollConceptRepository,
    PayrollPeriodRepository,
    PayrollRecordRepository,
)


class PayrollEngine:
    """Colombian payroll calculation engine compliant with labor legislation (Código Sustantivo del Trabajo)."""

    @staticmethod
    def calculate_hour_value(monthly_salary: float, daily_hours: float = 8.0) -> float:
        return (monthly_salary / 30) / (daily_hours if daily_hours > 0 else 8.0)

    @staticmethod
    def calculate_base_accrued(
        salary: float,
        salary_type: str = "monthly",
        hourly_rate: float | None = None,
        shift_value: float | None = None,
        daily_rate: float | None = None,
        hours_worked: float = 0.0,
        shifts_completed: int = 0,
        days_worked: float = 30.0,
        payment_frequency: str = "monthly",
    ) -> float:
        """Calculates basic accrued salary according to contract modality and payment frequency."""
        if salary_type == "hourly":
            rate = hourly_rate or (salary / 240.0)
            return round(rate * hours_worked, 2)
        elif salary_type == "per_shift":
            val = shift_value or salary
            return round(val * shifts_completed, 2)
        elif salary_type == "daily":
            val = daily_rate or (salary / 30.0)
            return round(val * days_worked, 2)
        else:
            days_factor = {"daily": 1.0, "weekly": 7.0, "biweekly": 15.0, "monthly": 30.0}.get(payment_frequency, 30.0)
            target_days = min(days_worked, days_factor)
            return round((salary / 30.0) * target_days, 2)

    @staticmethod
    def calculate_overtime_value(hour_value: float, hours: float, factor: float = 1.25) -> float:
        return hour_value * hours * factor

    @staticmethod
    def calculate_night_value(hour_value: float, hours: float) -> float:
        return hour_value * hours * settings.NIGHT_HOUR_FACTOR

    @staticmethod
    def calculate_sunday_holiday_value(hour_value: float, hours: float) -> float:
        return hour_value * hours * settings.SUNDAY_HOLIDAY_FACTOR

    @staticmethod
    def calculate_night_sunday_holiday(hour_value: float, hours: float) -> float:
        return hour_value * hours * settings.NIGHT_SUNDAY_HOLIDAY_FACTOR

    @staticmethod
    def calculate_health_deduction(base: float) -> float:
        return round(base * settings.HEALTH_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_pension_deduction(base: float) -> float:
        return round(base * settings.PENSION_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_solidarity_fund(base: float) -> float:
        if base > settings.MINIMUM_WAGE * 4:
            return round(base * 1.0 / 100, 2)
        return 0.0

    @staticmethod
    def calculate_health_employer(base: float) -> float:
        return round(base * 8.5 / 100, 2)

    @staticmethod
    def calculate_pension_employer(base: float) -> float:
        return round(base * 12.0 / 100, 2)

    @staticmethod
    def calculate_arl_employer(base: float, risk_level: str = "1") -> float:
        rates = {"1": 0.522, "2": 1.044, "3": 2.440, "4": 4.350, "5": 5.930}
        rate = rates.get(str(risk_level), 0.522)
        return round(base * rate / 100, 2)

    @staticmethod
    def calculate_icbf(base: float) -> float:
        return round(base * settings.ICBF_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_sena(base: float) -> float:
        return round(base * settings.SENA_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_caja_compensacion(base: float) -> float:
        return round(base * settings.CAJA_COMPENSACION_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_social_benefits(base_with_transport: float, base_without_transport: float) -> dict:
        """Calculates social benefits provisions (Cesantías, Int. Cesantías, Prima, Vacaciones)."""
        cesantias = round(base_with_transport * 0.0833, 2)
        int_cesantias = round(cesantias * 0.12, 2)
        prima = round(base_with_transport * 0.0833, 2)
        vacaciones = round(base_without_transport * 0.0417, 2)
        total = cesantias + int_cesantias + prima + vacaciones
        return {
            "cesantias": cesantias,
            "intereses_cesantias": int_cesantias,
            "prima_servicios": prima,
            "vacaciones": vacaciones,
            "total_provisions": round(total, 2),
        }

    @staticmethod
    def calculate_vacation_value(monthly_salary: float, days_taken: float = 15.0) -> float:
        """Calculates vacation pay based on CST (Formula: (Monthly Salary * Days) / 30)."""
        return round((monthly_salary * days_taken) / 30.0, 2)

    @staticmethod
    def calculate_service_bonus(monthly_salary: float, days_worked: float = 180.0, period_days: float = 180.0) -> float:
        """Calculates Prima de Servicios based on CST (Formula: (Monthly Salary * Days Worked) / 360)."""
        return round((monthly_salary * days_worked) / 360.0, 2)


class PayrollService:
    def __init__(
        self,
        period_repo: PayrollPeriodRepository,
        record_repo: PayrollRecordRepository,
        concept_repo: PayrollConceptRepository,
    ) -> None:
        self.period_repo = period_repo
        self.record_repo = record_repo
        self.concept_repo = concept_repo
        self.engine = PayrollEngine()

    async def create_period(self, **kwargs: dict) -> dict:
        period = await self.period_repo.create(**kwargs)
        return {"id": period.id, "name": period.name, "status": period.status}

    async def get_period(self, period_id: str) -> dict:
        period = await self.period_repo.get_by_id(period_id)
        if not period:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Período de nómina no encontrado")
        return {
            "id": period.id, "name": period.name, "year": period.year,
            "month": period.month, "start_date": str(period.start_date),
            "end_date": str(period.end_date), "payment_date": str(period.payment_date),
            "status": period.status, "is_closed": period.is_closed,
        }

    async def list_periods(self, company_id: str, page: int = 1, page_size: int = 25) -> PaginatedResult:
        skip = (page - 1) * page_size
        items, total = await self.period_repo.list_by_company(company_id, skip=skip, limit=page_size)
        return PaginatedResult.create(
            items=[{"id": p.id, "name": p.name, "year": p.year, "month": p.month, "status": p.status} for p in items],
            total=total, page=page, page_size=page_size,
        )

    async def calculate_payroll(self, period_id: str, employee_id: str, contract: dict, overtime_hours: float = 0,
                                  night_hours: float = 0, sunday_holiday_hours: float = 0, bonuses: float = 0,
                                  commissions: float = 0, other_earnings: float = 0, worked_days: int = 30,
                                  db: AsyncSession | None = None) -> dict:
        monthly_salary = float(contract["salary"])
        daily_hours = float(contract.get("daily_hours", 8.0))
        risk_level = str(contract.get("risk_level", "1"))
        work_scheme = contract.get("work_scheme", "full_time")
        labor_type = contract.get("labor_law_type", "fixed_term")

        # Configurable Colombian Legal Constants (Defaults to 2026 constants)
        min_wage = settings.MINIMUM_WAGE
        trans_allowance = settings.TRANSPORTATION_ASSISTANCE

        if db:
            from app.modules.system_config.repository import SystemConfigRepository
            try:
                cfg_repo = SystemConfigRepository(db)
                cfgs = await cfg_repo.get_all()
                cfg_dict = {c.key: c.value for c in cfgs}
                if cfg_dict.get("MINIMUM_WAGE"):
                    min_wage = float(cfg_dict["MINIMUM_WAGE"])
                if cfg_dict.get("TRANSPORTATION_ASSISTANCE"):
                    trans_allowance = float(cfg_dict["TRANSPORTATION_ASSISTANCE"])
            except Exception:
                pass

        # 1. Prestación de Servicios (Civil/Comercial)
        if labor_type == "services":
            base_salary = monthly_salary
            transportation = 0.0
            total_earnings = base_salary + bonuses + commissions + other_earnings
            health_ded = 0.0
            pension_ded = 0.0
            solidarity = 0.0
            total_deductions = 0.0
            net_pay = total_earnings
            total_employer_cost = total_earnings

            record = await self.record_repo.create(
                period_id=period_id, contract_id=contract["id"], employee_id=employee_id, company_id=contract["company_id"],
                base_salary=base_salary, transportation_assistance=0, overtime_hours=0, overtime_value=0,
                night_hours=0, night_value=0, sunday_holiday_hours=0, sunday_holiday_value=0,
                bonuses=bonuses, commissions=commissions, other_earnings=other_earnings,
                health_deduction=0, pension_deduction=0, solidarity_fund=0,
                health_employer=0, pension_employer=0, arl_employer=0, icbf=0, sena=0, caja_compensacion_employer=0,
                total_earnings=total_earnings, total_deductions=0, total_employer_cost=total_employer_cost,
                net_pay=net_pay, worked_days=worked_days,
            )
            return {"id": record.id, "net_pay": net_pay, "total_earnings": total_earnings, "total_deductions": 0, "contract_type": "services"}

        # 2. Aprendizaje SENA
        if labor_type == "apprenticeship":
            stipend = (monthly_salary / 30) * worked_days
            total_earnings = stipend + bonuses + other_earnings
            health_emp = round(stipend * 0.125, 2)
            arl_emp = self.engine.calculate_arl_employer(stipend, risk_level)
            total_deductions = 0.0
            net_pay = total_earnings
            total_employer_cost = total_earnings + health_emp + arl_emp

            record = await self.record_repo.create(
                period_id=period_id, contract_id=contract["id"], employee_id=employee_id, company_id=contract["company_id"],
                base_salary=stipend, transportation_assistance=0, overtime_hours=0, overtime_value=0,
                night_hours=0, night_value=0, sunday_holiday_hours=0, sunday_holiday_value=0,
                bonuses=bonuses, commissions=commissions, other_earnings=other_earnings,
                health_deduction=0, pension_deduction=0, solidarity_fund=0,
                health_employer=health_emp, pension_employer=0, arl_employer=arl_emp, icbf=0, sena=0, caja_compensacion_employer=0,
                total_earnings=total_earnings, total_deductions=0, total_employer_cost=total_employer_cost,
                net_pay=net_pay, worked_days=worked_days,
            )
            return {"id": record.id, "net_pay": net_pay, "total_earnings": total_earnings, "total_deductions": 0, "contract_type": "apprenticeship"}

        # 3. Contratos Laborales Estándar (Término Fijo, Indefinido, Obra o Labor, Ocasional) & Esquema Por Horas
        if work_scheme == "hourly":
            hour_value = monthly_salary
            base_salary = hour_value * (daily_hours * worked_days)
        else:
            base_salary = round((monthly_salary / 30) * worked_days, 2)
            hour_value = self.engine.calculate_hour_value(monthly_salary, daily_hours)

        overtime_value = self.engine.calculate_overtime_value(hour_value, overtime_hours)
        night_value = self.engine.calculate_night_value(hour_value, night_hours)
        sh_value = self.engine.calculate_sunday_holiday_value(hour_value, sunday_holiday_hours)

        # Auxilio de Transporte (Ley colombiana: si salario mensual <= 2 * SMLV y tiene derecho)
        has_trans_assistance = contract.get("transportation_assistance", True)
        if has_trans_assistance and monthly_salary <= (min_wage * 2):
            transportation = round((trans_allowance / 30) * worked_days, 2)
        else:
            transportation = 0.0

        total_earnings = base_salary + transportation + overtime_value + night_value + sh_value + bonuses + commissions + other_earnings

        # Deducciones ley colombiana
        health_ded = self.engine.calculate_health_deduction(base_salary + overtime_value + night_value + sh_value + commissions)
        pension_ded = self.engine.calculate_pension_deduction(base_salary + overtime_value + night_value + sh_value + commissions)
        solidarity = self.engine.calculate_solidarity_fund(base_salary)

        total_deductions = health_ded + pension_ded + solidarity
        net_pay = total_earnings - total_deductions

        # Aportes patronales & prestaciones sociales
        base_parafiscales = base_salary + overtime_value + night_value + sh_value + commissions
        base_with_transport = base_parafiscales + transportation

        health_emp = self.engine.calculate_health_employer(base_parafiscales)
        pension_emp = self.engine.calculate_pension_employer(base_parafiscales)
        arl_emp = self.engine.calculate_arl_employer(base_parafiscales, risk_level)
        icbf = self.engine.calculate_icbf(base_parafiscales)
        sena = self.engine.calculate_sena(base_parafiscales)
        caja = self.engine.calculate_caja_compensacion(base_parafiscales)

        social_benefits = self.engine.calculate_social_benefits(base_with_transport, base_parafiscales)

        total_employer_cost = base_parafiscales + health_emp + pension_emp + arl_emp + icbf + sena + caja + social_benefits["total_benefits"]

        record = await self.record_repo.create(
            period_id=period_id,
            contract_id=contract["id"],
            employee_id=employee_id,
            company_id=contract["company_id"],
            base_salary=base_salary,
            transportation_assistance=transportation,
            overtime_hours=overtime_hours,
            overtime_value=overtime_value,
            night_hours=night_hours,
            night_value=night_value,
            sunday_holiday_hours=sunday_holiday_hours,
            sunday_holiday_value=sh_value,
            bonuses=bonuses,
            commissions=commissions,
            other_earnings=other_earnings,
            health_deduction=health_ded,
            pension_deduction=pension_ded,
            solidarity_fund=solidarity,
            health_employer=health_emp,
            pension_employer=pension_emp,
            arl_employer=arl_emp,
            icbf=icbf,
            sena=sena,
            caja_compensacion_employer=caja,
            total_earnings=total_earnings,
            total_deductions=total_deductions,
            total_employer_cost=total_employer_cost,
            net_pay=net_pay,
            worked_days=worked_days,
        )

        return {
            "id": record.id,
            "net_pay": net_pay,
            "total_earnings": total_earnings,
            "total_deductions": total_deductions,
            "social_benefits": social_benefits,
            "total_employer_cost": total_employer_cost,
        }

    async def list_records_by_period(self, period_id: str) -> list[dict]:
        records = await self.record_repo.list_by_period(period_id)
        return [
            {
                "id": r.id, "employee_id": r.employee_id, "contract_id": r.contract_id,
                "base_salary": float(r.base_salary), "net_pay": float(r.net_pay),
                "total_earnings": float(r.total_earnings), "total_deductions": float(r.total_deductions),
                "status": r.status,
            }
            for r in records
        ]

    async def close_period(self, period_id: str) -> dict:
        period = await self.period_repo.get_by_id(period_id)
        if not period:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Período de nómina no encontrado")
        await self.period_repo.update(period_id, status="closed", is_closed=True)
        return {"message": "Período de nómina cerrado correctamente"}
