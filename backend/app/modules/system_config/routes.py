import logging
from fastapi import APIRouter, HTTPException, status
from app.core.deps import DbSession, CurrentUser
from app.modules.system_config.repository import SystemConfigRepository
from app.modules.system_config.schemas import ConfigItem

from pydantic import BaseModel
from sqlalchemy import delete

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/system-config", tags=["System Configuration"])


class WipeRequest(BaseModel):
    modules: list[str]


@router.post("/wipe", status_code=status.HTTP_200_OK)
async def wipe_database(body: WipeRequest, current_user: CurrentUser, db: DbSession):
    user_email = (getattr(current_user, "email", "") or "").lower()
    curr_id = getattr(current_user, "id", None)

    # Import models here with correct file origins to avoid circular/ImportErrors
    from app.shared.database.models_access import AccessRecord, LocationHistory, RouteHistory, DeviceInfo
    from app.shared.database.models_scheduling import Shift, Schedule, ScheduleSeries, ShiftTemplate
    from app.shared.database.models_payroll import PayrollRecord, PayrollPeriod, OvertimeRecord
    from app.shared.database.models_clients import Client, ClientContact, ClientLocation, Patient, Persona, Project
    from app.shared.database.models_company import Branch
    from app.shared.database.models_hr import Employee, EmployeeDocument, Contract, JobPosition, Department, WorkTeam, CostCenter
    from app.shared.database.models_auth import User, AuditLog

    try:
        if "attendance" in body.modules:
            await db.execute(delete(AccessRecord))
            await db.execute(delete(LocationHistory))
            await db.execute(delete(RouteHistory))
            await db.execute(delete(DeviceInfo))
            
        if "scheduling" in body.modules:
            await db.execute(delete(Shift))
            await db.execute(delete(Schedule))
            await db.execute(delete(ScheduleSeries))
            await db.execute(delete(ShiftTemplate))
            
        if "payroll" in body.modules:
            await db.execute(delete(OvertimeRecord))
            await db.execute(delete(PayrollRecord))
            await db.execute(delete(PayrollPeriod))
            
        if "clients" in body.modules:
            await db.execute(delete(ClientContact))
            await db.execute(delete(ClientLocation))
            await db.execute(delete(Patient))
            await db.execute(delete(Persona))
            await db.execute(delete(Project))
            await db.execute(delete(Branch).where(Branch.is_main == False))
            await db.execute(delete(Client))
            
        if "employees" in body.modules:
            # Delete ALL child dependencies FIRST to avoid FK violations
            await db.execute(delete(EmployeeDocument))
            await db.execute(delete(AccessRecord))
            await db.execute(delete(OvertimeRecord))
            await db.execute(delete(PayrollRecord))
            await db.execute(delete(Shift))
            await db.execute(delete(Schedule))
            await db.execute(delete(ScheduleSeries))
            await db.execute(delete(Contract))
            await db.execute(delete(JobPosition))
            await db.execute(delete(Department))
            await db.execute(delete(WorkTeam))
            await db.execute(delete(CostCenter))
            await db.execute(delete(AuditLog))

            # Delete all non-current user employees
            if curr_id:
                await db.execute(delete(Employee).where(Employee.id != curr_id))
                await db.execute(delete(User).where(User.id != curr_id, User.employee_id != curr_id))
            elif user_email:
                await db.execute(delete(Employee).where(Employee.email != user_email))
                await db.execute(delete(User).where(User.email != user_email))

        await db.commit()
        return {"message": "Datos borrados exitosamente", "modules": body.modules}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error wiping database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al reiniciar datos: {str(e)}")


@router.get("/", response_model=list[ConfigItem])
async def list_config(db: DbSession):
    repo = SystemConfigRepository(db)
    return await repo.get_all()


@router.get("/{key}", response_model=ConfigItem)
async def get_config(key: str, db: DbSession):
    repo = SystemConfigRepository(db)
    item = await repo.get(key)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Configuración no encontrada")
    return item


@router.put("/{key}", response_model=ConfigItem)
async def set_config(key: str, body: ConfigItem, db: DbSession):
    repo = SystemConfigRepository(db)
    updated = await repo.upsert(key, body.value, body.description)
    return updated


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(key: str, db: DbSession):
    repo = SystemConfigRepository(db)
    await repo.delete(key)
    return None
