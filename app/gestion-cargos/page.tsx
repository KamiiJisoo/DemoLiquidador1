"use client"

import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Cargo {
  id: number;
  nombre: string;
  salario: number;
}

export default function GestionCargos() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [editandoCargo, setEditandoCargo] = useState<string | null>(null);
  const [valorEditando, setValorEditando] = useState("");
  const [editandoSalario, setEditandoSalario] = useState("");
  const [nuevoCargoInput, setNuevoCargoInput] = useState("");
  const [nuevoSalarioInput, setNuevoSalarioInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Helper function to fetch cargos
  const fetchCargos = async () => {
    try {
      const res = await fetch('/api/cargos');
      const data = await res.json();
      setCargos(data.cargos || []);
      setError(null);
    } catch (err) {
      console.error('Error al obtener cargos:', err);
      setError('Error al cargar los cargos');
    }
  };

  // Fetch cargos on component mount
  useEffect(() => {
    fetchCargos();
  }, []);

  const handleGuardarEdicion = async (cargoId: number): Promise<void> => {
    try {
      if (!valorEditando.trim() || !editandoSalario) {
        setError('El nombre y salario son requeridos');
        return;
      }

      const res = await fetch(`/api/cargos/${cargoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: valorEditando, 
          salario: Number(editandoSalario) 
        })
      });

      if (!res.ok) {
        throw new Error('Error al actualizar cargo');
      }

      // Re-fetch cargos after successful update
      fetchCargos();
      
      setEditandoCargo(null);
      setValorEditando("");
      setEditandoSalario("");
    } catch (err) {
      console.error('Error al actualizar cargo:', err);
      setError('Error al actualizar el cargo');
    }
  };

  const handleSubmitCargo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!nuevoCargoInput.trim() || !nuevoSalarioInput) {
        setError('El nombre y salario son requeridos');
        return;
      }

      const res = await fetch('/api/cargos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: nuevoCargoInput, 
          salario: Number(nuevoSalarioInput) 
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error || 'Error al crear cargo';
        throw new Error(errorMessage);
      }

      // Re-fetch cargos after successful add
      fetchCargos();

      setNuevoCargoInput("");
      setNuevoSalarioInput("");
    } catch (err: any) {
      console.error('Error al agregar cargo:', err);
      setError(err.message || 'Error al agregar el cargo');
    }
  };

  const handleEliminarCargo = async (cargoId: number) => {
    try {
      const res = await fetch(`/api/cargos/${cargoId}`, { 
        method: 'DELETE' 
      });

      if (!res.ok) {
        throw new Error('Error al eliminar cargo');
      }

      // Re-fetch cargos after successful delete
      fetchCargos();
    } catch (err) {
      console.error('Error al eliminar cargo:', err);
      setError('Error al eliminar el cargo');
    }
  };

  return (
    <div className="w-full py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        Gestión de Cargo
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Agregar Nuevo Cargo</h2>
        <form onSubmit={handleSubmitCargo}>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="nuevoCargo">Nombre del Cargo</Label>
              <Input
                id="nuevoCargo"
                value={nuevoCargoInput}
                onChange={(e) => setNuevoCargoInput(e.target.value.toUpperCase())}
                placeholder="Ingrese el nombre del cargo"
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="nuevoSalario">Salario Base</Label>
              <Input
                id="nuevoSalario"
                type="number"
                value={nuevoSalarioInput}
                onChange={(e) => setNuevoSalarioInput(e.target.value)}
                placeholder="Ingrese el salario base"
                className="w-full"
              />
            </div>
          </div>
          <Button type="submit" className="bg-red-500 hover:bg-red-600">
            Agregar Cargo
          </Button>
        </form>
      </Card>

      <h2 className="text-2xl font-semibold mb-4">Lista de Cargos</h2>
      <div className="space-y-4">
        {Array.isArray(cargos) && cargos.length > 0 ? (
          cargos.map((cargo) => (
            <Card key={cargo.id} className="p-4">
              {editandoCargo === cargo.id.toString() ? (
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor={`editCargo-${cargo.id}`}>Nombre</Label>
                    <Input
                      id={`editCargo-${cargo.id}`}
                      value={valorEditando}
                      onChange={(e) => setValorEditando(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleGuardarEdicion(cargo.id);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`editSalario-${cargo.id}`}>Salario</Label>
                    <Input
                      id={`editSalario-${cargo.id}`}
                      type="number"
                      value={editandoSalario}
                      onChange={(e) => setEditandoSalario(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleGuardarEdicion(cargo.id);
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2 mt-4 md:mt-0 md:items-end">
                    <Button
                      onClick={() => handleGuardarEdicion(cargo.id)}
                      className="flex-1"
                    >
                      Guardar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditandoCargo(null);
                        setValorEditando("");
                        setEditandoSalario("");
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cargo.nombre}</h3>
                    <p className="text-gray-600">Salario Base: ${cargo.salario.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditandoCargo(cargo.id.toString());
                        setValorEditando(cargo.nombre);
                        setEditandoSalario(cargo.salario.toString());
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleEliminarCargo(cargo.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">No hay cargos registrados</p>
        )}
      </div>
    </div>
  );
} 