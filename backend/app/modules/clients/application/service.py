from datetime import date

from fastapi import HTTPException, status

from app.core.pagination import PaginatedResult
from app.modules.clients.infrastructure.repositories import (
    ClientContactRepository,
    ClientLocationRepository,
    ClientRepository,
    PatientRepository,
    ProjectRepository,
)


class ClientService:
    def __init__(self, client_repo: ClientRepository, patient_repo: PatientRepository,
                 project_repo: ProjectRepository, contact_repo: ClientContactRepository,
                 location_repo: ClientLocationRepository) -> None:
        self.client_repo = client_repo
        self.patient_repo = patient_repo
        self.project_repo = project_repo
        self.contact_repo = contact_repo
        self.location_repo = location_repo

    def _serialize_client(self, client) -> dict:
        return {
            "id": client.id,
            "company_id": client.company_id,
            "client_type": client.client_type,
            "nit": client.nit,
            "name": client.name,
            "trade_name": client.trade_name,
            "email": client.email,
            "phone": client.phone,
            "mobile": client.mobile,
            "website": client.website,
            "address": client.address,
            "city": client.city,
            "department": client.department,
            "country": client.country,
            "latitude": client.latitude,
            "longitude": client.longitude,
            "geofence_radius": client.geofence_radius,
            "geofence_polygon": client.geofence_polygon,
            "logo_url": client.logo_url,
            "notes": client.notes,
            "status": client.status,
            "contract_value": float(client.contract_value) if client.contract_value else None,
            "start_date": str(client.start_date) if client.start_date else None,
            "end_date": str(client.end_date) if client.end_date else None,
            "created_at": str(client.created_at) if client.created_at else None,
        }

    async def create_client(self, **kwargs: dict) -> dict:
        if "start_date" in kwargs and kwargs["start_date"]:
            kwargs["start_date"] = date.fromisoformat(kwargs["start_date"]) if isinstance(kwargs["start_date"], str) else kwargs["start_date"]
        if "end_date" in kwargs and kwargs["end_date"]:
            kwargs["end_date"] = date.fromisoformat(kwargs["end_date"]) if isinstance(kwargs["end_date"], str) else kwargs["end_date"]
        client = await self.client_repo.create(**kwargs)
        return self._serialize_client(client)

    async def get_client(self, client_id: str) -> dict:
        client = await self.client_repo.get_by_id(client_id)
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        contacts = await self.contact_repo.list_by_client(client_id)
        locations = await self.location_repo.list_by_client(client_id)
        patient_count = await self.patient_repo.count_by_client(client_id)
        data = self._serialize_client(client)
        data["contacts"] = [
            {"id": c.id, "full_name": c.full_name, "position": c.position, "email": c.email,
             "phone": c.phone, "mobile": c.mobile, "is_primary": c.is_primary, "notes": c.notes}
            for c in contacts
        ]
        data["locations"] = [
            {"id": l.id, "name": l.name, "address": l.address, "latitude": l.latitude,
             "longitude": l.longitude, "geofence_radius": l.geofence_radius,
             "geofence_polygon": l.geofence_polygon, "notes": l.notes, "is_active": l.is_active}
            for l in locations
        ]
        data["patient_count"] = patient_count
        return data

    async def list_clients(self, company_id: str | None = None, client_type: str | None = None,
                           status: str | None = None, search: str | None = None,
                           page: int = 1, page_size: int = 25) -> PaginatedResult:
        skip = (page - 1) * page_size
        items, total = await self.client_repo.list_clients(
            company_id=company_id, client_type=client_type, status=status,
            search=search, skip=skip, limit=page_size,
        )
        return PaginatedResult.create(
            items=[self._serialize_client(c) for c in items],
            total=total, page=page, page_size=page_size,
        )

    async def update_client(self, client_id: str, **kwargs: dict) -> dict:
        client = await self.client_repo.get_by_id(client_id)
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        if "start_date" in kwargs and kwargs["start_date"]:
            kwargs["start_date"] = date.fromisoformat(kwargs["start_date"]) if isinstance(kwargs["start_date"], str) else kwargs["start_date"]
        if "end_date" in kwargs and kwargs["end_date"]:
            kwargs["end_date"] = date.fromisoformat(kwargs["end_date"]) if isinstance(kwargs["end_date"], str) else kwargs["end_date"]
        updated = await self.client_repo.update(client_id, **kwargs)
        return self._serialize_client(updated)

    async def delete_client(self, client_id: str, db: any = None) -> dict:
        client = await self.client_repo.get_by_id(client_id)
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

        if db:
            from sqlalchemy import select, func
            from app.shared.database.models_access import AccessRecord
            from app.shared.database.models_scheduling import Shift, ScheduleSeries

            access_count = (await db.execute(select(func.count(AccessRecord.id)).where(AccessRecord.client_id == client_id))).scalar() or 0
            shift_count = (await db.execute(select(func.count(Shift.id)).where(Shift.client_id == client_id))).scalar() or 0
            series_count = (await db.execute(select(func.count(ScheduleSeries.id)).where(ScheduleSeries.client_id == client_id))).scalar() or 0

            total_movements = access_count + shift_count + series_count
            if total_movements > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se puede eliminar el cliente o sede '{client.name}' porque cuenta con {total_movements} movimientos o turnos asociados necesarios para informes y trazabilidad. Se recomienda cambiar su estado a 'Inactivo' o modificar la información."
                )

        await self.client_repo.soft_delete(client_id)
        return {"message": "Cliente eliminado correctamente"}

    async def update_status(self, client_id: str, new_status: str) -> dict:
        client = await self.client_repo.get_by_id(client_id)
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        await self.client_repo.update(client_id, status=new_status)
        return {"message": f"Client status changed to {new_status}", "status": new_status}

    async def list_contacts(self, client_id: str) -> list[dict]:
        client = await self.client_repo.get_by_id(client_id)
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        contacts = await self.contact_repo.list_by_client(client_id)
        return [
            {"id": c.id, "full_name": c.full_name, "position": c.position, "email": c.email,
             "phone": c.phone, "mobile": c.mobile, "is_primary": c.is_primary, "notes": c.notes}
            for c in contacts
        ]

    async def delete_contact(self, client_id: str, contact_id: str) -> dict:
        contact = await self.contact_repo.get_by_id(contact_id)
        if not contact or contact.client_id != client_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
        await self.contact_repo.soft_delete(contact_id)
        return {"message": "Contact deleted successfully"}

    async def list_locations(self, client_id: str) -> list[dict]:
        client = await self.client_repo.get_by_id(client_id)
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        locations = await self.location_repo.list_by_client(client_id, include_inactive=True)
        return [
            {"id": l.id, "name": l.name, "address": l.address, "latitude": l.latitude,
             "longitude": l.longitude, "geofence_radius": l.geofence_radius,
             "geofence_polygon": l.geofence_polygon, "notes": l.notes, "is_active": l.is_active}
            for l in locations
        ]

    async def delete_location(self, client_id: str, location_id: str) -> dict:
        location = await self.location_repo.get_by_id(location_id)
        if not location or location.client_id != client_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
        await self.location_repo.soft_delete(location_id)
        return {"message": "Location deleted successfully"}

    async def create_patient(self, client_id: str, **kwargs: dict) -> dict:
        client = await self.client_repo.get_by_id(client_id)
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        patient = await self.patient_repo.create(client_id=client_id, **kwargs)
        return {"id": patient.id, "first_name": patient.first_name, "last_name": patient.last_name}

    async def list_patients(self, client_id: str, search: str | None = None,
                            page: int = 1, page_size: int = 25) -> PaginatedResult:
        skip = (page - 1) * page_size
        items, total = await self.patient_repo.list_by_client(client_id, search=search, skip=skip, limit=page_size)
        return PaginatedResult.create(
            items=[{"id": p.id, "document_number": p.document_number, "first_name": p.first_name, "last_name": p.last_name, "status": p.status} for p in items],
            total=total, page=page, page_size=page_size,
        )

    async def delete_patient(self, client_id: str, patient_id: str) -> dict:
        patient = await self.patient_repo.get_by_id(patient_id)
        if not patient or patient.client_id != client_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        await self.patient_repo.soft_delete(patient_id)
        return {"message": "Patient deleted successfully"}

    async def add_contact(self, client_id: str, **kwargs: dict) -> dict:
        contact = await self.contact_repo.create(client_id=client_id, **kwargs)
        return {"id": contact.id, "full_name": contact.full_name}

    async def add_location(self, client_id: str, **kwargs: dict) -> dict:
        loc = await self.location_repo.create(client_id=client_id, **kwargs)
        return {"id": loc.id, "name": loc.name, "latitude": loc.latitude, "longitude": loc.longitude}

    async def create_project(self, client_id: str, **kwargs: dict) -> dict:
        project = await self.project_repo.create(client_id=client_id, **kwargs)
        return {"id": project.id, "code": project.code, "name": project.name}

    async def get_company_stats(self, company_id: str) -> dict:
        total = await self.client_repo.count_by_company(company_id)
        return {"total_clients": total}

    async def bulk_import_clients(self, company_id: str, clients_data: list[dict]) -> dict:
        created_count = 0
        skipped_count = 0
        errors = []

        for idx, data in enumerate(clients_data):
            name = str(data.get("name", "")).strip()
            nit = str(data.get("nit", "")).strip()

            if not name:
                errors.append(f"Fila {idx + 1}: El nombre del cliente es obligatorio")
                skipped_count += 1
                continue

            try:
                lat = float(data["latitude"]) if data.get("latitude") and str(data["latitude"]).strip() else None
                lon = float(data["longitude"]) if data.get("longitude") and str(data["longitude"]).strip() else None
                geo_r = float(data["geofence_radius"]) if data.get("geofence_radius") and str(data["geofence_radius"]).strip() else 100.0
            except Exception:
                lat, lon, geo_r = None, None, 100.0

            try:
                client_dict = {
                    "company_id": company_id or "dla-company-main",
                    "name": name,
                    "nit": nit or f"NIT-{idx+1}",
                    "trade_name": str(data.get("trade_name", "")).strip() or name,
                    "client_type": str(data.get("client_type", "enterprise")).strip(),
                    "email": str(data.get("email", "")).strip() or None,
                    "phone": str(data.get("phone", "")).strip() or None,
                    "mobile": str(data.get("mobile", "")).strip() or None,
                    "address": str(data.get("address", "")).strip() or "Dirección Principal",
                    "department": str(data.get("department", "Quindío")).strip(),
                    "city": str(data.get("city", "Armenia")).strip(),
                    "notes": str(data.get("notes", "")).strip() or None,
                    "latitude": lat,
                    "longitude": lon,
                    "geofence_radius": geo_r,
                    "status": "active",
                }
                await self.client_repo.create(**client_dict)
                created_count += 1
            except Exception as e:
                skipped_count += 1
                errors.append(f"Fila {idx + 1} ({name}): Error de guardado: {str(e)}")

        return {
            "created_count": created_count,
            "skipped_count": skipped_count,
            "total_processed": len(clients_data),
            "errors": errors,
        }
