import { NextResponse } from 'next/server';
import { obtenerAccesos, limpiarAccesos } from '@/lib/database';

export async function POST() {
  try {
    const accesos = await obtenerAccesos();
    const total_accesos = accesos.length;
    await limpiarAccesos();
    return NextResponse.json({ 
      success: true, 
      message: `Resumen creado`,
      total_accesos
    });
  } catch (error) {
    console.error('Error al crear resumen de accesos:', error);
    return NextResponse.json(
      { error: 'Error al crear resumen de accesos' },
      { status: 500 }
    );
  }
} 