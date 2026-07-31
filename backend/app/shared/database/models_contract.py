from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database.models_base import BaseModel


class ContractType(BaseModel):
    __tablename__ = "contract_types"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    labor_law_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # Tipos legales colombianos:
    # fixed_term = Contrato a término fijo
    # indefinite = Contrato a término indefinido
    # specific_work = Contrato por obra o labor
    # services = Contrato de prestación de servicios
    # apprenticeship = Contrato de aprendizaje SENA
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Contract(BaseModel):
    __tablename__ = "contracts"

    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    contract_type_id: Mapped[str] = mapped_column(String(36), ForeignKey("contract_types.id"), nullable=False)
    branch_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("branches.id"), nullable=True)
    department_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    job_position_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("job_positions.id"), nullable=True)
    cost_center_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cost_centers.id"), nullable=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Fechas
    start_date: Mapped[str] = mapped_column(Date, nullable=False)
    end_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    probation_end_date: Mapped[str | None] = mapped_column(Date, nullable=True)

    # Salario y compensación
    salary: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    salary_type: Mapped[str] = mapped_column(String(20), default="monthly", nullable=False)
    # monthly = Salario mensual completo
    # hourly = Pago por horas
    # per_shift = Pago por turnos
    # custom = Personalizado
    hourly_rate: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    max_hours_per_day: Mapped[float | None] = mapped_column(Float, nullable=True)
    contracted_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    shift_value: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    daily_rate: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    shift_duration_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    shifts_per_period: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transportation_assistance: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Jornada laboral (Art. 59 CST)
    weekly_hours: Mapped[float] = mapped_column(Float, default=48.0, nullable=False)
    daily_hours: Mapped[float] = mapped_column(Float, default=8.0, nullable=False)
    work_scheme: Mapped[str] = mapped_column(String(20), default="full_time", nullable=False)
    # full_time = Tiempo completo
    # part_time = Medio tiempo
    # hourly = Por horas
    # specific = Obra o labor
    payment_frequency: Mapped[str] = mapped_column(String(20), default="monthly", nullable=False)

    # Descansos y días hábiles
    weekly_rest_day: Mapped[str] = mapped_column(String(10), default="sunday", nullable=False)
    overtime_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Estado y liquidación
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    termination_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    termination_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # voluntary = Retiro voluntario
    # just_cause = Justa causa
    # end_of_term = Terminación del plazo
    # mutual_agreement = Acuerdo mutuo

    # Renovaciones
    renewal_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_renewable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Documentos del contrato / empleado (Certificados, Cédula, Exámenes, etc.)
    documents_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Firma digital del contrato
    signature_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_signed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    signed_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    signature_method: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Notas
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Seguridad social
    health_provider: Mapped[str | None] = mapped_column(String(200), nullable=True)
    pension_provider: Mapped[str | None] = mapped_column(String(200), nullable=True)
    arl_provider: Mapped[str | None] = mapped_column(String(200), nullable=True)
    risk_level: Mapped[str] = mapped_column(String(1), default="1", nullable=False)

    employee: Mapped["Employee"] = relationship(back_populates="contracts")
    contract_type: Mapped["ContractType"] = relationship()


# Late-binding imports to resolve cross-file forward references
from app.shared.database.models_hr import Employee  # noqa: E402, F401
