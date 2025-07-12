# Migración a Supabase - Instrucciones

## ✅ Cambios Realizados

### 1. Archivos Modificados
- **`lib/database.ts`**: Completamente reescrito para usar Supabase en lugar de Oracle
- **`package.json`**: Eliminadas dependencias de Oracle (`oracledb`, `@types/oracledb`) y MySQL (`better-sqlite3`, `@types/better-sqlite3`)
- **Scripts actualizados**: Los scripts de prueba ahora funcionan con Supabase

### 2. Archivos Eliminados
- `lib/database_mysql_backup.ts` - Backup de MySQL (ya no necesario)
- `scripts/migrate_mysql_to_oracle.ts` - Script de migración MySQL a Oracle
- `scripts/test_oracle_connection.ts` - Script de prueba Oracle
- `scripts/migrar_festivos.ts` - Script de migración de festivos Oracle
- `scripts/generar_y_migrar_festivos_colombia.ts` - Script de generación Oracle

### 3. Archivos Nuevos
- `.env.example` - Ejemplo de configuración de variables de entorno
- `scripts/setup_supabase.sql` - Script SQL para configurar tablas en Supabase
- `scripts/test_supabase_connection.ts` - Script de prueba de conexión a Supabase
- `MIGRATION_TO_SUPABASE.md` - Este archivo de instrucciones

## 🚀 Pasos para Completar la Migración

### 1. Configurar Supabase
1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Ve a `Settings > API` y copia:
   - `Project URL`
   - `anon public key`

### 2. Configurar Variables de Entorno
1. Crea un archivo `.env.local` en el directorio `PagRecargos/`
2. Agrega las siguientes variables:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### 3. Configurar las Tablas en Supabase
1. Ve a tu proyecto de Supabase
2. Abre el `SQL Editor`
3. Ejecuta el contenido del archivo `scripts/setup_supabase.sql`
4. Esto creará las tablas: `accesos`, `cargos`, y `festivos`

### 4. Instalar Dependencias
```bash
cd PagRecargos
npm install
```

### 5. Probar la Conexión
```bash
npm run test-supabase
```

### 6. Migrar Datos Existentes (Opcional)
Si tienes datos en Oracle que quieres migrar:
1. Exporta los datos desde Oracle usando el método que prefieras
2. Importa los datos a Supabase usando el SQL Editor o la interfaz web

## 📋 Funciones Migradas

Todas las funciones de base de datos han sido migradas y mantienen la misma interfaz:

### Funciones de Accesos
- `registrarAcceso(ip: string)`
- `obtenerAccesos()`
- `limpiarAccesos()`

### Funciones de Cargos
- `agregarCargo(nombre: string, salario: number)`
- `obtenerCargos()`
- `actualizarCargo(id: number, nombre: string, salario: number)`
- `eliminarCargo(id: number)`

### Funciones de Festivos
- `agregarFestivo(fecha: string, nombre: string, tipo: 'FIJO' | 'MOVIL')`
- `obtenerFestivos()`
- `obtenerFestivosPorAño(año: number)`
- `eliminarFestivo(fecha: string)`

### Funciones de Utilidad
- `exportarBaseDeDatos()`
- `connectToDatabase()`

## 🔧 Scripts de Prueba Disponibles

- `npm run test-supabase` - Prueba conexión general a Supabase
- `tsx scripts/test_delete_festivo.ts` - Prueba eliminación de festivos
- `tsx scripts/test_festivos_dates.ts` - Prueba fechas de festivos
- `tsx scripts/test_frontend_dates.ts` - Prueba fechas para frontend

## ⚠️ Notas Importantes

1. **Formato de Fechas**: Supabase usa formato ISO (YYYY-MM-DD) para fechas
2. **IDs**: Los IDs son generados automáticamente por Supabase (BIGSERIAL)
3. **Tipos de Datos**: Los tipos han sido adaptados de Oracle a PostgreSQL
4. **Manejo de Errores**: Mejorado el manejo de errores con try-catch

## 🎯 Próximos Pasos

1. Configura las variables de entorno
2. Ejecuta el script SQL en Supabase
3. Prueba la conexión con `npm run test-supabase`
4. Migra tus datos existentes si es necesario
5. Ejecuta tu aplicación con `npm run dev`

## 🆘 Solución de Problemas

### Error: "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are required"
- Asegúrate de tener el archivo `.env.local` con las variables correctas
- Verifica que los nombres de las variables sean exactos

### Error de conexión a Supabase
- Verifica que tu URL y clave sean correctas
- Asegúrate de que tu proyecto de Supabase esté activo
- Revisa que las tablas estén creadas correctamente

### Error en las consultas
- Verifica que las tablas tengan los nombres correctos (`accesos`, `cargos`, `festivos`)
- Asegúrate de que las columnas tengan los tipos de datos correctos

## 📞 Soporte

Si encuentras algún problema durante la migración, revisa:
1. Los logs de la consola para errores específicos
2. La configuración de variables de entorno
3. Que las tablas estén creadas correctamente en Supabase 