@echo off
echo 🔍 Ejecutando pruebas de Supabase...

REM Cambiar al directorio del proyecto
cd /d "%~dp0.."

REM Verificar que estamos en el directorio correcto
echo 📁 Directorio actual: %CD%

REM Verificar que existe el archivo de pruebas
if exist "scripts\test_supabase_connection.ts" (
    echo ✅ Archivo de pruebas encontrado
) else (
    echo ❌ Archivo de pruebas no encontrado
    pause
    exit /b 1
)

REM Verificar que existe el archivo .env.local
if exist ".env.local" (
    echo ✅ Archivo .env.local encontrado
) else (
    echo ⚠️  Archivo .env.local no encontrado
    echo Necesitas configurar las variables de entorno en .env.local
)

REM Ejecutar las pruebas
echo 🚀 Ejecutando pruebas...
npx tsx scripts/test_supabase_connection.ts

pause 