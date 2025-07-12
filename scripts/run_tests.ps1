# Script para ejecutar pruebas de Supabase en Windows
Write-Host "🔍 Ejecutando pruebas de Supabase..." -ForegroundColor Green

# Cambiar al directorio del proyecto
Set-Location -Path $PSScriptRoot\..

# Verificar que estamos en el directorio correcto
Write-Host "📁 Directorio actual: $(Get-Location)" -ForegroundColor Yellow

# Verificar que existe el archivo de pruebas
if (Test-Path "scripts/test_supabase_connection.ts") {
    Write-Host "✅ Archivo de pruebas encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Archivo de pruebas no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar que existe el archivo .env.local
if (Test-Path ".env.local") {
    Write-Host "✅ Archivo .env.local encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  Archivo .env.local no encontrado. Creando ejemplo..." -ForegroundColor Yellow
    Write-Host "Necesitas configurar las variables de entorno en .env.local" -ForegroundColor Red
}

# Ejecutar las pruebas
Write-Host "🚀 Ejecutando pruebas..." -ForegroundColor Blue
npx tsx scripts/test_supabase_connection.ts 