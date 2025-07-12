import { NextRequest, NextResponse } from 'next/server';
import { actualizarCargo, eliminarCargo } from '@/lib/database';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  console.log('PUT /api/cargos/[id] called with id:', params.id);
  try {
    const { nombre, salario } = await request.json();
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }
    await actualizarCargo(id, nombre, salario);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database Error (actualizarCargo):', error);
    console.error('Error al actualizar cargo:', error);
    return NextResponse.json({ error: 'Error al actualizar cargo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log('DELETE /api/cargos/[id] called with id:', params.id);
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }
    await eliminarCargo(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database Error (eliminarCargo):', error);
    console.error('Error al eliminar cargo:', error);
    return NextResponse.json({ error: 'Error al eliminar cargo' }, { status: 500 });
  }
} 