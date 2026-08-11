from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
import asyncio
import logging
import time
from collections import defaultdict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import DLAException

# Import all models to configure SQLAlchemy mappers in correct order
import app.shared.database  # noqa: F401

from app.modules.auth.presentation.routes import router as auth_router
from app.modules.employees.presentation.routes import router as employees_router
from app.modules.contracts.presentation.routes import router as contracts_router, public_contracts_router
from app.modules.payroll.presentation.routes import router as payroll_router
from app.modules.clients.presentation.routes import router as clients_router
from app.modules.scheduling.presentation.routes import router as scheduling_router
from app.modules.geolocation.presentation.routes import router as geolocation_router
from app.modules.access_control.presentation.routes import router as access_control_router
from app.modules.dashboard.presentation.routes import router as dashboard_router
from app.modules.reports.presentation.routes import router as reports_router
from app.modules.ai_assistant.presentation.routes import router as ai_router
from app.modules.mobile.presentation.routes import router as mobile_router
from app.modules.iam.presentation.routes import router as iam_router
from app.modules.notifications.presentation.routes import router as notifications_router
from app.modules.facial_recognition.presentation.routes import router as facial_router
from app.modules.catalogs.routes import router as catalogs_router
from app.modules.system_config.routes import router as system_config_router
from app.modules.attendance.routes import router as attendance_router

logger = logging.getLogger(__name__)


# ── Rate Limiter ────────────────────────────────────────────────────────────
class RateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    def is_rate_limited(self, key: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]
        if len(self.requests[key]) >= self.max_requests:
            return True
        self.requests[key].append(now)
        return False

login_limiter = RateLimiter(max_requests=10, window_seconds=60)


async def auto_close_background_task():
    while True:
        try:
            from app.core.database import async_session_factory
            async with async_session_factory() as db:
                from app.modules.mobile.presentation.routes import auto_close_shifts
                closed = await auto_close_shifts(db)
                if closed > 0:
                    logger.info(f"Auto-closed {closed} expired shifts")
        except Exception as e:
            logger.error(f"Auto-close error: {e}")
        await asyncio.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    try:
        from app.core.database import engine, Base
        import app.shared.database.models_auth  # load models
        import app.shared.database.models_hr    # load models
        import app.modules.system_config.models # load system_config model
        import app.modules.attendance.models    # load attendance model
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"DB table creation error: {e}")

    try:
        from seed import seed
        logger.info("Running DB seed check...")
        await seed()
        logger.info("DB seed completed successfully.")
    except Exception as e:
        logger.error(f"DB seed error: {e}")

    task = asyncio.create_task(auto_close_background_task())
    yield
    task.cancel()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=f"{settings.APP_DESCRIPTION} - {settings.APP_AUTHOR}",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Security Headers Middleware ──────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; "
            "style-src 'self' 'unsafe-inline' https:; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https: wss:;"
        )
    return response


@app.exception_handler(DLAException)
async def dla_exception_handler(request: Request, exc: DLAException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": True},
    )


from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404 and not request.url.path.startswith("/api"):
        import os
        static_dir = os.path.join(os.path.dirname(__file__), "static")
        path = request.url.path.strip("/")

        # Next.js static export: try route.html, route/index.html, then index.html
        candidates = [
            os.path.join(static_dir, path + ".html"),
            os.path.join(static_dir, path, "index.html"),
            os.path.join(static_dir, "index.html"),
        ]
        for candidate in candidates:
            if os.path.exists(candidate):
                return FileResponse(candidate)

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": True},
    )


from fastapi.responses import HTMLResponse, JSONResponse, FileResponse

@app.get("/", tags=["Health"])
async def root(request: Request):
    import os
    static_index = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(static_index):
        return FileResponse(static_index)

    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        html_content = """
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DLA Access Enterprise - Portal Cloud</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
                body { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
                .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
            </style>
        </head>
        <div class="min-h-screen flex flex-col items-center justify-center p-6">
            <div class="glass max-w-2xl w-full p-8 rounded-2xl shadow-2xl text-center space-y-6">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 mb-2">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                </div>
                <h1 class="text-3xl font-bold tracking-tight text-white">DLA Access Enterprise API</h1>
                <p class="text-slate-400 text-sm">Desarrollado por <span class="text-blue-400 font-semibold">DLA Redes y Seguridad</span> | Estado: <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">● En Línea (Live)</span></p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-4">
                    <a href="/docs" class="block p-4 rounded-xl glass hover:bg-slate-800/80 transition-all border border-blue-500/30">
                        <div class="font-semibold text-blue-400 text-lg mb-1">⚡ Documentación Swagger</div>
                        <div class="text-slate-400 text-xs">Prueba interactivamente todas las rutas de la API, logins y operaciones.</div>
                    </a>
                    <a href="/redoc" class="block p-4 rounded-xl glass hover:bg-slate-800/80 transition-all border border-purple-500/30">
                        <div class="font-semibold text-purple-400 text-lg mb-1">📚 Especificación ReDoc</div>
                        <div class="text-slate-400 text-xs">Esquemas detallados y referencia técnica completa.</div>
                    </a>
                </div>

                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-xs space-y-2">
                    <div class="font-semibold text-slate-300">💡 Información del Entorno:</div>
                    <div class="grid grid-cols-2 gap-2 text-slate-400">
                        <div>Versión: <span class="text-slate-200">1.0.0</span></div>
                        <div>Entorno: <span class="text-slate-200">production</span></div>
                        <div>Plataforma API: <span class="text-slate-200">FastAPI / Python 3.11</span></div>
                        <div>Base de Datos: <span class="text-slate-200">PostgreSQL (Live)</span></div>
                    </div>
                </div>
            </div>
        </div>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=200)

    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "author": settings.APP_AUTHOR,
        "status": "running",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    return {"status": "healthy", "version": settings.APP_VERSION}


app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(employees_router, prefix=settings.API_V1_PREFIX)
app.include_router(contracts_router, prefix=settings.API_V1_PREFIX)
app.include_router(public_contracts_router, prefix=settings.API_V1_PREFIX)
app.include_router(payroll_router, prefix=settings.API_V1_PREFIX)
app.include_router(clients_router, prefix=settings.API_V1_PREFIX)
app.include_router(scheduling_router, prefix=settings.API_V1_PREFIX)
app.include_router(geolocation_router, prefix=settings.API_V1_PREFIX)
app.include_router(access_control_router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)
app.include_router(reports_router, prefix=settings.API_V1_PREFIX)
app.include_router(ai_router, prefix=settings.API_V1_PREFIX)
app.include_router(mobile_router, prefix=settings.API_V1_PREFIX)
app.include_router(iam_router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications_router, prefix=settings.API_V1_PREFIX)
app.include_router(facial_router, prefix=settings.API_V1_PREFIX)
app.include_router(catalogs_router, prefix=settings.API_V1_PREFIX)
app.include_router(system_config_router, prefix=settings.API_V1_PREFIX)
app.include_router(attendance_router, prefix=settings.API_V1_PREFIX)


@app.get(f"{settings.API_V1_PREFIX}/company", tags=["Company Compatibility"])
async def get_company_compatibility():
    return {
        "id": "30de4f4f-e13f-474f-a026-28d990ab523b",
        "name": "DLA Redes y Seguridad S.A.S.",
        "nit": "901234567-8",
        "city": "Bogotá",
        "address": "Calle Principal # 45-67",
        "phone": "+57 601 555 0199",
        "email": "contacto@dlaredes.com.co",
        "is_active": True,
    }


@app.get(f"{settings.API_V1_PREFIX}/geo/departments", tags=["Geo Compatibility"])
async def get_geo_departments():
    from app.modules.catalogs.colombia_data import COLOMBIAN_DEPARTMENTS
    return list(COLOMBIAN_DEPARTMENTS)


import os as _os
_static_dir = _os.path.join(_os.path.dirname(__file__), "static")

# Mount _next/static and other public asset directories directly (these always have exact paths)
if _os.path.exists(_os.path.join(_static_dir, "_next")):
    app.mount("/_next", StaticFiles(directory=_os.path.join(_static_dir, "_next")), name="next_static")

# Catch-all route: resolves every Next.js static export route correctly
# Next.js generates: mobile.html, dashboard.html, login.html, etc.
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    """
    SPA Catch-all — resolves Next.js static export routes:
    /mobile       -> static/mobile.html
    /dashboard    -> static/dashboard.html
    /              -> static/index.html
    /icon.svg     -> static/icon.svg (asset)
    """
    from fastapi.responses import FileResponse, Response

    # 1. Try exact file match (assets like /manifest.json, /sw.js, /icons/icon-192.svg)
    exact = _os.path.join(_static_dir, full_path)
    if _os.path.isfile(exact):
        return FileResponse(exact)

    # 2. Try Next.js route HTML (e.g. /mobile -> mobile.html)
    route_html = _os.path.join(_static_dir, full_path.strip("/") + ".html")
    if _os.path.isfile(route_html):
        return FileResponse(route_html, media_type="text/html")

    # 3. Try index.html inside route folder (e.g. /mobile/index.html)
    route_index = _os.path.join(_static_dir, full_path.strip("/"), "index.html")
    if _os.path.isfile(route_index):
        return FileResponse(route_index, media_type="text/html")

    # 4. Final fallback: serve the root index.html (SPA entry point)
    index = _os.path.join(_static_dir, "index.html")
    if _os.path.isfile(index):
        return FileResponse(index, media_type="text/html")

    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=404, content={"detail": "Not found"})
