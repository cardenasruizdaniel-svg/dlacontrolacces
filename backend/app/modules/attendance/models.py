from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.shared.database.models_base import BaseModel


class AttendanceRecord(BaseModel):
    __tablename__ = "attendance_records"

    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    shift_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("shifts.id"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    # Event types: shift_start, break_start, break_end, lunch_start, lunch_end, shift_end

    timestamp: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    offline_timestamp: Mapped[str | None] = mapped_column(String(30), nullable=True)
    
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    
    selfie_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    face_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    inside_geofence: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    geofence_distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    break_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_mock_location: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_synced: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    employee: Mapped["Employee | None"] = relationship(foreign_keys=[employee_id])


class AttendanceAuditLog(BaseModel):
    __tablename__ = "attendance_audit_logs"

    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    attempted_event: Mapped[str] = mapped_column(String(30), nullable=False)
    timestamp: Mapped[str] = mapped_column(String(30), nullable=False)
    reason_failed: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(200), nullable=True)


from app.shared.database.models_hr import Employee  # noqa: E402, F401
