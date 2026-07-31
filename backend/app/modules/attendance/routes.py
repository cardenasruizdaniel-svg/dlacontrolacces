from datetime import date, datetime, timezone
import logging
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.modules.attendance.models import AttendanceAuditLog, AttendanceRecord
from app.modules.attendance.schemas import (
    AttendancePunchRequest,
    AttendancePunchResponse,
    AttendanceStatusResponse,
    KioskPunchRequest,
)
from app.shared.database.models_hr import Employee
from app.shared.database.models_company import Company

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/attendance", tags=["Attendance PWA"])


async def _get_employee(db: DbSession, current_user: CurrentUser) -> Employee | None:
    emp_id = getattr(current_user, "id", None)
    if emp_id:
        result = await db.execute(
            select(Employee).where(
                Employee.id == emp_id,
                Employee.company_id == current_user.company_id,
                Employee.is_deleted == False,
            )
        )
        emp = result.scalar_one_or_none()
        if emp:
            return emp
    email = getattr(current_user, "email", None)
    if email:
        result = await db.execute(
            select(Employee).where(
                Employee.company_id == current_user.company_id,
                Employee.email == email,
                Employee.is_deleted == False,
            )
        )
        emp = result.scalar_one_or_none()
        if emp:
            return emp
    return None


async def _calculate_employee_status(emp: Employee, db: DbSession) -> AttendanceStatusResponse:
    today_str = date.today().isoformat()
    q = (
        select(AttendanceRecord)
        .where(
            AttendanceRecord.employee_id == emp.id,
            AttendanceRecord.is_deleted == False,
            AttendanceRecord.timestamp >= today_str,
        )
        .order_by(AttendanceRecord.timestamp.asc())
    )
    records = list((await db.execute(q)).scalars().all())

    # State Machine calculation
    current_state = "off_shift"
    last_event_type = None
    last_event_time = None

    if records:
        last = records[-1]
        last_event_type = last.event_type
        last_event_time = last.timestamp

        if last.event_type == "shift_start":
            current_state = "in_shift"
        elif last.event_type == "break_start":
            current_state = "in_break"
        elif last.event_type == "break_end":
            current_state = "in_shift"
        elif last.event_type == "lunch_start":
            current_state = "in_lunch"
        elif last.event_type == "lunch_end":
            current_state = "in_shift"
        elif last.event_type == "shift_end":
            current_state = "shift_completed"

    allowed_map = {
        "off_shift": ["shift_start"],
        "in_shift": ["break_start", "lunch_start", "shift_end"],
        "in_break": ["break_end"],
        "in_lunch": ["lunch_end"],
        "shift_completed": ["shift_start"],
    }
    next_event_map = {
        "off_shift": "shift_start",
        "in_shift": "break_start o lunch_start o shift_end",
        "in_break": "break_end",
        "in_lunch": "lunch_end",
        "shift_completed": "shift_start",
    }

    company_name = "DLA Redes y Seguridad"
    if emp.company_id:
        comp_res = await db.execute(select(Company).where(Company.id == emp.company_id))
        comp = comp_res.scalar_one_or_none()
        if comp:
            company_name = comp.name

    return AttendanceStatusResponse(
        employee_id=emp.id,
        employee_name=f"{emp.first_name} {emp.last_name}",
        employee_photo=emp.photo_url,
        job_position="Operativo / Administrativo",
        company_name=company_name,
        date_str=date.today().strftime("%Y-%m-%d"),
        current_state=current_state,
        last_event_type=last_event_type,
        last_event_time=last_event_time,
        next_expected_event=next_event_map[current_state],
        allowed_events=allowed_map[current_state],
    )


@router.get("/status", response_model=AttendanceStatusResponse)
async def get_attendance_status(current_user: CurrentUser, db: DbSession):
    emp = await _get_employee(db, current_user)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return await _calculate_employee_status(emp, db)


@router.get("/kiosk/employee/{code_or_document}", response_model=AttendanceStatusResponse)
async def get_kiosk_employee_status(code_or_document: str, db: DbSession):
    code_clean = code_or_document.strip()
    result = await db.execute(
        select(Employee).where(
            (Employee.code == code_clean)
            | (Employee.document_number == code_clean)
            | (Employee.id == code_clean)
            | (Employee.username == code_clean),
            Employee.is_deleted == False,
        )
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró ningún empleado con el código o cédula '{code_or_document}'",
        )
    return await _calculate_employee_status(emp, db)


@router.post("/kiosk/punch", response_model=AttendancePunchResponse)
async def record_kiosk_attendance_punch(body: KioskPunchRequest, db: DbSession):
    code_clean = body.employee_code.strip()
    result = await db.execute(
        select(Employee).where(
            (Employee.code == code_clean)
            | (Employee.document_number == code_clean)
            | (Employee.id == code_clean)
            | (Employee.username == code_clean),
            Employee.is_deleted == False,
        )
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró ningún empleado con el código o cédula '{body.employee_code}'",
        )

    status_info = await _calculate_employee_status(emp, db)
    allowed = status_info.allowed_events

    now_iso = body.offline_timestamp or datetime.now(timezone.utc).isoformat()

    # State Machine Validation check
    if body.event_type not in allowed:
        reason = f"Intento de evento '{body.event_type}' no permitido en el estado actual '{status_info.current_state}'. Eventos permitidos: {allowed}"
        audit = AttendanceAuditLog(
            employee_id=emp.id,
            attempted_event=body.event_type,
            timestamp=now_iso,
            reason_failed=reason,
            latitude=body.latitude,
            longitude=body.longitude,
            device_id=body.device_id,
        )
        db.add(audit)
        await db.commit()
        raise HTTPException(status_code=400, detail=reason)

    # Duration calculation
    duration_mins = None
    today_str = date.today().isoformat()
    q = (
        select(AttendanceRecord)
        .where(
            AttendanceRecord.employee_id == emp.id,
            AttendanceRecord.is_deleted == False,
            AttendanceRecord.timestamp >= today_str,
        )
        .order_by(AttendanceRecord.timestamp.asc())
    )
    prev_records = list((await db.execute(q)).scalars().all())

    if body.event_type in ("break_end", "lunch_end", "shift_end") and prev_records:
        target_start_type = {
            "break_end": "break_start",
            "lunch_end": "lunch_start",
            "shift_end": "shift_start",
        }[body.event_type]

        matching_start = next(
            (r for r in reversed(prev_records) if r.event_type == target_start_type), None
        )
        if matching_start:
            try:
                t1 = datetime.fromisoformat(matching_start.timestamp.replace("Z", "+00:00"))
                t2 = datetime.fromisoformat(now_iso.replace("Z", "+00:00"))
                diff_sec = (t2 - t1).total_seconds()
                duration_mins = max(1, int(diff_sec // 60))
            except Exception:
                duration_mins = None

    import uuid
    rec_id = str(uuid.uuid4())
    rec = AttendanceRecord(
        id=rec_id,
        employee_id=emp.id,
        company_id=emp.company_id or "dla-company-main",
        event_type=body.event_type,
        timestamp=now_iso,
        offline_timestamp=body.offline_timestamp,
        latitude=body.latitude,
        longitude=body.longitude,
        selfie_url=body.photo_base64[:50] if body.photo_base64 else None,
        face_verified=True,
        inside_geofence=True,
        duration_minutes=duration_mins,
        break_name=body.break_name,
        observations=body.observations,
        device_id=body.device_id,
        is_mock_location=body.is_mock_location,
        is_synced=True,
    )
    db.add(rec)
    await db.commit()

    event_messages = {
        "shift_start": f"¡Bienvenido {emp.first_name}! Entrada registrada exitosamente.",
        "break_start": f"Salida a descanso registrada para {emp.first_name}.",
        "break_end": f"Regreso de descanso registrado ({duration_mins or 0} min).",
        "lunch_start": f"Salida a almuerzo registrada para {emp.first_name}.",
        "lunch_end": f"Regreso de almuerzo registrado ({duration_mins or 0} min).",
        "shift_end": f"Salida final registrada. ¡Hasta luego {emp.first_name}!",
    }

    return AttendancePunchResponse(
        id=rec_id,
        event_type=body.event_type,
        timestamp=now_iso,
        status="success",
        message=event_messages.get(body.event_type, "Evento registrado."),
        face_verified=True,
        inside_geofence=True,
        duration_minutes=duration_mins,
        next_expected_event=body.event_type,
    )


@router.post("/punch", response_model=AttendancePunchResponse)
async def record_attendance_punch(body: AttendancePunchRequest, current_user: CurrentUser, db: DbSession):
    emp = await _get_employee(db, current_user)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    kiosk_req = KioskPunchRequest(
        employee_code=emp.code or emp.document_number or emp.id,
        event_type=body.event_type,
        latitude=body.latitude,
        longitude=body.longitude,
        photo_base64=body.photo_base64,
        break_name=body.break_name,
        observations=body.observations,
        device_id=body.device_id,
        is_mock_location=body.is_mock_location,
        offline_timestamp=body.offline_timestamp,
    )
    return await record_kiosk_attendance_punch(kiosk_req, db)


@router.get("/history")
async def get_attendance_history(
    current_user: CurrentUser,
    db: DbSession,
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
):
    emp = await _get_employee(db, current_user)
    if not emp:
        return []

    q = select(AttendanceRecord).where(
        AttendanceRecord.employee_id == emp.id,
        AttendanceRecord.is_deleted == False,
    )
    if start_date:
        q = q.where(AttendanceRecord.timestamp >= start_date)
    if end_date:
        q = q.where(AttendanceRecord.timestamp <= end_date + " 23:59:59")

    q = q.order_by(AttendanceRecord.timestamp.desc()).limit(100)
    records = list((await db.execute(q)).scalars().all())

    return [
        {
            "id": r.id,
            "event_type": r.event_type,
            "timestamp": r.timestamp,
            "duration_minutes": r.duration_minutes,
            "break_name": r.break_name,
            "inside_geofence": r.inside_geofence,
            "face_verified": r.face_verified,
            "observations": r.observations,
        }
        for r in records
    ]
