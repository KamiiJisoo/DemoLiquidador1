import { NextResponse } from 'next/server';
import { obtenerAccesos } from '@/lib/database';

export async function GET() {
  try {
    const accesos = await obtenerAccesos();
    return NextResponse.json({ accesos });
  } catch (error) {
    console.error('Error al obtener accesos:', error);
    return NextResponse.json(
      { error: 'Error al obtener accesos' },
      { status: 500 }
    );
  }
} 