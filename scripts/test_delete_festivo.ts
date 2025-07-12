import { obtenerFestivos, agregarFestivo, eliminarFestivo } from '../lib/database';

async function testDeleteFestivo() {
  console.log('🔍 Probando funcionalidad de eliminar festivo...');
  
  try {
    // 1. Obtener festivos actuales
    console.log('1. Obteniendo festivos actuales...');
    const festivosAntes = await obtenerFestivos();
    console.log(`   - Festivos antes: ${festivosAntes.length}`);
    
    // 2. Agregar un festivo de prueba
    console.log('2. Agregando festivo de prueba...');
    const fechaPrueba = '2024-12-25';
    const nombrePrueba = 'Navidad Test';
    const tipoPrueba = 'FIJO' as const;
    
    await agregarFestivo(fechaPrueba, nombrePrueba, tipoPrueba);
    console.log(`   - Festivo agregado: ${fechaPrueba} - ${nombrePrueba}`);
    
    // 3. Verificar que se agregó
    console.log('3. Verificando que se agregó...');
    const festivosDespues = await obtenerFestivos();
    console.log(`   - Festivos después de agregar: ${festivosDespues.length}`);
    
    const festivoAgregado = festivosDespues.find(f => f.fecha === fechaPrueba);
    if (festivoAgregado) {
      console.log(`   ✅ Festivo encontrado: ${JSON.stringify(festivoAgregado)}`);
    } else {
      console.log('   ❌ No se encontró el festivo agregado');
      return;
    }
    
    // 4. Eliminar el festivo
    console.log('4. Eliminando festivo...');
    const resultado = await eliminarFestivo(fechaPrueba);
    console.log(`   - Resultado eliminación:`, resultado);
    
    // 5. Verificar que se eliminó
    console.log('5. Verificando que se eliminó...');
    const festivosFinales = await obtenerFestivos();
    console.log(`   - Festivos después de eliminar: ${festivosFinales.length}`);
    
    const festivoEliminado = festivosFinales.find(f => f.fecha === fechaPrueba);
    if (!festivoEliminado) {
      console.log('   ✅ Festivo eliminado correctamente');
    } else {
      console.log('   ❌ El festivo no se eliminó');
    }
    
    console.log('✅ Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testDeleteFestivo().then(() => {
  console.log('🎉 Prueba finalizada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 