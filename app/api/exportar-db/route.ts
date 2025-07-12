import { NextResponse } from 'next/server';
import { exportarBaseDeDatos } from '@/lib/database';

export async function GET() {
  try {
    const data = await exportarBaseDeDatos();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Error al exportar la base de datos' }, { status: 500 });
  }
} 