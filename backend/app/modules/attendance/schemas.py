from pydantic import BaseModel


class AttendancePunchRequest(BaseModel):
    event_type: str  # shift_start, break_start, break_end, lunch_start, lunch_end, shift_end
    latitude: float
    longitude: float
    photo_base64: str | None = None
    break_name: str | None = None
    observations: str | None = None
    device_id: str | None = None
    is_mock_location: bool = False
    offline_timestamp: str | None = None


class KioskPunchRequest(BaseModel):
    employee_code: str  # Employee Code or Cédula/Document Number
    event_type: str  # shift_start, break_start, break_end, lunch_start, lunch_end, shift_end
    latitude: float
    longitude: float
    photo_base64: str | None = None
    break_name: str | None = None
    observations: str | None = None
    device_id: str | None = None
    is_mock_location: bool = False
    offline_timestamp: str | None = None


class AttendancePunchResponse(BaseModel):
    id: str
    event_type: str
    timestamp: str
    status: str
    message: str
    face_verified: bool
    inside_geofence: bool
    duration_minutes: int | None = None
    next_expected_event: str | None = None


class AttendanceStatusResponse(BaseModel):
    employee_id: str
    employee_name: str
    employee_photo: str | None = None
    job_position: str | None = None
    company_name: str
    date_str: str
    current_state: str  # off_shift, in_shift, in_break, in_lunch, shift_completed
    last_event_type: str | None = None
    last_event_time: str | None = None
    next_expected_event: str  # shift_start, break_start, break_end, lunch_start, lunch_end, shift_end
    allowed_events: list[str]
