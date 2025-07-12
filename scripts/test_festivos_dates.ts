import { obtenerFestivos, obtenerFestivosPorAño } from '../lib/database';

async function testFestivosDates() {
  console.log('🔍 Probando fechas de festivos...');
  
  try {
    // 1. Obtener todos los festivos
    console.log('1. Obteniendo todos los festivos...');
    const todosFestivos = await obtenerFestivos();
    console.log(`   - Total festivos: ${todosFestivos.length}`);
    
    // 2. Mostrar algunos festivos con sus fechas
    console.log('2. Mostrando primeros 5 festivos:');
    todosFestivos.slice(0, 5).forEach((festivo, index) => {
      console.log(`   ${index + 1}. ${festivo.fecha} - ${festivo.nombre} (${festivo.tipo})`);
    });
    
    // 3. Obtener festivos por año específico
    const año = 2024;
    console.log(`3. Obteniendo festivos para el año ${año}...`);
    const festivosAño = await obtenerFestivosPorAño(año);
    console.log(`   - Festivos en ${año}: ${festivosAño.length}`);
    
    // 4. Mostrar festivos del año
    console.log(`4. Festivos del año ${año}:`);
    festivosAño.forEach((festivo, index) => {
      console.log(`   ${index + 1}. ${festivo.fecha} - ${festivo.nombre} (${festivo.tipo})`);
    });
    
    // 5. Verificar formato de fechas
    console.log('5. Verificando formato de fechas...');
    const fechaEjemplo = festivosAño[0]?.fecha;
    if (fechaEjemplo) {
      console.log(`   - Fecha ejemplo: "${fechaEjemplo}"`);
      console.log(`   - Tipo: ${typeof fechaEjemplo}`);
      console.log(`   - Formato válido: ${/^\d{4}-\d{2}-\d{2}$/.test(fechaEjemplo) ? '✅' : '❌'}`);
    }
    
    console.log('✅ Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testFestivosDates().then(() => {
  console.log('🎉 Prueba finalizada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 