@echo off
REM Arrancando Portal Consejos Escolares - Windows
REM ============================================================================
REM Uso: .\arrancar.bat


setlocal enabledelayedexpansion

REM Color inicial
color 0A

cls
echo.
echo ============================================================================
echo  Portal Consejos Escolares - Startup Windows
echo ============================================================================
echo.

REM Verificar Docker
echo [1/6] Verificando Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Docker no esta instalado o no esta en PATH
    echo.
    echo Descarga Docker Desktop desde: https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)
echo [✓] Docker disponible
echo.

REM Verificar Docker Compose
echo [2/6] Verificando Docker Compose...
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Docker Compose no esta disponible
    echo.
    pause
    exit /b 1
)
echo [✓] Docker Compose disponible
echo.

REM Copiar .env.docker a .env.local si no existe
echo [3/6] Verificando variables de entorno...
if not exist ".env.local" (
    echo   .env.local no existe, creando desde .env.docker...
    if exist ".env.docker" (
        copy .env.docker .env.local >nul
        echo [✓] .env.local creado
    ) else (
        color 0C
        echo ERROR: No se encontro .env.docker
        echo.
        pause
        exit /b 1
    )
) else (
    echo [✓] .env.local ya existe
)
echo.

REM Verificar que .env.local tiene valores
echo [4/6] Validando configuracion de Supabase...
for /f "tokens=2 delims==" %%A in ('findstr /C:"NEXT_PUBLIC_SUPABASE_URL" .env.local') do set SUPABASE_URL=%%A
if "!SUPABASE_URL!"=="" (
    color 0C
    echo.
    echo ERROR: NEXT_PUBLIC_SUPABASE_URL no configurado en .env.local
    echo.
    echo Por favor edita .env.local y agrega:
    echo   NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co
    echo   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
    echo.
    echo Editando .env.local...
    timeout /t 2 >nul
    notepad .env.local
    pause
    exit /b 1
)
echo [✓] Configuracion valida
echo.

REM Build
echo [5/6] Construyendo imagen Docker (esto puede tomar 2-3 minutos la primera vez)...
docker-compose build --no-cache
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Fallo el build
    echo.
    pause
    exit /b 1
)
echo [✓] Imagen construida exitosamente
echo.

REM Up
echo [6/6] Levantando contenedor...
echo.
echo Presiona CTRL + C para detener los contenedores
echo.
echo ============================================================================
echo.
docker-compose up
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Fallo al levantar el contenedor
    echo.
    docker-compose logs
    pause
    exit /b 1
)
echo.
color 0B
echo ============================================================================
echo  EXITO! Portal Consejos Escolares esta listo
echo ============================================================================
echo.
echo URL: http://localhost:9901
echo.
echo Comandos utiles:
echo   docker-compose logs -f        : Ver logs en tiempo real
echo   docker-compose down           : Detener contenedor
echo   docker-compose ps             : Ver estado
echo.
echo Presiona ENTER para abrir http://localhost:9901 en el navegador
echo.
pause

REM Intentar abrir navegador
start http://localhost:9901

echo.
echo Contenedor ejecutandose en background.
echo Para ver logs: docker-compose logs -f
echo De nuevo a color normal...
color 07

exit /b 0
