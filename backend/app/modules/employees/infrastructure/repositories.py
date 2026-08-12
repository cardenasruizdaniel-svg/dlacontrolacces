from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database.models_hr import Employee, EmployeeDocument


class EmployeeRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, employee_id: str) -> Employee | None:
        result = await self.db.execute(
            select(Employee).where(Employee.id == employee_id, Employee.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def get_by_document(self, document_number: str) -> Employee | None:
        result = await self.db.execute(
            select(Employee).where(Employee.document_number == document_number, Employee.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str) -> Employee | None:
        result = await self.db.execute(
            select(Employee).where(Employee.code == code, Employee.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Employee | None:
        if not username:
            return None
        clean = username.strip().lower()
        result = await self.db.execute(
            select(Employee).where(func.lower(Employee.username) == clean, Employee.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> Employee:
        employee = Employee(**kwargs)
        self.db.add(employee)
        await self.db.flush()
        return employee

    async def update(self, employee_id: str, **kwargs: dict) -> Employee | None:
        await self.db.execute(
            update(Employee).where(Employee.id == employee_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(employee_id)

    async def list_employees(
        self,
        company_id: str | None = None,
        department_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 25,
    ) -> tuple[list[Employee], int]:
        query = select(Employee).where(Employee.is_deleted == False)
        count_query = select(func.count(Employee.id)).where(Employee.is_deleted == False)

        if company_id:
            query = query.where(Employee.company_id == company_id)
            count_query = count_query.where(Employee.company_id == company_id)
        if department_id:
            query = query.where(Employee.department_id == department_id)
            count_query = count_query.where(Employee.department_id == department_id)
        if status:
            query = query.where(Employee.status == status)
            count_query = count_query.where(Employee.status == status)
        if search:
            search_filter = (
                Employee.first_name.ilike(f"%{search}%")
                | Employee.last_name.ilike(f"%{search}%")
                | Employee.document_number.ilike(f"%{search}%")
                | Employee.code.ilike(f"%{search}%")
                | Employee.email.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.offset(skip).limit(limit).order_by(Employee.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def count_by_company(self, company_id: str) -> int:
        result = await self.db.execute(
            select(func.count(Employee.id)).where(
                Employee.company_id == company_id, Employee.is_deleted == False
            )
        )
        return result.scalar() or 0

    async def count_by_status(self, company_id: str, status: str) -> int:
        result = await self.db.execute(
            select(func.count(Employee.id)).where(
                Employee.company_id == company_id,
                Employee.status == status,
                Employee.is_deleted == False,
            )
        )
        return result.scalar() or 0


class EmployeeDocumentRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_employee(self, employee_id: str) -> list[EmployeeDocument]:
        result = await self.db.execute(
            select(EmployeeDocument).where(
                EmployeeDocument.employee_id == employee_id,
                EmployeeDocument.is_deleted == False,
            )
        )
        return list(result.scalars().all())

    async def create(self, **kwargs: dict) -> EmployeeDocument:
        doc = EmployeeDocument(**kwargs)
        self.db.add(doc)
        await self.db.flush()
        return doc

    async def delete(self, doc_id: str) -> None:
        await self.db.execute(
            update(EmployeeDocument)
            .where(EmployeeDocument.id == doc_id)
            .values(is_deleted=True)
        )
