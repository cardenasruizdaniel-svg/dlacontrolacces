import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import hash_password, verify_password, create_access_token
from app.modules.payroll.application.service import PayrollEngine
from app.modules.geolocation.application.service import GeolocationService


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"


def test_security_hashing():
    pwd = "EnterprisePassword2026!"
    hashed = hash_password(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_generation():
    token = create_access_token({"sub": "admin-id", "role": "super_admin"})
    assert token is not None and len(token) > 20


def test_colombian_payroll_rules():
    # 2,600,000 COP (2 minimum wages in Colombia)
    salary = 2600000.0
    hour_val = PayrollEngine.calculate_hour_value(salary, 8.0)
    assert hour_val == (2600000 / 30) / 8.0  # 10,833.33 COP

    # Overtime daytime (25%)
    overtime_day = PayrollEngine.calculate_overtime_value(hour_val, 2, 1.25)
    assert overtime_day == hour_val * 2 * 1.25

    # Night surcharge (35%) -> factor 1.75
    night = PayrollEngine.calculate_night_value(hour_val, 4)
    assert night == hour_val * 4 * 1.75

    # Sunday / Holiday (75%) -> factor 2.0
    sunday = PayrollEngine.calculate_sunday_holiday_value(hour_val, 8)
    assert sunday == hour_val * 8 * 2.0

    # Deductions 4% Health, 4% Pension
    health = PayrollEngine.calculate_health_deduction(salary)
    pension = PayrollEngine.calculate_pension_deduction(salary)
    assert health == 104000.0
    assert pension == 104000.0


def test_past_datetime_validation():
    from app.modules.scheduling.application.service import SchedulingService
    from datetime import date, datetime, timedelta, timezone
    from fastapi import HTTPException

    service = SchedulingService(None, None, None)

    now_utc = datetime.now(timezone.utc)
    now_cot = now_utc - timedelta(hours=5)
    today_cot = now_cot.date()
    yesterday = today_cot - timedelta(days=1)
    tomorrow = today_cot + timedelta(days=1)

    # Caso 1: Intentar programar ayer -> Debe fallar con HTTP 400
    with pytest.raises(HTTPException) as exc1:
        service._validate_future_datetime(yesterday)
    assert exc1.value.status_code == 400
    assert "fecha pasada" in exc1.value.detail

    # Caso 2: Intentar programar en una hora pasada de hoy -> Debe fallar con HTTP 400
    past_hour = (now_cot - timedelta(hours=2)).strftime("%H:%M")
    with pytest.raises(HTTPException) as exc2:
        service._validate_future_datetime(today_cot, past_hour)
    assert exc2.value.status_code == 400
    assert "hora pasada" in exc2.value.detail

    # Caso 3: Programar mañana -> Debe permitirlo sin lanzar excepción
    valid_tomorrow = service._validate_future_datetime(tomorrow, "08:00")
    assert valid_tomorrow == tomorrow

    # Caso 4: Programar hoy en una hora futura -> Debe permitirlo
    future_hour = (now_cot + timedelta(hours=2)).strftime("%H:%M")
    valid_today = service._validate_future_datetime(today_cot, future_hour)
    assert valid_today == today_cot


def test_geofence_calculation():
    svc = GeolocationService(None, None, None)
    lat1, lon1 = 4.60971, -74.08175
    lat2, lon2 = 4.60980, -74.08175

    check = svc.check_geofence(lat2, lon2, lat1, lon1, radius=100.0)
    assert check["inside"] is True
    assert check["distance"] < 20.0
