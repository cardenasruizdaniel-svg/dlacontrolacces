@echo off
TITLE DLA Access Enterprise - Servidor Local
color 0B
echo =======================================================================
echo         INICIANDO DLA ACCESS ENTERPRISE PWA (SERVIDOR LOCAL)
echo =======================================================================
echo.

cd /d "%~dp0"

echo Arrancando Servidor Backend FastAPI en puerto 8000...
start "Backend DLA Access (Puerto 8000)" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo Arrancando Servidor Frontend PWA Next.js en puerto 3000...
start "Frontend PWA (Puerto 3000)" cmd /k "cd frontend && npm run dev"

echo.
echo =======================================================================
echo Servidores en ejecución:
echo   - Web ERP & PWA Móvil: http://localhost:3000
echo   - API Backend REST:    http://localhost:8000/docs
echo =======================================================================
echo.
pause
