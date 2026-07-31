from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.modules.system_config.models import SystemConfig

DEFAULT_CONFIGS = [
    {
        "key": "GOOGLE_MAPS_API_KEY",
        "value": "",
        "description": "API Key de Google Maps para geocodificación, visualización de mapas y validación de ubicaciones en web y mobile."
    },
    {
        "key": "COMPANY_NAME",
        "value": "DLA Redes y Seguridad",
        "description": "Nombre oficial o Razón Social de la empresa para reportes y recibos de nómina."
    },
    {
        "key": "COMPANY_NIT",
        "value": "900.000.000-0",
        "description": "Número de Identificación Tributaria (NIT) de la empresa."
    },
    {
        "key": "COMPANY_EMAIL",
        "value": "info@dlaredes.com.co",
        "description": "Correo electrónico corporativo para notificaciones del sistema."
    },
    {
        "key": "COMPANY_PHONE",
        "value": "+57 300 000 0000",
        "description": "Teléfono de contacto de la empresa."
    },
    {
        "key": "COMPANY_LOGO",
        "value": "",
        "description": "Logo oficial de la empresa en formato Base64 o URL para el encabezado y reportes."
    },
    {
        "key": "MINIMUM_WAGE",
        "value": "1423500",
        "description": "Salario Mínimo Mensual Legal Vigente (SMLMV) en Colombia para cálculo de salario base y liquidaciones."
    },
    {
        "key": "TRANSPORTATION_ASSISTANCE",
        "value": "200000",
        "description": "Auxilio de Transporte legal mensual en Colombia para devengados y prestaciones sociales."
    },
    {
        "key": "GEOFENCE_RADIUS_METERS",
        "value": "100",
        "description": "Radio de margen permitido en metros para validación de geocerca en cliente al iniciar turno."
    },
    {
        "key": "FACE_RECOGNITION_TOLERANCE",
        "value": "0.60",
        "description": "Tolerancia de similitud para verificación biométrica facial (rango recomendado: 0.40 a 0.65)."
    }
]

class SystemConfigRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self):
        result = await self.db.execute(select(SystemConfig))
        items = list(result.scalars().all())
        
        # If database is empty, seed defaults
        if not items:
            for conf in DEFAULT_CONFIGS:
                item = SystemConfig(**conf)
                self.db.add(item)
            await self.db.commit()
            result = await self.db.execute(select(SystemConfig))
            items = list(result.scalars().all())
        else:
            # Check if any default key is missing and add it
            existing_keys = {item.key for item in items}
            added = False
            for conf in DEFAULT_CONFIGS:
                if conf["key"] not in existing_keys:
                    self.db.add(SystemConfig(**conf))
                    added = True
            if added:
                await self.db.commit()
                result = await self.db.execute(select(SystemConfig))
                items = list(result.scalars().all())

        return items

    async def get(self, key: str):
        result = await self.db.execute(select(SystemConfig).where(SystemConfig.key == key))
        return result.scalar_one_or_none()

    async def upsert(self, key: str, value: str | None, description: str | None = None):
        item = await self.get(key)
        if item:
            item.value = value
            if description is not None:
                item.description = description
        else:
            item = SystemConfig(key=key, value=value, description=description)
            self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def delete(self, key: str):
        await self.db.execute(delete(SystemConfig).where(SystemConfig.key == key))
        await self.db.commit()
