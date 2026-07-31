from pydantic import BaseModel, model_validator


def _clean_optional_strings(values: dict) -> dict:
    for k, v in list(values.items()):
        if k == "company_id" and (not v or v == ""):
            continue
        if isinstance(v, str) and v.strip() == "":
            values[k] = None
    return values


class ClientCreateRequest(BaseModel):
    company_id: str | None = None
    client_type: str = "enterprise"
    nit: str | None = None
    name: str
    trade_name: str | None = None
    email: str | None = None
    phone: str | None = None
    mobile: str | None = None
    website: str | None = None
    address: str | None = None
    city: str | None = None
    department: str | None = None
    country: str = "CO"
    latitude: float | None = None
    longitude: float | None = None
    geofence_radius: float = 100.0
    notes: str | None = None
    status: str = "active"
    logo_url: str | None = None
    contract_value: float | None = None
    start_date: str | None = None
    end_date: str | None = None

    @model_validator(mode="before")
    @classmethod
    def clean_empty_strings(cls, data: dict) -> dict:
        return _clean_optional_strings(data)


class ClientUpdateRequest(BaseModel):
    company_id: str | None = None
    client_type: str | None = None
    nit: str | None = None
    name: str | None = None
    trade_name: str | None = None
    email: str | None = None
    phone: str | None = None
    mobile: str | None = None
    website: str | None = None
    address: str | None = None
    city: str | None = None
    department: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    geofence_radius: float | None = None
    notes: str | None = None
    status: str | None = None
    logo_url: str | None = None
    contract_value: float | None = None
    start_date: str | None = None
    end_date: str | None = None

    @model_validator(mode="before")
    @classmethod
    def clean_empty_strings(cls, data: dict) -> dict:
        return _clean_optional_strings(data)


class ContactCreateRequest(BaseModel):
    full_name: str
    position: str | None = None
    email: str | None = None
    phone: str | None = None
    mobile: str | None = None
    is_primary: bool = False
    notes: str | None = None

    @model_validator(mode="before")
    @classmethod
    def clean_empty_strings(cls, data: dict) -> dict:
        return _clean_optional_strings(data)


class LocationCreateRequest(BaseModel):
    name: str
    address: str | None = None
    latitude: float
    longitude: float
    geofence_radius: float = 100.0
    geofence_polygon: str | None = None
    notes: str | None = None

    @model_validator(mode="before")
    @classmethod
    def clean_empty_strings(cls, data: dict) -> dict:
        return _clean_optional_strings(data)


class PatientCreateRequest(BaseModel):
    document_type: str
    document_number: str
    first_name: str
    last_name: str
    middle_name: str | None = None
    email: str | None = None
    phone: str | None = None
    mobile: str | None = None
    address: str | None = None
    city: str | None = None
    birth_date: str | None = None
    gender: str | None = None
    blood_type: str | None = None
    medical_notes: str | None = None
    latitude: float | None = None
    longitude: float | None = None

    @model_validator(mode="before")
    @classmethod
    def clean_empty_strings(cls, data: dict) -> dict:
        return _clean_optional_strings(data)


class ClientListResponse(BaseModel):
    items: list[dict]
    total: int
    page: int
    page_size: int
    total_pages: int
