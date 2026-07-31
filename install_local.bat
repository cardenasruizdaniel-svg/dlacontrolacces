@echo off
TITLE Instalador Local - DLA Access Enterprise PWA
color 0A
echo =======================================================================
echo          INSTALADOR AUTOMÁTICO - DLA ACCESS ENTERPRISE PWA
echo                Desarrollado para: DLA Redes y Seguridad
echo =======================================================================
echo.

cd /d "%~dp0"

echo [1/4] Verificando entorno de ejecución...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no está instalado o no se encuentra en el PATH.
    pause
    exit /b 1
)

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado o no se encuentra en el PATH.
    pause
    exit /b 1
)

echo [2/4] Instalando y preparando dependencias del Backend...
cd backend
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
python seed.py
cd ..

echo [3/4] Instalando dependencias y compilando la PWA Frontend...
cd frontend
call npm install
call npm run build
cd ..

echo.
echo =======================================================================
echo     ¡INSTALACIÓN LOCAL COMPLETADA EXITOSAMENTE!
echo =======================================================================
echo.
echo Credenciales por defecto creadas:
echo   - Correo: admin@dlaredes.com.co
echo   - Contraseña: Dlaredes2026*
echo.
echo Para iniciar la aplicación localmente, ejecuta:
echo   start_dla_enterprise_local.bat
echo.
pause
