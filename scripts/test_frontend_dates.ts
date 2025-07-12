import { obtenerFestivos } from '../lib/database';

async function testFrontendDates() {
  console.log('🔍 Probando fechas para el frontend...');
  
  try {
    // 1. Obtener festivos
    console.log('1. Obteniendo festivos...');
    const festivos = await obtenerFestivos();
    console.log(`   - Total festivos: ${festivos.length}`);
    
    if (festivos.length === 0) {
      console.log('   ⚠️  No hay festivos en la base de datos');
      return;
    }
    
    // 2. Verificar formato de fechas
    console.log('2. Verificando formato de fechas...');
    festivos.slice(0, 5).forEach((festivo, index) => {
      console.log(`   ${index + 1}. Fecha: "${festivo.fecha}"`);
      console.log(`      - Nombre: ${festivo.nombre}`);
      console.log(`      - Tipo: ${festivo.tipo}`);
      console.log(`      - Formato válido: ${/^\d{4}-\d{2}-\d{2}$/.test(festivo.fecha) ? '✅' : '❌'}`);
    });
    
    // 3. Probar conversión a Date
    console.log('3. Probando conversión a Date...');
    const fechaEjemplo = festivos[0];
    if (fechaEjemplo) {
      console.log(`   - Fecha desde Supabase: "${fechaEjemplo.fecha}"`);
      
      try {
        const dateObj = new Date(fechaEjemplo.fecha);
        console.log(`   - Convertido a Date: ${dateObj}`);
        console.log(`   - Es válido: ${!isNaN(dateObj.getTime()) ? '✅' : '❌'}`);
        console.log(`   - Formato ISO: ${dateObj.toISOString().split('T')[0]}`);
      } catch (error) {
        console.log(`   - Error al convertir: ${error}`);
      }
    }
    
    // 4. Probar filtrado por año
    console.log('4. Probando filtrado por año...');
    const año2024 = festivos.filter(f => f.fecha.startsWith('2024'));
    const año2025 = festivos.filter(f => f.fecha.startsWith('2025'));
    
    console.log(`   - Festivos 2024: ${año2024.length}`);
    console.log(`   - Festivos 2025: ${año2025.length}`);
    
    // 5. Mostrar algunos festivos de cada año
    if (año2024.length > 0) {
      console.log('   - Primer festivo 2024:', año2024[0].fecha, '-', año2024[0].nombre);
    }
    if (año2025.length > 0) {
      console.log('   - Primer festivo 2025:', año2025[0].fecha, '-', año2025[0].nombre);
    }
    
    console.log('✅ Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testFrontendDates().then(() => {
  console.log('🎉 Prueba finalizada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 