import asyncio
from app.shared.database.session import AsyncSessionLocal
from app.shared.database.models_base import User
from app.modules.mobile.presentation.routes import get_my_payroll_summary
from fastapi import Request

class MockUser:
    def __init__(self, user_id, username):
        self.id = user_id
        self.username = username

async def main():
    async with AsyncSessionLocal() as db:
        user = MockUser("mock-id", "EMP-1001")
        res = await get_my_payroll_summary(user, db)
        print(res["latest_record"]["bank_name"])
        print(res["latest_record"]["bank_account_number"])

asyncio.run(main())
