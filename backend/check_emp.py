import asyncio
from sqlalchemy import select
from app.core.database import async_session_factory
from app.shared.database.models_hr import Employee

async def check():
    async with async_session_factory() as session:
        res = await session.execute(select(Employee))
        emps = res.scalars().all()
        for e in emps:
            photo_len = len(e.photo_url) if e.photo_url else 0
            face_enc = bool(e.facial_encoding) if hasattr(e, 'facial_encoding') else 'N/A'
            print(f"ID: {e.id}, Name: {e.first_name} {e.last_name}, PhotoURL len: {photo_len}, FaceEncoded: {face_enc}, photo_url[:80]: {(e.photo_url or '')[:80]}")

asyncio.run(check())
