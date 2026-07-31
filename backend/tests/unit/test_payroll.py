import pytest
from app.modules.payroll.application.service import PayrollEngine


def test_hour_value_calculation():
    monthly_salary = 2400000.0  # 2.4M COP
    hour_val = PayrollEngine.calculate_hour_value(monthly_salary, 8.0)
    assert hour_val == (2400000 / 30) / 8  # 10000 COP per hour


def test_overtime_and_surcharges():
    hour_val = 10000.0
    overtime_val = PayrollEngine.calculate_overtime_value(hour_val, 2.0, 1.25)
    assert overtime_val == 25000.0

    night_val = PayrollEngine.calculate_night_value(hour_val, 4.0)
    assert night_val == 4.0 * 10000.0 * 1.75

    sunday_val = PayrollEngine.calculate_sunday_holiday_value(hour_val, 8.0)
    assert sunday_val == 8.0 * 10000.0 * 2.0


def test_health_and_pension_deductions():
    base_salary = 2000000.0
    health = PayrollEngine.calculate_health_deduction(base_salary)
    pension = PayrollEngine.calculate_pension_deduction(base_salary)
    assert health == 80000.0  # 4% of 2M
    assert pension == 80000.0  # 4% of 2M


def test_vacation_and_service_bonus():
    monthly_salary = 1800000.0
    vacation = PayrollEngine.calculate_vacation_value(monthly_salary, 15)
    assert vacation == 900000.0  # Half month salary for 15 days

    bonus = PayrollEngine.calculate_service_bonus(monthly_salary, 180, 180)
    assert bonus == 900000.0  # Half month salary for 180 days (semestral prima)
