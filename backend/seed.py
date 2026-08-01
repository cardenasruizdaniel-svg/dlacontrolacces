"""Seed script: creates default company, roles, permissions, and admin user."""
import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.config import settings
from app.core.security import hash_password


# IAM MODULES AND ACTIONS
MODULES = [
    ("dashboard", "Dashboard"),
    ("employees", "Empleados"),
    ("clients", "Clientes"),
    ("contracts", "Contratos"),
    ("payroll", "Nómina"),
    ("scheduling", "Turnos"),
    ("geolocation", "Geolocalización"),
    ("access_control", "Control de Acceso"),
    ("facial_recognition", "Reconocimiento Facial"),
    ("notifications", "Notificaciones"),
    ("reports", "Reportes"),
    ("ai_assistant", "Asistente IA"),
    ("users", "Usuarios"),
    ("roles", "Roles"),
    ("permissions", "Permisos"),
    ("audit_logs", "Auditoría"),
    ("branches", "Sedes"),
    ("cost_centers", "Centros de Costo"),
    ("departments", "Departamentos"),
    ("dotaciones", "Dotaciones"),
]

ACTIONS = ["view", "create", "update", "delete", "export", "import", "approve", "manage"]

# Default roles with their permission sets
DEFAULT_ROLES = [
    {
        "name": "Super Admin",
        "display_name": "Super Administrador",
        "desc": "Acceso total al sistema",
        "level": 100,
        "color": "#DC2626",
        "icon": "shield",
        "all_permissions": True,
    },
    {
        "name": "Gerencia",
        "display_name": "Gerencia",
        "desc": "Acceso de lectura general + aprobaciones",
        "level": 80,
        "color": "#7C3AED",
        "icon": "briefcase",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view", "approve"]),
            ("clients", ["view"]),
            ("contracts", ["view", "approve"]),
            ("payroll", ["view", "approve"]),
            ("scheduling", ["view"]),
            ("reports", ["view", "export"]),
            ("users", ["view"]),
            ("branches", ["view"]),
            ("cost_centers", ["view"]),
            ("departments", ["view"]),
        ],
    },
    {
        "name": "Administración",
        "display_name": "Administración",
        "desc": "Gestión completa de operaciones administrativas",
        "level": 70,
        "color": "#2563EB",
        "icon": "cog",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view", "create", "update"]),
            ("clients", ["view", "create", "update"]),
            ("contracts", ["view", "create", "update"]),
            ("payroll", ["view", "create", "update"]),
            ("scheduling", ["view", "create", "update"]),
            ("geolocation", ["view"]),
            ("access_control", ["view"]),
            ("reports", ["view", "export"]),
            ("users", ["view", "create", "update"]),
            ("branches", ["view", "create", "update"]),
            ("cost_centers", ["view", "create", "update"]),
            ("departments", ["view", "create", "update"]),
            ("dotaciones", ["view", "create", "update"]),
            ("notifications", ["view", "create"]),
        ],
    },
    {
        "name": "Administrativo",
        "display_name": "Administrativo",
        "desc": "Gestión de datos administrativos y turnos",
        "level": 50,
        "color": "#0891B2",
        "icon": "clipboard",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view"]),
            ("clients", ["view", "create", "update"]),
            ("contracts", ["view"]),
            ("payroll", ["view"]),
            ("scheduling", ["view", "create", "update"]),
            ("reports", ["view"]),
            ("branches", ["view"]),
            ("cost_centers", ["view"]),
            ("departments", ["view"]),
            ("dotaciones", ["view", "create", "update"]),
        ],
    },
    {
        "name": "Médico",
        "display_name": "Médico",
        "desc": "Acceso a información médica y pacientes",
        "level": 45,
        "color": "#059669",
        "icon": "heart",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view"]),
            ("clients", ["view"]),
            ("access_control", ["view"]),
            ("reports", ["view"]),
        ],
    },
    {
        "name": "Enfermero",
        "display_name": "Enfermero",
        "desc": "Control de acceso y cuidado básico",
        "level": 40,
        "color": "#16A34A",
        "icon": "activity",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view"]),
            ("access_control", ["view", "manage"]),
            ("scheduling", ["view"]),
        ],
    },
    {
        "name": "Cuidador",
        "display_name": "Cuidador",
        "desc": "Acceso básico para cuidadores",
        "level": 30,
        "color": "#CA8A04",
        "icon": "user",
        "modules": [
            ("dashboard", ["view"]),
            ("access_control", ["view"]),
            ("scheduling", ["view"]),
        ],
    },
    {
        "name": "Supervisor",
        "display_name": "Supervisor",
        "desc": "Supervisión de operaciones y personal",
        "level": 60,
        "color": "#EA580C",
        "icon": "eye",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view"]),
            ("clients", ["view"]),
            ("contracts", ["view"]),
            ("scheduling", ["view", "create", "update"]),
            ("geolocation", ["view"]),
            ("access_control", ["view"]),
            ("reports", ["view", "export"]),
            ("dotaciones", ["view"]),
        ],
    },
    {
        "name": "Auditor",
        "display_name": "Auditor",
        "desc": "Solo lectura + acceso a auditoría y reportes",
        "level": 65,
        "color": "#9333EA",
        "icon": "search",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view"]),
            ("clients", ["view"]),
            ("contracts", ["view"]),
            ("payroll", ["view"]),
            ("scheduling", ["view"]),
            ("geolocation", ["view"]),
            ("access_control", ["view"]),
            ("reports", ["view", "export"]),
            ("audit_logs", ["view"]),
            ("users", ["view"]),
        ],
    },
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    from app.core.database import Base
    import app.shared.database  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, expire_on_commit=False)
    now = datetime.now(timezone.utc)

    async with Session() as db:
        company_id = str(uuid.uuid4())

        # 1. Company
        await db.execute(text("""
            INSERT INTO companies (id, nit, name, address, phone, email, country, timezone, is_active, is_deleted, created_at, updated_at)
            VALUES (:id, :nit, :name, :address, :phone, :email, 'CO', 'America/Bogota', true, false, :now, :now)
            ON CONFLICT (nit) DO NOTHING
        """), {
            "id": company_id, "nit": "900123456-7", "name": "DLA Redes y Seguridad S.A.S.",
            "address": "Cra 7 # 40-62, Bogotá", "phone": "+576011234567",
            "email": "admin@dlaredes.com.co", "now": now,
        })

        # Get or create company
        result = await db.execute(text("SELECT id FROM companies WHERE nit = :nit"), {"nit": "900123456-7"})
        row = result.fetchone()
        company_id = row[0] if row else company_id

        # 2. Permissions
        perm_ids = {}
        for mod_code, mod_name in MODULES:
            for action in ACTIONS:
                p_res = await db.execute(text("SELECT id FROM permissions WHERE module = :module AND action = :action"), {"module": mod_code, "action": action})
                row = p_res.fetchone()
                if not row:
                    perm_id = str(uuid.uuid4())
                    await db.execute(text("""
                        INSERT INTO permissions (id, module, action, display_name, description, is_active, is_deleted, created_at, updated_at)
                        VALUES (:id, :module, :action, :display, :desc, true, false, :now, :now)
                    """), {
                        "id": perm_id, "module": mod_code, "action": action,
                        "display": f"{mod_name}: {action}",
                        "desc": f"Permite {action} en {mod_name}",
                        "now": now,
                    })

        # Read back actual permission IDs
        result = await db.execute(text("SELECT id, module, action FROM permissions"))
        for row in result.fetchall():
            perm_ids[(row[1], row[2])] = row[0]

        # 3. Roles
        for role_def in DEFAULT_ROLES:
            r_res = await db.execute(text("SELECT id FROM roles WHERE name = :name"), {"name": role_def["name"]})
            r_row = r_res.fetchone()
            if not r_row:
                role_id = str(uuid.uuid4())
                await db.execute(text("""
                    INSERT INTO roles (id, name, display_name, description, is_active, is_system, level, color, icon, is_deleted, created_at, updated_at)
                    VALUES (:id, :name, :display, :desc, true, true, :level, :color, :icon, false, :now, :now)
                """), {
                    "id": role_id, "name": role_def["name"], "display": role_def["display_name"],
                    "desc": role_def["desc"], "level": role_def["level"],
                    "color": role_def["color"], "icon": role_def["icon"], "now": now,
                })

        # Read back actual role IDs
        result = await db.execute(text("SELECT id, name FROM roles"))
        role_ids = {row[1]: row[0] for row in result.fetchall()}

        # Assign permissions to roles
        for role_def in DEFAULT_ROLES:
            role_id = role_ids[role_def["name"]]
            if role_def.get("all_permissions"):
                for (mod_code, action), pid in perm_ids.items():
                    rp_res = await db.execute(text("SELECT id FROM role_permissions WHERE role_id = :rid AND permission_id = :pid"), {"rid": role_id, "pid": pid})
                    if not rp_res.fetchone():
                        await db.execute(text("""
                            INSERT INTO role_permissions (id, role_id, permission_id, is_deleted, created_at, updated_at)
                            VALUES (:id, :rid, :pid, false, :now, :now)
                        """), {"id": str(uuid.uuid4()), "rid": role_id, "pid": pid, "now": now})
            else:
                for mod_code, actions_list in role_def.get("modules", []):
                    for action in actions_list:
                        pid = perm_ids.get((mod_code, action))
                        if pid:
                            rp_res = await db.execute(text("SELECT id FROM role_permissions WHERE role_id = :rid AND permission_id = :pid"), {"rid": role_id, "pid": pid})
                            if not rp_res.fetchone():
                                await db.execute(text("""
                                    INSERT INTO role_permissions (id, role_id, permission_id, is_deleted, created_at, updated_at)
                                    VALUES (:id, :rid, :pid, false, :now, :now)
                                """), {"id": str(uuid.uuid4()), "rid": role_id, "pid": pid, "now": now})

        # 4. Admin user & employee
        admin_role_id = role_ids["Super Admin"]
        u_res = await db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": "admin@dlaredes.com.co"})
        u_row = u_res.fetchone()
        hashed = hash_password("Dlaredes2026*")

        from app.shared.database.models_auth import User
        from app.shared.database.models_hr import Employee

        if not u_row:
            user = User(
                id=str(uuid.uuid4()),
                email="admin@dlaredes.com.co",
                username="admin",
                hashed_password=hashed,
                full_name="Administrador DLA",
                role_id=admin_role_id,
                company_id=company_id,
                is_active=True,
                is_superuser=True,
                is_verified=True,
            )
            db.add(user)
        else:
            await db.execute(text("""
                UPDATE users SET hashed_password = :pwd, role_id = :role_id, is_active = true, failed_login_attempts = 0 WHERE email = :email
            """), {"pwd": hashed, "role_id": admin_role_id, "email": "admin@dlaredes.com.co"})

        e_res = await db.execute(text("SELECT id FROM employees WHERE email = :email"), {"email": "admin@dlaredes.com.co"})
        if not e_res.fetchone():
            emp = Employee(
                id=str(uuid.uuid4()),
                company_id=company_id,
                code="ADM-001",
                document_type="CC",
                document_number="12345678",
                first_name="Administrador",
                last_name="DLA",
                email="admin@dlaredes.com.co",
                username="admin",
                hashed_password=hashed,
                role_id=admin_role_id,
                platform_access="both",
                account_status="active",
                is_superuser=True,
                country="CO",
                status="active",
                force_password_change=False,
                first_login_completed=True,
                app_status="active",
            )
            db.add(emp)
        else:
            await db.execute(text("""
                UPDATE employees SET hashed_password = :pwd, role_id = :role_id, account_status = 'active', platform_access = 'both', failed_login_attempts = 0 WHERE email = :email
            """), {"pwd": hashed, "role_id": admin_role_id, "email": "admin@dlaredes.com.co"})

        # 5. Demo Operational Employees
        demo_employees = [
            {
                "code": "EMP-1001", "document_type": "CC", "document_number": "1020304050",
                "first_name": "Luz", "last_name": "Gaviria", "email": "luz.gaviria@dlaredes.com.co",
                "username": "luz.gaviria", "mobile": "3001234567", "address": "Calle 10 # 43A-25, Poblado, Medellín",
                "eps": "EPS Sura", "arl": "Positiva ARL", "afp": "Porvenir",
            },
            {
                "code": "EMP-1002", "document_type": "CC", "document_number": "1030405060",
                "first_name": "Carlos Alberto", "last_name": "Mendoza", "email": "carlos.mendoza@dlaredes.com.co",
                "username": "carlos.mendoza", "mobile": "3109876543", "address": "Carrera 43A # 14-20, Envigado",
                "eps": "Sanitas EPS", "arl": "ARL Sura", "afp": "Protección",
            },
            {
                "code": "EMP-1003", "document_type": "CC", "document_number": "1040506070",
                "first_name": "María Elena", "last_name": "Ruiz", "email": "maria.ruiz@dlaredes.com.co",
                "username": "maria.ruiz", "mobile": "3154567890", "address": "Calle 50 # 65-10, Laureles, Medellín",
                "eps": "Compensar EPS", "arl": "AXA Colpatria ARL", "afp": "Colfondos",
            },
        ]

        created_emp_ids = []
        for emp_def in demo_employees:
            e_res = await db.execute(text("SELECT id FROM employees WHERE document_number = :doc"), {"doc": emp_def["document_number"]})
            e_row = e_res.fetchone()
            emp_pwd = hash_password(emp_def["document_number"])
            if not e_row:
                emp_id = str(uuid.uuid4())
                emp = Employee(
                    id=emp_id, company_id=company_id, code=emp_def["code"], document_type=emp_def["document_type"],
                    document_number=emp_def["document_number"], first_name=emp_def["first_name"], last_name=emp_def["last_name"],
                    email=emp_def["email"], username=emp_def["username"], hashed_password=emp_pwd, mobile=emp_def["mobile"],
                    address=emp_def["address"], eps=emp_def["eps"], arl=emp_def["arl"], afp=emp_def["afp"],
                    platform_access="both", account_status="active", status="active", is_superuser=False,
                )
                db.add(emp)
                created_emp_ids.append(emp_id)
            else:
                created_emp_ids.append(e_row[0])

        await db.commit()

        # 6. Demo Patients / Personas
        from app.shared.database.models_access import Persona
        p_res = await db.execute(text("SELECT id FROM personas WHERE company_id = :cid"), {"cid": company_id})
        p_rows = p_res.fetchall()
        persona_id = p_rows[0][0] if p_rows else None
        if not persona_id:
            p_id = str(uuid.uuid4())
            persona = Persona(
                id=p_id, company_id=company_id, document_number="32541987",
                first_name="Don Pedro José", last_name="Gómez", full_name="Don Pedro José Gómez",
                address="Carrera 48 # 12-50, Envigado, Antioquia", city="Envigado",
            )
            db.add(persona)
            await db.commit()
            persona_id = p_id

        # 7. Demo Shifts covering all filters
        from app.shared.database.models_scheduling import Shift
        from datetime import timedelta
        s_res = await db.execute(text("SELECT count(*) FROM shifts WHERE company_id = :cid"), {"cid": company_id})
        shift_count = s_res.scalar() or 0

        if shift_count == 0 and created_emp_ids:
            cot_now = datetime.now(timezone.utc) - timedelta(hours=5)
            today_dt = cot_now.date()
            tomorrow_dt = today_dt + timedelta(days=1)
            emp_target = created_emp_ids[0]

            shifts_demo = [
                # 1. Hoy - Pendiente / Habilitada
                Shift(id=str(uuid.uuid4()), company_id=company_id, employee_id=emp_target, persona_id=persona_id, name="Visita Domiciliaria de Control & Terapia", color="#3b82f6", shift_date=today_dt, start_time="08:00", end_time="12:00", break_minutes=30, status="scheduled", observations="Paciente en recuperación. Realizar toma de signos vitales."),
                # 2. Hoy - Pendiente P.M.
                Shift(id=str(uuid.uuid4()), company_id=company_id, employee_id=emp_target, persona_id=persona_id, name="Atención Médica Domiciliaria P.M.", color="#10b981", shift_date=today_dt, start_time="13:00", end_time="17:00", break_minutes=60, status="scheduled", observations="Revisión de glucometría y aplicación de medicamentos."),
                # 3. Hoy - Completada
                Shift(id=str(uuid.uuid4()), company_id=company_id, employee_id=emp_target, persona_id=persona_id, name="Control Domiciliario Matutino", color="#059669", shift_date=today_dt, start_time="06:00", end_time="08:00", break_minutes=15, status="completed", observations="Visita ejecutada exitosamente a primera hora."),
                # 4. Hoy - Perdida
                Shift(id=str(uuid.uuid4()), company_id=company_id, employee_id=emp_target, persona_id=persona_id, name="Chequeo Temprano de Tensión", color="#dc2626", shift_date=today_dt, start_time="05:00", end_time="06:00", break_minutes=15, status="lost", observations="Paciente no respondió en horario programado."),
                # 5. Cancelada
                Shift(id=str(uuid.uuid4()), company_id=company_id, employee_id=emp_target, persona_id=persona_id, name="Evaluación Especial Cancelada", color="#6b7280", shift_date=today_dt, start_time="11:00", end_time="12:00", break_minutes=15, status="cancelled", observations="Cancelado a solicitud de la EPS."),
                # 6. Mañana - Programada
                Shift(id=str(uuid.uuid4()), company_id=company_id, employee_id=emp_target, persona_id=persona_id, name="Seguimiento Domiciliario Futuro", color="#8b5cf6", shift_date=tomorrow_dt, start_time="09:00", end_time="13:00", break_minutes=30, status="scheduled", observations="Valoración inicial de enfermería."),
            ]
            db.add_all(shifts_demo)
            await db.commit()

        await db.commit()
        print(f"Seed completado:")
        print(f"  Empresa:     {company_id}")
        print(f"  Empleados:   {len(demo_employees)} creados con credenciales de prueba")
        print(f"  Visitas:     Demostración cargada para todas las pestañas de filtro")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
