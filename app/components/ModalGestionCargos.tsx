import React, { useState, useEffect, KeyboardEvent, ChangeEvent, FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface Cargo {
  id: number;
  nombre: string;
  salario: number;
}

interface ModalGestionCargosProps {
  onClose: () => void;
  cargos?: Array<{ id: number; nombre: string; salario: number }>;
  fetchCargos: () => Promise<void>;
  cargoSeleccionado: string;
}

const ModalGestionCargos: React.FC<ModalGestionCargosProps> = ({ onClose, cargos: cargosProp, fetchCargos, cargoSeleccionado }) => {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [editandoCargo, setEditandoCargo] = useState<string | null>(null);
  const [valorEditando, setValorEditando] = useState("");
  const [editandoSalario, setEditandoSalario] = useState("");
  const [nuevoCargoInput, setNuevoCargoInput] = useState("");
  const [nuevoSalarioInput, setNuevoSalarioInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Determinar si es modal o página completa
  const isModal = onClose.toString() !== '() => {}';

  // Helper function to fetch cargos
  const fetchCargosLocal = async () => {
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
    if (cargosProp) {
      setCargos(cargosProp);
    } else {
      fetchCargosLocal();
    }
  }, [cargosProp]);

  const handleGuardarEdicion = async (cargoId: number): Promise<void> => {
    console.log('Attempting to save edited cargo:', cargoId);
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
        console.error('API Error Response:', res);
        throw new Error('Error al actualizar cargo');
      }

      // Re-fetch cargos after successful update
      fetchCargos();
      
      setEditandoCargo(null);
      setValorEditando("");
      setEditandoSalario("");
      // No need to set error to null here, fetchCargos will handle it
    } catch (err) {
      console.error('Error al actualizar cargo:', err);
      setError('Error al actualizar el cargo');
    }
  };

  const handleSubmitCargo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Attempting to submit new cargo:', { nombre: nuevoCargoInput, salario: nuevoSalarioInput });
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
        // Attempt to read error message from response if available
        console.error('API Error Response:', res);
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error || 'Error al crear cargo';
        throw new Error(errorMessage);
      }

      // Re-fetch cargos after successful add
      fetchCargos();

      setNuevoCargoInput("");
      setNuevoSalarioInput("");
      // No need to set error to null here, fetchCargos will handle it
    } catch (err: any) {
      console.error('Error al agregar cargo:', err);
      setError(err.message || 'Error al agregar el cargo');
    }
  };

  const handleEliminarCargo = async (cargoId: number) => {
    console.log('Attempting to delete cargo:', cargoId);
    try {
      const res = await fetch(`/api/cargos/${cargoId}`, { 
        method: 'DELETE' 
      });

      if (!res.ok) {
        console.error('API Error Response:', res);
        throw new Error('Error al eliminar cargo');
      }

      // Re-fetch cargos after successful delete
      fetchCargos();
      // No need to set error to null here, fetchCargos will handle it
    } catch (err) {
      console.error('Error al eliminar cargo:', err);
      setError('Error al eliminar el cargo');
    }
  };

  // Contenido del componente
  const content = (
    <>
      {!isModal && <h2 className="text-2xl font-bold mb-6 text-gray-900">Gestión de Cargos</h2>}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmitCargo} className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Label htmlFor="nuevoCargo">Nuevo Cargo</Label>
            <Input
              id="nuevoCargo"
              value={nuevoCargoInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNuevoCargoInput(e.target.value.toUpperCase())}
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNuevoSalarioInput(e.target.value)}
              placeholder="Ingrese el salario base"
              className="w-full"
            />
          </div>
        </div>
        <Button type="submit" className="w-full md:w-auto bg-red-500 hover:bg-red-600">
          Agregar Cargo
        </Button>
      </form>

      <div className="space-y-4">
        {Array.isArray(cargos) && cargos.map((cargo) => (
          <Card key={cargo.id} className="p-4">
            {editandoCargo === cargo.id.toString() ? (
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor={`editCargo-${cargo.id}`}>Nombre</Label>
                  <Input
                    id={`editCargo-${cargo.id}`}
                    value={valorEditando}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setValorEditando(e.target.value.toUpperCase())}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
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
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditandoSalario(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleGuardarEdicion(cargo.id);
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
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
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      handleEliminarCargo(cargo.id);
                    }}
                    disabled={cargo.nombre === cargoSeleccionado}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );

  // Si es modal, mostrar con el fondo modal
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
          {content}
        </div>
      </div>
    );
  }

  // Si es página completa, mostrar sin el fondo modal
  return <div className="w-full">{content}</div>;
};

export default ModalGestionCargos; 