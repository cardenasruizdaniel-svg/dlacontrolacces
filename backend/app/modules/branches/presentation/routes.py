import uuid
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.shared.database.models_company import Branch, Company
from app.shared.database.models_hr import Employee

router = APIRouter(prefix="/branches", tags=["Branches & Sub-branches"])


class BranchCreateRequest(BaseModel):
    company_id: str | None = None
    parent_id: str | None = None
    code: str
    name: str
    address: str | None = None
    city: str | None = "Armenia"
    department: str | None = "Quindío"
    phone: str | None = None
    email: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    geofence_radius: float = 100.0
    is_main: bool = False
    is_sub_branch: bool = False
    is_active: bool = True


class BranchUpdateRequest(BaseModel):
    parent_id: str | None = None
    code: str | None = None
    name: str | None = None
    address: str | None = None
    city: str | None = None
    department: str | None = None
    phone: str | None = None
    email: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    geofence_radius: float | None = None
    is_main: bool | None = None
    is_sub_branch: bool | None = None
    is_active: bool | None = None


@router.get("")
async def list_branches(
    current_user: CurrentUser,
    db: DbSession,
    company_id: str | None = Query(None),
    parent_id: str | None = Query(None),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
) -> dict:
    query = select(Branch).where(Branch.is_deleted == False)

    if company_id and company_id != "dla-company-main":
        query = query.where(Branch.company_id == company_id)

    if parent_id is not None:
        if parent_id == "none" or parent_id == "":
            query = query.where(Branch.parent_id == None)
        else:
            query = query.where(Branch.parent_id == parent_id)

    if is_active is not None:
        query = query.where(Branch.is_active == is_active)

    if search and search.strip():
        terms = search.strip().split()
        for t in terms:
            query = query.where(
                Branch.name.ilike(f"%{t}%")
                | Branch.code.ilike(f"%{t}%")
                | Branch.city.ilike(f"%{t}%")
                | Branch.address.ilike(f"%{t}%")
            )

    query = query.order_by(func.lower(Branch.name).asc())
    result = await db.execute(query)
    branches = list(result.scalars().all())

    # If database has no branches yet, auto-create default headquarters
    if not branches and not search:
        # Check company
        comp_res = await db.execute(select(Company).where(Company.is_deleted == False).limit(1))
        comp = comp_res.scalar_one_or_none()
        cid = comp.id if comp else "dla-company-main"

        main_branch = Branch(
            id=str(uuid.uuid4()),
            company_id=cid,
            code="SEDE-PPAL",
            name="Sede Principal Central",
            address="Cra. 14 # 23-00",
            city="Armenia",
            department="Quindío",
            phone="3001234567",
            latitude=4.5389,
            longitude=-75.6757,
            geofence_radius=150.0,
            is_main=True,
            is_sub_branch=False,
            is_active=True,
            is_deleted=False,
        )
        db.add(main_branch)
        await db.flush()

        # Add a sub-branch example
        sub_branch = Branch(
            id=str(uuid.uuid4()),
            company_id=cid,
            parent_id=main_branch.id,
            code="SUB-NORTE",
            name="Subsede Norte - Puesto de Control",
            address="Av. Bolívar # 19N-45",
            city="Armenia",
            department="Quindío",
            phone="3109876543",
            latitude=4.5510,
            longitude=-75.6620,
            geofence_radius=100.0,
            is_main=False,
            is_sub_branch=True,
            is_active=True,
            is_deleted=False,
        )
        db.add(sub_branch)
        await db.flush()

        result = await db.execute(query)
        branches = list(result.scalars().all())

    # Build response with parent names and employee counts
    items = []
    # Map of all branch names
    branch_map = {b.id: b.name for b in branches}
    for b in branches:
        # Count employees assigned to this branch
        emp_count_res = await db.execute(
            select(func.count(Employee.id)).where(
                Employee.branch_id == b.id,
                Employee.is_deleted == False,
                Employee.status == "active"
            )
        )
        emp_count = emp_count_res.scalar() or 0

        items.append({
            "id": b.id,
            "company_id": b.company_id,
            "parent_id": b.parent_id,
            "parent_name": branch_map.get(b.parent_id) if b.parent_id else None,
            "code": b.code,
            "name": b.name,
            "address": b.address,
            "city": b.city,
            "department": b.department,
            "phone": b.phone,
            "email": b.email,
            "latitude": b.latitude,
            "longitude": b.longitude,
            "geofence_radius": b.geofence_radius,
            "is_main": b.is_main,
            "is_sub_branch": bool(b.parent_id or b.is_sub_branch),
            "is_active": b.is_active,
            "employees_count": emp_count,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })

    return {"items": items, "total": len(items)}


@router.post("", status_code=201)
async def create_branch(
    body: BranchCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    cid = body.company_id
    if not cid or cid == "dla-company-main":
        comp_res = await db.execute(select(Company).where(Company.is_deleted == False).limit(1))
        comp = comp_res.scalar_one_or_none()
        cid = comp.id if comp else str(uuid.uuid4())

    is_sub = bool(body.parent_id or body.is_sub_branch)

    branch = Branch(
        id=str(uuid.uuid4()),
        company_id=cid,
        parent_id=body.parent_id,
        code=body.code.strip().upper(),
        name=body.name.strip(),
        address=body.address,
        city=body.city or "Armenia",
        department=body.department or "Quindío",
        phone=body.phone,
        email=body.email,
        latitude=body.latitude,
        longitude=body.longitude,
        geofence_radius=body.geofence_radius or 100.0,
        is_main=body.is_main and not is_sub,
        is_sub_branch=is_sub,
        is_active=body.is_active,
        is_deleted=False,
    )
    db.add(branch)
    await db.flush()
    return {"id": branch.id, "name": branch.name, "code": branch.code, "message": "Sede/Subsede creada con éxito"}


@router.get("/{branch_id}")
async def get_branch(
    branch_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    res = await db.execute(select(Branch).where(Branch.id == branch_id, Branch.is_deleted == False))
    branch = res.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    parent_name = None
    if branch.parent_id:
        p_res = await db.execute(select(Branch.name).where(Branch.id == branch.parent_id))
        parent_name = p_res.scalar_one_or_none()

    return {
        "id": branch.id,
        "company_id": branch.company_id,
        "parent_id": branch.parent_id,
        "parent_name": parent_name,
        "code": branch.code,
        "name": branch.name,
        "address": branch.address,
        "city": branch.city,
        "department": branch.department,
        "phone": branch.phone,
        "email": branch.email,
        "latitude": branch.latitude,
        "longitude": branch.longitude,
        "geofence_radius": branch.geofence_radius,
        "is_main": branch.is_main,
        "is_sub_branch": bool(branch.parent_id or branch.is_sub_branch),
        "is_active": branch.is_active,
    }


@router.put("/{branch_id}")
async def update_branch(
    branch_id: str,
    body: BranchUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    res = await db.execute(select(Branch).where(Branch.id == branch_id, Branch.is_deleted == False))
    branch = res.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    update_data = body.model_dump(exclude_unset=True)
    if "parent_id" in update_data:
        update_data["is_sub_branch"] = bool(update_data["parent_id"])
    if "code" in update_data and update_data["code"]:
        update_data["code"] = update_data["code"].strip().upper()
    if "name" in update_data and update_data["name"]:
        update_data["name"] = update_data["name"].strip()

    await db.execute(update(Branch).where(Branch.id == branch_id).values(**update_data))
    await db.flush()
    return {"id": branch_id, "message": "Sede/Subsede actualizada con éxito"}


@router.patch("/{branch_id}/status")
async def toggle_branch_status(
    branch_id: str,
    current_user: CurrentUser,
    db: DbSession,
    is_active: bool = Query(...),
) -> dict:
    res = await db.execute(select(Branch).where(Branch.id == branch_id, Branch.is_deleted == False))
    branch = res.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    await db.execute(update(Branch).where(Branch.id == branch_id).values(is_active=is_active))
    await db.flush()
    return {"id": branch_id, "is_active": is_active, "message": "Estado de sede actualizado"}


@router.delete("/{branch_id}")
async def delete_branch(
    branch_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    res = await db.execute(select(Branch).where(Branch.id == branch_id, Branch.is_deleted == False))
    branch = res.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    await db.execute(update(Branch).where(Branch.id == branch_id).values(is_deleted=True, is_active=False))
    await db.flush()
    return {"message": "Sede eliminada correctamente"}
