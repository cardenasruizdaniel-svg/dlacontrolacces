import re
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.shared.database.models_hr import Employee, EmployeeDocument


class EmployeeRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, employee_id: str) -> Employee | None:
        result = await self.db.execute(
            select(Employee).options(selectinload(Employee.branch)).where(Employee.id == employee_id, Employee.is_deleted == False)
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

    async def get_next_code(self) -> str:
        """Compute the next sequential EMP-XXX code.

        Scans all existing codes that match the pattern EMP-<digits>,
        takes the highest number found, and returns EMP-<max+1> with
        at least 3 zero-padded digits (EMP-001, EMP-002 … EMP-999, EMP-1000…).
        """
        result = await self.db.execute(
            select(Employee.code).where(Employee.is_deleted == False)
        )
        codes = result.scalars().all()
        max_num = 0
        pattern = re.compile(r'^EMP-(\d+)$', re.IGNORECASE)
        for code in codes:
            if code:
                m = pattern.match(str(code).strip())
                if m:
                    num = int(m.group(1))
                    if num > max_num:
                        max_num = num
        next_num = max_num + 1
        # Zero-pad to at least 3 digits
        return f"EMP-{next_num:03d}"

    async def resequence_all_codes(self) -> int:
        """Renumber ALL non-deleted employees in creation order.

        Assigns EMP-001, EMP-002, … preserving chronological order
        (oldest employee = EMP-001).  Returns the count of employees updated.
        """
        result = await self.db.execute(
            select(Employee)
            .where(Employee.is_deleted == False)
            .order_by(Employee.created_at.asc(), Employee.id.asc())
        )
        employees = list(result.scalars().all())
        for idx, emp in enumerate(employees, start=1):
            new_code = f"EMP-{idx:03d}"
            await self.db.execute(
                update(Employee).where(Employee.id == emp.id).values(code=new_code)
            )
        await self.db.flush()
        return len(employees)

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
        if search and search.strip():
            clean_search = search.strip()
            terms = clean_search.split()
            for term in terms:
                search_filter = (
                    Employee.first_name.ilike(f"%{term}%")
                    | Employee.last_name.ilike(f"%{term}%")
                    | Employee.middle_name.ilike(f"%{term}%")
                    | Employee.second_last_name.ilike(f"%{term}%")
                    | Employee.document_number.ilike(f"%{term}%")
                    | Employee.code.ilike(f"%{term}%")
                    | Employee.email.ilike(f"%{term}%")
                    | Employee.phone.ilike(f"%{term}%")
                    | Employee.mobile.ilike(f"%{term}%")
                    | Employee.job_position.ilike(f"%{term}%")
                    | Employee.username.ilike(f"%{term}%")
                    | Employee.city.ilike(f"%{term}%")
                    | Employee.address.ilike(f"%{term}%")
                )
                query = query.where(search_filter)
                count_query = count_query.where(search_filter)

        query = query.options(selectinload(Employee.branch)).order_by(
            func.lower(Employee.first_name).asc(),
            func.lower(Employee.last_name).asc()
        ).offset(skip).limit(limit)

        import asyncio
        total_result, items_result = await asyncio.gather(
            self.db.execute(count_query),
            self.db.execute(query),
        )
        total = total_result.scalar() or 0
        return list(items_result.scalars().all()), total

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
