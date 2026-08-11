@echo off
title Instalador Local DEAControl
echo ========================================================
echo        INSTALADOR LOCAL - DEAControl ERP
echo ========================================================
echo.

:: Comprobar si Docker esta instalado
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no esta instalado en este sistema.
    echo Por favor, instale Docker Desktop para Windows antes de continuar.
    echo Puede descargarlo desde: https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

echo [OK] Docker detectado.
echo.

echo Configurando archivo de entorno .env ...
if not exist .env (
    copy .env.example .env >nul 2>&1
    if %errorlevel% neq 0 (
        echo [INFO] No se encontro .env.example. Creando archivo .env por defecto...
        echo COMPOSE_PROJECT_NAME=deacontrol > .env
        echo NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 >> .env
        echo DATABASE_URL=postgresql://user:password@db:5432/deacontrol >> .env
    )
    echo [OK] Archivo .env creado.
) else (
    echo [OK] El archivo .env ya existe. No se sobreescribira.
)

echo.
echo ========================================================
echo INSTALACION COMPLETADA
echo ========================================================
echo Para encender el sistema, haga doble clic en "start_deacontrol.bat"
echo.
pause
