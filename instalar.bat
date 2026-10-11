@echo off
chcp 65001 >nul
echo ========================================
echo   BioGuard - Instalacion
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado.
  echo Descargalo desde https://nodejs.org
  pause
  exit /b 1
)

echo [1/4] Instalando dependencias raiz...
call npm install
if errorlevel 1 goto error

echo [2/4] Instalando dependencias del servidor...
call npm install --prefix server
if errorlevel 1 goto error

echo [3/4] Instalando dependencias del cliente...
call npm install --prefix client
if errorlevel 1 goto error

if not exist server\.env (
  echo [4/4] Creando archivo .env...
  copy server\.env.example server\.env >nul
) else (
  echo [4/4] .env ya existe, omitiendo...
)

if not exist "%LOCALAPPDATA%\BioGuard" mkdir "%LOCALAPPDATA%\BioGuard"

echo.
echo Configurando PostgreSQL...
call docker compose up -d postgres
if errorlevel 1 goto error
call npm run db:deploy
if errorlevel 1 goto error
call npm run db:seed
if errorlevel 1 goto error

echo.
echo ========================================
echo   Instalacion completada
echo   Ejecuta iniciar.bat para abrir la app
echo ========================================
pause
exit /b 0

:error
echo.
echo ERROR durante la instalacion.
pause
exit /b 1
