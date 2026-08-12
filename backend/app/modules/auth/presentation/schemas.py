from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str
    full_name: str
    company_id: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict | None = None
    first_login: bool | None = None
    force_password_change: bool | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class MFAVerifyRequest(BaseModel):
    temp_token: str
    code: str


class MFAEnableResponse(BaseModel):
    secret: str
    provisioning_uri: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    is_active: bool
    is_superuser: bool
    mfa_enabled: bool
    company_id: str | None = None
    role_id: str | None = None
    role: dict | str | None = None
    role_name: str | None = None
    platform_access: str | None = "both"


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class FirstLoginPasswordRequest(BaseModel):
    new_password: str
    confirm_password: str
