// IMPORTANTE: Cargar variables de entorno ANTES de cualquier importación
import * as dotenv from 'dotenv';
import path from 'path';

// Cargar .env.local primero
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// También intentar cargar .env como respaldo
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Verificar que las variables se cargaron correctamente
console.log('🔧 Verificando carga de variables de entorno...');
console.log(`   - SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Cargada' : '❌ No encontrada'}`);
console.log(`   - SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Cargada' : '❌ No encontrada'}`);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Variables de entorno no configuradas correctamente');
  console.error('   Verifica que el archivo .env.local existe y contiene:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=tu-url-aqui');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key-aqui');
  process.exit(1);
}

// AHORA sí importar el database después de cargar las variables
import { connectToDatabase, obtenerCargos, obtenerAccesos, obtenerFestivos, getSupabaseClient } from '../lib/database';

async function testSupabaseConnection() {
  console.log('🔍 Probando conexión a Supabase...');
  
  try {
    // 1. Verificar configuración de variables de entorno
    console.log('1. Verificando configuración de variables de entorno...');
    console.log(`   - SUPABASE_URL configurada: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}`);
    console.log(`   - SUPABASE_ANON_KEY configurada: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}`);
    
    // 2. Probar conexión básica
    console.log('2. Probando conexión básica a Supabase...');
    const client = await connectToDatabase();
    console.log('✅ Conexión exitosa a Supabase');
    
    // 3. Verificar existencia de tablas
    console.log('3. Verificando existencia de tablas...');
    
    // Verificar tabla accesos
    try {
      const { data: accesosTest, error: accesosError } = await getSupabaseClient()
        .from('accesos')
        .select('*')
        .limit(1);
      
      if (accesosError) {
        if (accesosError.code === 'PGRST116' || accesosError.message.includes('does not exist')) {
          console.log('   ❌ Tabla "accesos" no existe');
        } else {
          console.log('   ⚠️  Error en tabla "accesos":', accesosError.message);
        }
      } else {
        console.log('   ✅ Tabla "accesos" existe');
      }
    } catch (error) {
      console.log('   ❌ Error verificando tabla "accesos":', error);
    }
    
    // Verificar tabla cargos
    try {
      const { data: cargosTest, error: cargosError } = await getSupabaseClient()
        .from('cargos')
        .select('*')
        .limit(1);
      
      if (cargosError) {
        if (cargosError.code === 'PGRST116' || cargosError.message.includes('does not exist')) {
          console.log('   ❌ Tabla "cargos" no existe');
        } else {
          console.log('   ⚠️  Error en tabla "cargos":', cargosError.message);
        }
      } else {
        console.log('   ✅ Tabla "cargos" existe');
      }
    } catch (error) {
      console.log('   ❌ Error verificando tabla "cargos":', error);
    }
    
    // Verificar tabla festivos
    try {
      const { data: festivosTest, error: festivosError } = await getSupabaseClient()
        .from('festivos')
        .select('*')
        .limit(1);
      
      if (festivosError) {
        if (festivosError.code === 'PGRST116' || festivosError.message.includes('does not exist')) {
          console.log('   ❌ Tabla "festivos" no existe');
        } else {
          console.log('   ⚠️  Error en tabla "festivos":', festivosError.message);
        }
      } else {
        console.log('   ✅ Tabla "festivos" existe');
      }
    } catch (error) {
      console.log('   ❌ Error verificando tabla "festivos":', error);
    }
    
    // 4. Probar funciones específicas
    console.log('4. Probando funciones específicas...');
    
    // Probar obtención de accesos
    try {
      console.log('   - Probando obtenerAccesos...');
      const accesos = await obtenerAccesos();
      console.log(`     ✅ Accesos obtenidos: ${accesos.length}`);
      if (accesos.length > 0) {
        console.log(`     - Último acceso: ${accesos[0].ip} - ${accesos[0].fecha}`);
      }
    } catch (error) {
      console.log(`     ❌ Error obteniendo accesos: ${error}`);
    }
    
    // Probar obtención de cargos
    try {
      console.log('   - Probando obtenerCargos...');
      const cargos = await obtenerCargos();
      console.log(`     ✅ Cargos obtenidos: ${cargos.length}`);
      cargos.forEach((cargo, index) => {
        console.log(`     ${index + 1}. ${cargo.nombre} - $${cargo.salario.toLocaleString()}`);
      });
    } catch (error) {
      console.log(`     ❌ Error obteniendo cargos: ${error}`);
    }
    
    // Probar obtención de festivos
    try {
      console.log('   - Probando obtenerFestivos...');
      const festivos = await obtenerFestivos();
      console.log(`     ✅ Festivos obtenidos: ${festivos.length}`);
      if (festivos.length > 0) {
        console.log(`     - Primer festivo: ${festivos[0].fecha} - ${festivos[0].nombre}`);
      }
    } catch (error) {
      console.log(`     ❌ Error obteniendo festivos: ${error}`);
    }
    
    // 5. Mostrar instrucciones si hay problemas
    const hasErrors = await checkForErrors();
    if (hasErrors) {
      console.log('\n📋 INSTRUCCIONES PARA SOLUCIONAR PROBLEMAS:');
      console.log('1. Asegúrate de haber ejecutado el script setup_supabase.sql en tu proyecto de Supabase');
      console.log('2. Ve a tu proyecto de Supabase > SQL Editor');
      console.log('3. Copia y pega el contenido del archivo scripts/setup_supabase.sql');
      console.log('4. Ejecuta el script');
      console.log('5. Vuelve a ejecutar esta prueba');
    } else {
      console.log('\n🎉 Todas las pruebas completadas exitosamente!');
      console.log('✅ La migración a Supabase fue exitosa');
    }
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    
    // Diagnóstico adicional
    console.log('\n🔧 Diagnóstico adicional:');
    console.log(`   - Variables de entorno configuradas: ${process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}`);
    console.log(`   - URL Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurada' : 'No configurada'}`);
    console.log(`   - Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurada' : 'No configurada'}`);
    
    console.log('\n💡 Posibles soluciones:');
    console.log('1. Verifica que las variables de entorno estén en el archivo .env.local');
    console.log('2. Asegúrate de que tu proyecto de Supabase esté activo');
    console.log('3. Ejecuta el script setup_supabase.sql en tu proyecto de Supabase');
    
    process.exit(1);
  }
}

async function checkForErrors(): Promise<boolean> {
  let hasErrors = false;
  
  // Check each table
  const tables = ['accesos', 'cargos', 'festivos'];
  
  for (const table of tables) {
    try {
      const { error } = await getSupabaseClient()
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && (error.code === 'PGRST116' || error.message.includes('does not exist'))) {
        hasErrors = true;
      }
    } catch (error) {
      hasErrors = true;
    }
  }
  
  return hasErrors;
}

testSupabaseConnection().then(() => {
  console.log('🎉 Prueba finalizada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 