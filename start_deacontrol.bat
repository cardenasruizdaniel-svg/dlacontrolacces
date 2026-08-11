@echo off
title DEAControl ERP - Servidor Local
echo ========================================================
echo        INICIANDO DEACONTROL EN MODO LOCAL
echo ========================================================
echo.

:: Comprobar si Docker esta corriendo
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no esta en ejecucion.
    echo Por favor, abra "Docker Desktop" y espere a que inicie correctamente.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker en ejecucion. Levantando contenedores...
echo.

docker compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Ocurrio un problema al iniciar los contenedores de Docker.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo        DEACONTROL INICIADO CORRECTAMENTE
echo ========================================================
echo.
echo La aplicacion web (ERP) y la PWA estan disponibles en:
echo http://localhost:3000
echo.
echo La API del backend (Documentacion) esta disponible en:
echo http://localhost:8000/docs
echo.
echo Puede minimizar esta ventana. Para apagar el sistema,
echo escriba "docker compose down" en una terminal o apague
echo los contenedores desde Docker Desktop.
echo.
pause
