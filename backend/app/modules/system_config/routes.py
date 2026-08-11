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
    is_super = getattr(current_user, "is_superuser", False)
    email = getattr(current_user, "email", "")
    if not is_super and (email or "").lower() != "admin@dlaredes.com.co":
        raise HTTPException(status_code=403, detail="Only Super Admins can wipe the database")

    # Import models here to avoid circular imports
    from app.shared.database.models_access import AccessRecord, LocationHistory, RouteHistory, DeviceInfo
    from app.shared.database.models_scheduling import Shift, WorkSchedule
    from app.shared.database.models_payroll import PayrollRecord, PayrollPeriod, OvertimeRecord
    from app.shared.database.models_clients import Client, Branch, ClientLocation, ClientGeofence
    from app.shared.database.models_hr import Employee, Contract, JobPosition, Department, WorkTeam, CostCenter
    from app.shared.database.models_auth import User

    try:
        if "attendance" in body.modules:
            await db.execute(delete(AccessRecord))
            await db.execute(delete(LocationHistory))
            await db.execute(delete(RouteHistory))
            await db.execute(delete(DeviceInfo))
            
        if "scheduling" in body.modules:
            await db.execute(delete(Shift))
            await db.execute(delete(WorkSchedule))
            
        if "payroll" in body.modules:
            await db.execute(delete(PayrollRecord))
            await db.execute(delete(PayrollPeriod))
            await db.execute(delete(OvertimeRecord))
            
        if "clients" in body.modules:
            await db.execute(delete(ClientGeofence))
            await db.execute(delete(ClientLocation))
            await db.execute(delete(Branch))
            await db.execute(delete(Client))
            
        if "employees" in body.modules:
            await db.execute(delete(Contract))
            await db.execute(delete(JobPosition))
            await db.execute(delete(Department))
            await db.execute(delete(WorkTeam))
            await db.execute(delete(CostCenter))
            
            # Keep admin users
            await db.execute(delete(User).where(User.email != "admin@dlaredes.com.co"))
            await db.execute(delete(Employee).where(Employee.email != "admin@dlaredes.com.co"))

        await db.commit()
        return {"message": "Datos borrados exitosamente", "modules": body.modules}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error wiping database: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
