import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.deps import CurrentUser, CurrentSuperUser, DbSession
from app.modules.catalogs.colombia_data import COLOMBIAN_DEPARTMENTS, COLOMBIAN_CITIES_BY_DEPT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/catalogs", tags=["Catalogs"])

# Generate flat list of all Colombian municipalities/cities
ALL_COLOMBIAN_CITIES = []
idx = 1
for dept_name, city_list in COLOMBIAN_CITIES_BY_DEPT.items():
    for city_name in city_list:
        ALL_COLOMBIAN_CITIES.append({
            "id": f"city-{idx}",
            "name": city_name,
            "department": dept_name,
        })
        idx += 1

DEFAULT_EPS = [
  {"id": "eps-01", "code": "EPS001", "name": "EPS Sura", "is_active": True},
  {"id": "eps-02", "code": "EPS002", "name": "Sanitas EPS", "is_active": True},
  {"id": "eps-03", "code": "EPS003", "name": "Compensar EPS", "is_active": True},
  {"id": "eps-04", "code": "EPS004", "name": "Salud Total EPS", "is_active": True},
  {"id": "eps-05", "code": "EPS005", "name": "Nueva EPS", "is_active": True},
  {"id": "eps-06", "code": "EPS006", "name": "Famisanar EPS", "is_active": True},
  {"id": "eps-07", "code": "EPS007", "name": "Coosalud EPS", "is_active": True},
  {"id": "eps-08", "code": "EPS008", "name": "Mutual Ser EPS", "is_active": True},
  {"id": "eps-09", "code": "EPS009", "name": "EPS Servicio Occidental de Salud (SOS)", "is_active": True},
  {"id": "eps-10", "code": "EPS010", "name": "Capital Salud EPS", "is_active": True},
]

DEFAULT_ARL = [
  {"id": "arl-01", "code": "ARL001", "name": "Positiva Compañía de Seguros (ARL Positiva)", "is_active": True},
  {"id": "arl-02", "code": "ARL002", "name": "ARL Sura", "is_active": True},
  {"id": "arl-03", "code": "ARL003", "name": "AXA Colpatria ARL", "is_active": True},
  {"id": "arl-04", "code": "ARL004", "name": "Colmena Seguros ARL", "is_active": True},
  {"id": "arl-05", "code": "ARL005", "name": "Seguros Bolívar ARL", "is_active": True},
  {"id": "arl-06", "code": "ARL006", "name": "ARL Alfa", "is_active": True},
  {"id": "arl-07", "code": "ARL007", "name": "Equidad Seguros ARL", "is_active": True},
  {"id": "arl-08", "code": "ARL008", "name": "Liberty Seguros ARL", "is_active": True},
]

DEFAULT_AFP = [
  {"id": "afp-01", "code": "AFP001", "name": "Porvenir S.A.", "is_active": True},
  {"id": "afp-02", "code": "AFP002", "name": "Protección S.A.", "is_active": True},
  {"id": "afp-03", "code": "AFP003", "name": "Colfondos S.A.", "is_active": True},
  {"id": "afp-04", "code": "AFP004", "name": "Skandia", "is_active": True},
  {"id": "afp-05", "code": "AFP005", "name": "Colpensiones (Administradora Pública)", "is_active": True},
]

DEFAULT_BANKS = [
  {"id": "bank-01", "name": "Bancolombia"},
  {"id": "bank-02", "name": "Banco de Bogotá"},
  {"id": "bank-03", "name": "Davivienda"},
  {"id": "bank-04", "name": "BBVA Colombia"},
  {"id": "bank-05", "name": "Banco de Occidente"},
  {"id": "bank-06", "name": "Banco Popular"},
  {"id": "bank-07", "name": "Banco AV Villas"},
  {"id": "bank-08", "name": "Scotiabank Colpatria"},
  {"id": "bank-09", "name": "Banco Caja Social"},
  {"id": "bank-10", "name": "Banco Agrario"},
  {"id": "bank-11", "name": "Nequi"},
  {"id": "bank-12", "name": "DaviPlata"},
]

# In-memory stores for runtime dynamic additions
catalogs_db = {
  "departments": list(COLOMBIAN_DEPARTMENTS),
  "cities": list(ALL_COLOMBIAN_CITIES),
  "eps": list(DEFAULT_EPS),
  "arl": list(DEFAULT_ARL),
  "afp": list(DEFAULT_AFP),
  "banks": list(DEFAULT_BANKS),
}


class CatalogItemCreate(BaseModel):
    name: str
    code: Optional[str] = None
    department: Optional[str] = None


@router.get("/departments")
async def list_departments():
    return catalogs_db["departments"]


@router.get("/cities")
async def list_cities(department: Optional[str] = None):
    cities = catalogs_db["cities"]
    if department:
        return [c for c in cities if c.get("department") == department]
    return cities


@router.get("/eps")
async def list_eps():
    return catalogs_db["eps"]


@router.get("/arl")
async def list_arl():
    return catalogs_db["arl"]


@router.get("/afp")
async def list_afp():
    return catalogs_db["afp"]


@router.get("/banks")
async def list_banks():
    return catalogs_db["banks"]


@router.post("/{category}")
async def create_catalog_item(category: str, body: CatalogItemCreate):
    if category not in catalogs_db:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    import uuid
    new_item = {
        "id": f"{category}-{str(uuid.uuid4())[:8]}",
        "name": body.name,
        "code": body.code or body.name[:6].upper(),
        "department": body.department,
        "is_active": True,
    }
    catalogs_db[category].append(new_item)
    return new_item


@router.put("/{category}/{item_id}")
async def update_catalog_item(category: str, item_id: str, body: CatalogItemCreate):
    if category not in catalogs_db:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    items = catalogs_db[category]
    for item in items:
        if item["id"] == item_id:
            item["name"] = body.name
            if body.code:
                item["code"] = body.code
            if body.department:
                item["department"] = body.department
            return item
    raise HTTPException(status_code=404, detail="Elemento no encontrado")


@router.delete("/{category}/{item_id}")
async def delete_catalog_item(category: str, item_id: str):
    if category not in catalogs_db:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    items = catalogs_db[category]
    catalogs_db[category] = [i for i in items if i["id"] != item_id]
    return {"message": "Elemento eliminado correctamente"}
