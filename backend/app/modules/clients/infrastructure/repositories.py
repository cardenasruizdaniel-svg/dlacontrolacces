from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database.models_clients import Client, ClientContact, ClientLocation, Patient, Project


class ClientRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, client_id: str) -> Client | None:
        result = await self.db.execute(select(Client).where(Client.id == client_id, Client.is_deleted == False))
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> Client:
        client = Client(**kwargs)
        self.db.add(client)
        await self.db.flush()
        return client

    async def update(self, client_id: str, **kwargs: dict) -> Client | None:
        await self.db.execute(update(Client).where(Client.id == client_id).values(**kwargs))
        await self.db.flush()
        return await self.get_by_id(client_id)

    async def soft_delete(self, client_id: str) -> None:
        await self.db.execute(
            update(Client).where(Client.id == client_id).values(
                is_deleted=True, deleted_at=datetime.now(timezone.utc)
            )
        )
        await self.db.flush()

    async def list_clients(
        self, company_id: str | None = None, client_type: str | None = None,
        status: str | None = None, search: str | None = None,
        skip: int = 0, limit: int = 25,
    ) -> tuple[list[Client], int]:
        query = select(Client).where(Client.is_deleted == False)
        count_q = select(func.count(Client.id)).where(Client.is_deleted == False)
        if company_id:
            if company_id == "dla-company-main":
                # For the demo main company placeholder, we can just return all active clients
                # or match any company_id. This ensures demo clients show up.
                comp_filter = (Client.company_id != None)
            else:
                comp_filter = (Client.company_id == company_id) | (Client.company_id == None) | (Client.company_id == "dla-company-main")
            
            query = query.where(comp_filter)
            count_q = count_q.where(comp_filter)
        if client_type:
            query = query.where(Client.client_type == client_type)
            count_q = count_q.where(Client.client_type == client_type)
        if status:
            query = query.where(Client.status == status)
            count_q = count_q.where(Client.status == status)
        if search and search.strip():
            clean_search = search.strip()

            full_client_name = func.concat(
                Client.name, " ", func.coalesce(Client.trade_name, "")
            )

            phrase_filter = (
                full_client_name.ilike(f"%{clean_search}%")
                | Client.name.ilike(f"%{clean_search}%")
                | Client.trade_name.ilike(f"%{clean_search}%")
                | Client.nit.ilike(f"%{clean_search}%")
                | Client.email.ilike(f"%{clean_search}%")
                | Client.phone.ilike(f"%{clean_search}%")
                | Client.mobile.ilike(f"%{clean_search}%")
                | Client.city.ilike(f"%{clean_search}%")
                | Client.department.ilike(f"%{clean_search}%")
                | Client.address.ilike(f"%{clean_search}%")
                | Client.notes.ilike(f"%{clean_search}%")
            )

            terms = clean_search.split()
            term_filters = []
            for term in terms:
                tf = (
                    Client.name.ilike(f"%{term}%")
                    | Client.trade_name.ilike(f"%{term}%")
                    | Client.nit.ilike(f"%{term}%")
                    | Client.email.ilike(f"%{term}%")
                    | Client.phone.ilike(f"%{term}%")
                    | Client.mobile.ilike(f"%{term}%")
                    | Client.city.ilike(f"%{term}%")
                    | Client.department.ilike(f"%{term}%")
                    | Client.address.ilike(f"%{term}%")
                    | Client.notes.ilike(f"%{term}%")
                )
                term_filters.append(tf)

            from sqlalchemy import and_
            combined_search = phrase_filter | and_(*term_filters)
            query = query.where(combined_search)
            count_q = count_q.where(combined_search)

        total = (await self.db.execute(count_q)).scalar() or 0
        query = query.order_by(func.lower(Client.name).asc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def count_by_company(self, company_id: str) -> int:
        r = await self.db.execute(select(func.count(Client.id)).where(Client.company_id == company_id, Client.is_deleted == False))
        return r.scalar() or 0


class PatientRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, patient_id: str) -> Patient | None:
        result = await self.db.execute(select(Patient).where(Patient.id == patient_id, Patient.is_deleted == False))
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> Patient:
        patient = Patient(**kwargs)
        self.db.add(patient)
        await self.db.flush()
        return patient

    async def update(self, patient_id: str, **kwargs: dict) -> Patient | None:
        await self.db.execute(update(Patient).where(Patient.id == patient_id).values(**kwargs))
        await self.db.flush()
        return await self.get_by_id(patient_id)

    async def soft_delete(self, patient_id: str) -> None:
        await self.db.execute(
            update(Patient).where(Patient.id == patient_id).values(
                is_deleted=True, deleted_at=datetime.now(timezone.utc)
            )
        )
        await self.db.flush()

    async def list_by_client(self, client_id: str, search: str | None = None, skip: int = 0, limit: int = 25) -> tuple[list[Patient], int]:
        query = select(Patient).where(Patient.client_id == client_id, Patient.is_deleted == False)
        count_q = select(func.count(Patient.id)).where(Patient.client_id == client_id, Patient.is_deleted == False)
        if search and search.strip():
            clean_search = search.strip()
            full_name = func.concat(Patient.first_name, " ", Patient.last_name)
            phrase_filter = (
                full_name.ilike(f"%{clean_search}%")
                | Patient.first_name.ilike(f"%{clean_search}%")
                | Patient.last_name.ilike(f"%{clean_search}%")
                | Patient.document_number.ilike(f"%{clean_search}%")
            )
            terms = clean_search.split()
            term_filters = [
                (Patient.first_name.ilike(f"%{t}%") | Patient.last_name.ilike(f"%{t}%") | Patient.document_number.ilike(f"%{t}%"))
                for t in terms
            ]
            from sqlalchemy import and_
            f = phrase_filter | and_(*term_filters)
            query = query.where(f)
            count_q = count_q.where(f)
        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all()), total

    async def count_by_client(self, client_id: str) -> int:
        r = await self.db.execute(select(func.count(Patient.id)).where(Patient.client_id == client_id, Patient.is_deleted == False))
        return r.scalar() or 0


class ProjectRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, **kwargs: dict) -> Project:
        project = Project(**kwargs)
        self.db.add(project)
        await self.db.flush()
        return project

    async def list_by_client(self, client_id: str, skip: int = 0, limit: int = 25) -> tuple[list[Project], int]:
        query = select(Project).where(Project.client_id == client_id, Project.is_deleted == False)
        count_q = select(func.count(Project.id)).where(Project.client_id == client_id, Project.is_deleted == False)
        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all()), total


class ClientContactRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, contact_id: str) -> ClientContact | None:
        result = await self.db.execute(select(ClientContact).where(ClientContact.id == contact_id, ClientContact.is_deleted == False))
        return result.scalar_one_or_none()

    async def list_by_client(self, client_id: str) -> list[ClientContact]:
        result = await self.db.execute(select(ClientContact).where(ClientContact.client_id == client_id, ClientContact.is_deleted == False))
        return list(result.scalars().all())

    async def create(self, **kwargs: dict) -> ClientContact:
        contact = ClientContact(**kwargs)
        self.db.add(contact)
        await self.db.flush()
        return contact

    async def soft_delete(self, contact_id: str) -> None:
        await self.db.execute(
            update(ClientContact).where(ClientContact.id == contact_id).values(
                is_deleted=True, deleted_at=datetime.now(timezone.utc)
            )
        )
        await self.db.flush()


class ClientLocationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, location_id: str) -> ClientLocation | None:
        result = await self.db.execute(select(ClientLocation).where(ClientLocation.id == location_id, ClientLocation.is_deleted == False))
        return result.scalar_one_or_none()

    async def list_by_client(self, client_id: str, include_inactive: bool = False) -> list[ClientLocation]:
        query = select(ClientLocation).where(ClientLocation.client_id == client_id, ClientLocation.is_deleted == False)
        if not include_inactive:
            query = query.where(ClientLocation.is_active == True)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, **kwargs: dict) -> ClientLocation:
        loc = ClientLocation(**kwargs)
        self.db.add(loc)
        await self.db.flush()
        return loc

    async def soft_delete(self, location_id: str) -> None:
        await self.db.execute(
            update(ClientLocation).where(ClientLocation.id == location_id).values(
                is_deleted=True, deleted_at=datetime.now(timezone.utc)
            )
        )
        await self.db.flush()
