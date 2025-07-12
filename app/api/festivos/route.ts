import { NextResponse } from 'next/server';
import { obtenerFestivos, agregarFestivo, eliminarFestivo, obtenerFestivosPorAño } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const anio = url.searchParams.get('anio');
    
    let festivos;
    if (anio) {
      festivos = await obtenerFestivosPorAño(parseInt(anio));
    } else {
      festivos = await obtenerFestivos();
    }
    
    return NextResponse.json({ success: true, festivos });
  } catch (error) {
    console.error('Error al obtener festivos:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener festivos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { fecha, nombre, tipo } = await request.json();
    
    if (!fecha || !nombre || !tipo) {
      return NextResponse.json({ success: false, error: 'Todos los campos son requeridos' }, { status: 400 });
    }
    
    const result = await agregarFestivo(fecha, nombre, tipo);
    return NextResponse.json({ success: true, message: 'Festivo agregado correctamente' });
  } catch (error: any) {
    console.error('Error al agregar festivo:', error);
    
    if (error.errorNum === 1 || error.message?.includes('unique constraint')) {
      return NextResponse.json({ success: false, error: 'Ya existe un festivo en esta fecha' }, { status: 409 });
    }
    
    return NextResponse.json({ success: false, error: 'Error al agregar festivo' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const fecha = url.searchParams.get('fecha');
    
    if (!fecha) {
      return NextResponse.json({ success: false, error: 'Se requiere la fecha del festivo' }, { status: 400 });
    }
    
    const result = await eliminarFestivo(fecha);
    
    if (result.count === 0) {
      return NextResponse.json({ success: false, error: 'Festivo no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Festivo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar festivo:', error);
    return NextResponse.json({ success: false, error: 'Error al eliminar festivo' }, { status: 500 });
  }
} 