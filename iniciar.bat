@echo off
chcp 65001 >nul
echo ========================================
echo   BioGuard - Iniciando aplicacion
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Usuario:  admin@bioguard.local
echo Clave:    admin123
echo.

if not exist server\node_modules (
  echo Primera ejecucion detectada. Ejecutando instalacion...
  call instalar.bat
)

if not exist server\.env (
  echo Configuracion del servidor no encontrada. Ejecutando instalacion...
  call instalar.bat
)

call npm run dev
