from datetime import datetime

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, Numeric, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database.models_base import BaseModel


class Department(BaseModel):
    __tablename__ = "departments"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    manager_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    cost_center: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    parent: Mapped["Department | None"] = relationship(remote_side="Department.id", back_populates="children")
    children: Mapped[list["Department"]] = relationship(back_populates="parent")


class JobPosition(BaseModel):
    __tablename__ = "job_positions"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    department_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    min_salary: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    max_salary: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    department: Mapped["Department | None"] = relationship()


class CostCenter(BaseModel):
    __tablename__ = "cost_centers"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cost_centers.id"), nullable=True)
    budget: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    parent: Mapped["CostCenter | None"] = relationship(remote_side="CostCenter.id", back_populates="children")
    children: Mapped[list["CostCenter"]] = relationship(back_populates="parent")


class WorkTeam(BaseModel):
    __tablename__ = "work_teams"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    leader_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Employee(BaseModel):
    __tablename__ = "employees"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    branch_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("branches.id"), nullable=True)
    department_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    job_position_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("job_positions.id"), nullable=True)
    cost_center_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cost_centers.id"), nullable=True)
    work_team_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("work_teams.id"), nullable=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(10), nullable=False)
    document_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    second_last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    department_loc: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(5), default="CO", nullable=False)
    birth_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(1), nullable=True)
    blood_type: Mapped[str | None] = mapped_column(String(5), nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    facial_photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    facial_photo_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=True)
    biometric_enrollment_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    signature_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    fingerprint_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    facial_encoding: Mapped[str | None] = mapped_column(Text, nullable=True)
    eps: Mapped[str | None] = mapped_column(String(200), nullable=True)
    arl: Mapped[str | None] = mapped_column(String(200), nullable=True)
    afp: Mapped[str | None] = mapped_column(String(200), nullable=True)
    caja_compensacion: Mapped[str | None] = mapped_column(String(200), nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    emergency_contact_relation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    hire_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    termination_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bank_account_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # ── Acceso al Sistema ──────────────────────────────────────────────
    username: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(200), nullable=True)
    role_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("roles.id"), nullable=True)
    platform_access: Mapped[str] = mapped_column(String(20), default="none", nullable=False)
    # none, web, mobile, both
    account_status: Mapped[str] = mapped_column(String(20), default="inactive", nullable=False)
    # active, suspended, locked, inactive, pending_activation
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    force_password_change: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_platform: Mapped[str | None] = mapped_column(String(20), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_login_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    biometric_enrolled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_secret: Mapped[str | None] = mapped_column(String(100), nullable=True)
    app_status: Mapped[str] = mapped_column(String(20), default="not_installed", nullable=False)
    # not_installed, not_synced, pending, active, blocked
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    can_assign_georeference: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    company: Mapped["Company"] = relationship(back_populates="employees")
    branch: Mapped["Branch | None"] = relationship()
    contracts: Mapped[list["Contract"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
    dotaciones: Mapped[list["EmployeeDotacion"]] = relationship(back_populates="employee")
    job_position: Mapped["JobPosition | None"] = relationship()
    department: Mapped["Department | None"] = relationship()
    role: Mapped["Role | None"] = relationship(back_populates="employees")
    documents: Mapped[list["EmployeeDocument"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
    sessions: Mapped[list["UserSession"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="employee", cascade="all, delete-orphan")


class EmployeeDotacion(BaseModel):
    __tablename__ = "employee_dotaciones"

    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    delivered_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    returned_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="delivered", nullable=False)

    employee: Mapped["Employee"] = relationship(back_populates="dotaciones")


class EmployeeDocument(BaseModel):
    __tablename__ = "employee_documents"

    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expiry_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    employee: Mapped["Employee"] = relationship(back_populates="documents")


# Late-binding imports to resolve cross-file forward references
from app.shared.database.models_company import Company  # noqa: E402, F401
from app.shared.database.models_contract import Contract  # noqa: E402, F401
from app.shared.database.models_auth import Role  # noqa: E402, F401
