import logging
from fastapi import APIRouter, HTTPException, status
from app.core.deps import DbSession
from app.modules.system_config.repository import SystemConfigRepository
from app.modules.system_config.schemas import ConfigItem

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/system-config", tags=["System Configuration"])


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
