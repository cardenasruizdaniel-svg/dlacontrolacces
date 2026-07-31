import asyncio
import httpx


async def test():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8888") as c:
        # Login
        r = await c.post("/api/v1/auth/login", json={"email": "admin@dlaredes.com.co", "password": "Dlaredes2026*"})
        assert r.status_code == 200, f"Login failed: {r.status_code}"
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        print("[OK] Login")

        me = await c.get("/api/v1/auth/me", headers=h)
        cid = me.json()["company_id"]
        print(f"[OK] Company: {cid}")

        # Get employee
        er = await c.get(f"/api/v1/employees?company_id={cid}&page_size=1", headers=h)
        assert er.status_code == 200
        eid = er.json()["items"][0]["id"]
        print(f"[OK] Employee: {eid}")

        # Test personas endpoint (was patients)
        pr = await c.get(f"/api/v1/clients?company_id={cid}&page_size=1", headers=h)
        client_id = pr.json()["items"][0]["id"]
        pers = await c.get(f"/api/v1/clients/{client_id}/personas?page_size=10", headers=h)
        print(f"[OK] Personas endpoint: {pers.json()['total']} personas")

        # Create persona
        new_pers = await c.post(f"/api/v1/clients/{client_id}/personas", json={
            "document_type": "CC", "document_number": "1234567890",
            "first_name": "Test", "last_name": "Persona",
        }, headers=h)
        assert new_pers.status_code == 201, f"Create persona failed: {new_pers.status_code} {new_pers.text}"
        persona_id = new_pers.json()["id"]
        print(f"[OK] Created persona: {persona_id}")

        # Create series
        sr = await c.post("/api/v1/scheduling/series", json={
            "company_id": cid, "name": "Turno Semanal L-V",
            "employee_id": eid, "client_id": client_id, "persona_id": persona_id,
            "recurrence_type": "weekly", "recurrence_days": "1,2,3,4,5",
            "start_date": "2026-08-03", "end_date": "2026-08-31",
            "default_start_time": "08:00", "default_end_time": "17:00",
            "default_break_minutes": 60, "default_priority": "normal",
            "color": "#3b82f6",
        }, headers=h)
        assert sr.status_code == 201, f"Create series failed: {sr.status_code} {sr.text}"
        sid = sr.json()["id"]
        print(f"[OK] Created series: {sid} - {sr.json()['name']}")

        # Generate series shifts
        gr = await c.post(f"/api/v1/scheduling/series/{sid}/generate", headers=h)
        assert gr.status_code == 200, f"Generate failed: {gr.status_code} {gr.text}"
        g = gr.json()
        print(f"[OK] Generated: {g['created']} shifts, skipped: {g.get('skipped', 0)}")

        # List series
        ls = await c.get(f"/api/v1/scheduling/series?company_id={cid}", headers=h)
        assert ls.status_code == 200
        print(f"[OK] Listed series: {ls.json()['total']} total")

        # Calendar check
        cal = await c.get(f"/api/v1/scheduling/calendar?company_id={cid}&start_date=2026-08-03&end_date=2026-08-07", headers=h)
        assert cal.status_code == 200
        print(f"[OK] Calendar: {len(cal.json())} events in first week of August")

        # Validate shift
        vr = await c.post(f"/api/v1/scheduling/validate-shift?employee_id={eid}&shift_date=2026-08-10&start_time=08:00&end_time=17:00&break_minutes=60", headers=h)
        print(f"[OK] Validate shift: valid={vr.json()['valid']}, conflicts={len(vr.json()['conflicts'])}, warnings={len(vr.json()['warnings'])}")

        # Conflict check (create shift first)
        await c.post("/api/v1/scheduling/bulk-save", json={
            "company_id": cid,
            "events": [{
                "employee_id": eid, "client_id": client_id, "persona_id": persona_id,
                "name": "Test Shift", "color": "#3b82f6", "shift_date": "2026-08-10",
                "start_time": "08:00", "end_time": "17:00", "break_minutes": 60, "priority": "normal",
            }]
        }, headers=h)
        # Now validate same time - should conflict
        vr2 = await c.post(f"/api/v1/scheduling/validate-shift?employee_id={eid}&shift_date=2026-08-10&start_time=08:00&end_time=17:00&break_minutes=60", headers=h)
        print(f"[OK] Conflict detection: valid={vr2.json()['valid']}, conflicts={len(vr2.json()['conflicts'])}")

        # Delete persona
        dp = await c.delete(f"/api/v1/clients/{client_id}/personas/{persona_id}", headers=h)
        assert dp.status_code == 200
        print(f"[OK] Deleted persona")

        # Delete series
        ds = await c.delete(f"/api/v1/scheduling/series/{sid}", headers=h)
        assert ds.status_code == 200
        print(f"[OK] Deleted series")

        print("\n=== ALL TESTS PASSED ===")


asyncio.run(test())
