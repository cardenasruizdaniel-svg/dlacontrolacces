from datetime import datetime, timezone
import math

from fastapi import HTTPException, status

from app.core.pagination import PaginatedResult
from app.modules.access_control.infrastructure.repositories import AccessRecordRepository
from app.modules.geolocation.application.service import GeolocationService
from app.modules.geolocation.infrastructure.repositories import GeofenceRepository, LocationHistoryRepository, RouteHistoryRepository
from app.modules.facial_recognition.application.service import FacialRecognitionService
from app.modules.facial_recognition.infrastructure.repositories import FaceRepository


class AccessControlService:
    def __init__(self, record_repo: AccessRecordRepository, db) -> None:
        self.record_repo = record_repo
        self.geo_service = GeolocationService(
            geofence_repo=GeofenceRepository(db),
            location_repo=LocationHistoryRepository(db),
            route_repo=RouteHistoryRepository(db),
        )
        self.face_service = FacialRecognitionService(face_repo=FaceRepository(db))

    async def register_entry(
        self, employee_id: str, latitude: float, longitude: float,
        photo_base64: str | None = None, device_id: str | None = None,
        device_model: str | None = None, device_os: str | None = None,
        battery_level: int | None = None, connection_type: str | None = None,
        is_mock_location: bool = False, shift_id: str | None = None,
        client_id: str | None = None, geofence_lat: float | None = None,
        geofence_lon: float | None = None, geofence_radius: float | None = None,
        offline_timestamp: str | None = None,
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()

        inside_geofence = True
        geofence_distance = 0.0
        if geofence_lat is not None and geofence_lon is not None and geofence_radius is not None:
            geo_result = self.geo_service.check_geofence(latitude, longitude, geofence_lat, geofence_lon, geofence_radius)
            inside_geofence = geo_result["inside"]
            geofence_distance = geo_result["distance"]

        face_verified = False
        face_match_score = 0.0
        liveness_detected = False
        if photo_base64 and employee_id:
            try:
                face_result = await self.face_service.verify_face(employee_id, photo_base64)
                face_verified = face_result.get("verified", False)
                face_match_score = face_result.get("score", 0.0)
            except Exception:
                pass
            try:
                liveness_result = await self.face_service.detect_liveness(photo_base64)
                liveness_detected = liveness_result.get("liveness_detected", False)
            except Exception:
                pass

        anti_fraud = await self.face_service.anti_fraud_check(latitude, longitude, is_mock_location)

        selfie_url = None
        if photo_base64:
            selfie_url = f"data:image/jpeg;base64,{photo_base64[:50]}..."

        record = await self.record_repo.create(
            employee_id=employee_id, record_type="entry", timestamp=now,
            latitude=latitude, longitude=longitude,
            device_id=device_id, device_model=device_model, device_os=device_os,
            battery_level=battery_level, connection_type=connection_type,
            selfie_url=selfie_url, face_match_score=face_match_score,
            face_verified=face_verified, inside_geofence=inside_geofence,
            geofence_distance=geofence_distance, is_mock_location=is_mock_location,
            liveness_detected=liveness_detected, shift_id=shift_id,
            client_id=client_id, offline_timestamp=offline_timestamp,
            is_synced=offline_timestamp is None,
        )

        warnings = []
        if not inside_geofence:
            warnings.append(f"Outside geofence ({geofence_distance}m from center)")
        if is_mock_location:
            warnings.append("Mock GPS location detected")
        if photo_base64 and not face_verified:
            warnings.append("Face verification failed")
        if photo_base64 and not liveness_detected:
            warnings.append("Liveness check failed")

        return {
            "id": record.id, "record_type": "entry", "timestamp": now,
            "inside_geofence": inside_geofence, "face_verified": face_verified,
            "face_match_score": face_match_score, "liveness_detected": liveness_detected,
            "warnings": warnings, "allowed": inside_geofence and face_verified,
        }

    async def register_exit(
        self, employee_id: str, latitude: float, longitude: float,
        photo_base64: str | None = None, observations: str | None = None,
        device_id: str | None = None, connection_type: str | None = None,
        offline_timestamp: str | None = None, shift_id: str | None = None,
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()

        entry = await self.record_repo.get_last_by_employee(employee_id, "entry")

        worked_hours = None
        overtime_hours = None
        night_hours = None
        if entry:
            from datetime import datetime as dt
            try:
                entry_time = dt.fromisoformat(entry.timestamp.replace("Z", "+00:00"))
                exit_time = dt.fromisoformat(now.replace("Z", "+00:00"))
                diff = (exit_time - entry_time).total_seconds() / 3600
                worked_hours = round(diff, 2)
                if worked_hours > 8:
                    overtime_hours = round(worked_hours - 8, 2)
                if entry_time.hour >= 21 or exit_time.hour < 6:
                    night_hours = round(min(worked_hours, 8.0) * 0.5, 2)
            except Exception:
                pass

        selfie_url = None
        if photo_base64:
            selfie_url = f"data:image/jpeg;base64,{photo_base64[:50]}..."

        record = await self.record_repo.create(
            employee_id=employee_id, record_type="exit", timestamp=now,
            latitude=latitude, longitude=longitude, device_id=device_id,
            connection_type=connection_type, selfie_url=selfie_url,
            observations=observations, worked_hours=worked_hours,
            overtime_hours=overtime_hours, night_hours=night_hours,
            offline_timestamp=offline_timestamp, is_synced=offline_timestamp is None,
            shift_id=shift_id,
        )

        return {
            "id": record.id, "record_type": "exit", "timestamp": now,
            "worked_hours": worked_hours, "overtime_hours": overtime_hours,
            "night_hours": night_hours,
        }

    async def list_records(self, employee_id: str | None = None, record_type: str | None = None,
                           start_date: str | None = None, end_date: str | None = None,
                           page: int = 1, page_size: int = 25) -> PaginatedResult:
        skip = (page - 1) * page_size
        items, total = await self.record_repo.list_records_with_filters(
            employee_id=employee_id, record_type=record_type,
            start_date=start_date, end_date=end_date, skip=skip, limit=page_size,
        )

        emp_ids = {r.employee_id for r in items if r.employee_id}
        client_ids = {r.client_id for r in items if r.client_id}

        emp_map = {}
        if emp_ids:
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload
            from app.shared.database.models_hr import Employee
            emp_res = await self.record_repo.db.execute(
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
            cl_res = await self.record_repo.db.execute(
                select(Client).where(Client.id.in_(client_ids))
            )
            for cl in cl_res.scalars().all():
                client_map[cl.id] = cl.name

        records_data = []
        for r in items:
            emp_info = emp_map.get(r.employee_id, {})
            sede_name = (
                client_map.get(r.client_id)
                or r.geofence_name
                or emp_info.get("branch_name")
                or r.address
                or "Sede Central Principal"
            )
            records_data.append({
                "id": r.id,
                "employee_id": r.employee_id,
                "employee_name": emp_info.get("name", "Empleado"),
                "employee_code": emp_info.get("code", "—"),
                "employee_document": emp_info.get("document_number", "—"),
                "employee_photo": emp_info.get("photo_url"),
                "sede_name": sede_name,
                "record_type": r.record_type,
                "timestamp": r.timestamp,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "face_verified": r.face_verified,
                "inside_geofence": r.inside_geofence,
                "worked_hours": r.worked_hours,
                "observations": r.observations,
                "device_model": r.device_model,
            })

        return PaginatedResult.create(
            items=records_data,
            total=total, page=page, page_size=page_size,
        )

    async def get_employee_history(self, employee_id: str, start_date: str | None = None, end_date: str | None = None) -> list[dict]:
        records = await self.record_repo.list_by_employee(employee_id, start_date=start_date, end_date=end_date)
        return [
            {"id": r.id, "record_type": r.record_type, "timestamp": r.timestamp, "worked_hours": r.worked_hours}
            for r in records
        ]

    async def get_attendance_summary(self, record_date: str) -> dict:
        return await self.record_repo.get_attendance_summary("", record_date)
