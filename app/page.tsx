"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { format, addDays, startOfMonth, endOfMonth, parse, differenceInHours, differenceInMinutes, getDaysInMonth, startOfWeek, endOfWeek, isSameMonth, isBefore, isAfter, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, Clock, AlertCircle, Lock } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import festivos from "@/data/festivos.json"
import { createHash } from 'crypto'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type AñoFestivo = "2024" | "2025" | "2026" | "2027" | "2028" | "2029" | "2030" | "2031" | "2032" | "2033" | "2034" | "2035" | "2036" | "2037" | "2038" | "2039" | "2040"

type Festivos = Record<AñoFestivo, string[]>

// Lista de días festivos en Colombia 2024 (ejemplo)
const diasFestivos2024 = [
  "2024-01-01", // Año Nuevo
  "2024-01-08", // Día de los Reyes Magos
  "2024-03-25", // Día de San José
  "2024-03-28", // Jueves Santo
  "2024-03-29", // Viernes Santo
  "2024-05-01", // Día del Trabajo
  "2024-05-13", // Día de la Ascensión
  "2024-06-03", // Corpus Christi
  "2024-06-10", // Sagrado Corazón
  "2024-07-01", // San Pedro y San Pablo
  "2024-07-20", // Día de la Independencia
  "2024-08-07", // Batalla de Boyacá
  "2024-08-19", // Asunción de la Virgen
  "2024-10-14", // Día de la Raza
  "2024-11-04", // Todos los Santos
  "2024-11-11", // Independencia de Cartagena
  "2024-12-08", // Día de la Inmaculada Concepción
  "2024-12-25", // Navidad
]

// Interfaz para los datos de un día
interface DiaData {
  entrada1: string
  salida1: string
  entrada2: string
  salida2: string
  total: string
  isHoliday: boolean
  isSunday: boolean
}

interface AdvertenciaDiaDiferente {
  fecha: string
  turno: "1" | "2"
  entrada: string
  salida: string
}

// Interfaz para los cálculos de horas
interface CalculoHoras {
  horasNormales: number
  horasNocturnasLV: number
  horasDiurnasFestivos: number
  horasNocturnasFestivos: number
  horasExtDiurnasLV: number
  horasExtNocturnasLV: number
  horasExtDiurnasFestivos: number
  horasExtNocturnasFestivos: number
}

interface DesgloseCompensatorio {
  diurnaLV: { minutos: number, valor: number, porcentaje: number }
  nocturnaLV: { minutos: number, valor: number, porcentaje: number }
  diurnaFestivo: { minutos: number, valor: number, porcentaje: number }
  nocturnaFestivo: { minutos: number, valor: number, porcentaje: number }
}

// Interfaz para el evento de cambio
interface ChangeEvent<T = Element> {
  target: EventTarget & T
}

interface EventTarget {
  value: string
}

// Utilidad para validar hora en formato HH:mm
const esHoraValida = (valor: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(valor)

// Function to format number with space as thousands separator and period as decimal
const formatNumberWithSpace = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null) {
    return "0";
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
      return "0";
  }
  // Use toLocaleString with a locale that uses a comma for decimal and then replace
  // the comma with a period and the thousands separator (which is a period in many locales) with a space.
  // This might not be the most robust for all locales, but works for the requested format.
  // A more robust solution would involve manual string manipulation based on regex.
  // Let's try a simple approach first. Using 'en-US' which uses comma for thousands and period for decimal.
  // Then swap them. This is still not ideal.
  // Let's stick to es-CO and manually replace. es-CO uses '.' for thousands and ',' for decimals
  // So we want to replace '.' with ' ' and ',' with '.'

  const parts = num.toFixed(2).split('.'); // Split by the default decimal separator
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // Add space as thousands separator
  const decimalPart = parts[1];

  return `${integerPart}.${decimalPart}`; // Join with period as decimal separator
};

// Modal de gestión de cargos
const ModalGestionCargos = ({ onClose, cargos, fetchCargos, cargoSeleccionado }: { onClose: () => void; cargos: Array<{ id: number; nombre: string; salario: number }>; fetchCargos: () => Promise<void>; cargoSeleccionado: string }) => {
  const [editandoCargo, setEditandoCargo] = useState<string | null>(null);
  const [valorEditando, setValorEditando] = useState("");
  const [editandoSalario, setEditandoSalario] = useState("");
  const [nuevoCargo, setNuevoCargo] = useState("");
  const [nuevoSalario, setNuevoSalario] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleNuevoCargoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Nuevo Cargo input changed:', e.target.value);
    const value = e.target.value.toUpperCase()
    setNuevoCargo(value)
  };

  const handleNuevoSalarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Nuevo Salario input changed:', e.target.value);
    const value = e.target.value.replace(/[^0-9]/g, '')
    setNuevoSalario(value)
  };

  const handleGuardarEdicion = async (cargoId: number) => {
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
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error || 'Error al actualizar cargo';
        throw new Error(errorMessage);
      }

      setEditandoCargo(null);
      setValorEditando("");
      setEditandoSalario("");
      setError(null);

      fetchCargos();

    } catch (err: any) {
      console.error('Error al actualizar cargo:', err);
      setError(err.message || 'Error al actualizar el cargo');
    }
  };

  const handleEliminarCargo = async (cargoId: number) => {
    try {
      const res = await fetch(`/api/cargos/${cargoId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error || 'Error al eliminar cargo';
        throw new Error(errorMessage);
      }

      setError(null);

      fetchCargos();

    } catch (err: any) {
      console.error('Error al eliminar cargo:', err);
      setError(err.message || 'Error al eliminar el cargo');
    }
  };

  const handleSubmitCargo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!nuevoCargo.trim() || !nuevoSalario) {
        setError('El nombre y salario son requeridos');
        return;
      }

      const res = await fetch('/api/cargos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: nuevoCargo, 
          salario: Number(nuevoSalario) 
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error || 'Error al crear cargo';
        throw new Error(errorMessage);
      }

      setNuevoCargo("");
      setNuevoSalario("");
      setError(null);
      fetchCargos();
      onClose();

    } catch (err: any) {
      console.error('Error al agregar cargo:', err);
      setError(err.message || 'Error al agregar el cargo');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-bomberored-800 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
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
            Gestión de Cargos
          </h2>
          <button
            className="text-gray-500 hover:text-bomberored-700 transition-colors"
            onClick={() => onClose()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        <form
          className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200"
          onSubmit={handleSubmitCargo}
        >
          <div className="flex-1">
            <Label
              htmlFor="nuevoCargo"
              className="text-sm font-medium text-gray-700 mb-1 block"
            >
              Nuevo Cargo
            </Label>
            <input
              id="nuevoCargo"
              type="text"
              placeholder="Ingrese el nombre del cargo"
              value={nuevoCargo}
              onChange={handleNuevoCargoChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bomberored-700"
              required
              autoComplete="off"
              spellCheck="false"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("nuevoSalario")?.focus();
                }
              }}
            />
          </div>
          <div className="w-full md:w-48">
            <Label
              htmlFor="nuevoSalario"
              className="text-sm font-medium text-gray-700 mb-1 block"
            >
              Salario
            </Label>
            <input
              id="nuevoSalario"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Salario"
              value={nuevoSalario}
              onChange={handleNuevoSalarioChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bomberored-700"
              required
              autoComplete="off"
              spellCheck="false"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              className="w-full md:w-auto bg-bomberored-700 hover:bg-bomberored-800"
            >
              Agregar Cargo
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 font-bold text-sm text-gray-500 border-b border-gray-200 pb-2">
            <div className="col-span-4">CARGO</div>
            <div className="col-span-3">SALARIO</div>
            <div className="col-span-5 text-center">ACCIONES</div>
          </div>
          {Array.isArray(cargos) && cargos.map((cargo) => {
            console.log('Rendering cargo:', cargo);
            return (
              <div
                key={cargo.id}
                className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100"
              >
                <div className="col-span-4">
                  {editandoCargo === cargo.id.toString() ? (
                    <input
                      type="text"
                      value={valorEditando}
                      onChange={(e) =>
                        setValorEditando(e.target.value.toUpperCase())
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bomberored-700"
                      autoComplete="off"
                      spellCheck="false"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleGuardarEdicion(cargo.id);
                        }
                      }}
                    />
                  ) : (
                    <span className="font-medium text-gray-900">
                      {cargo.nombre}
                    </span>
                  )}
                </div>
                <div className="col-span-3 flex items-center relative">
                  {editandoCargo === cargo.id.toString() ? (
                     <input
                       type="text"
                       inputMode="numeric"
                       pattern="[0-9]*"
                       value={editandoSalario}
                       onChange={(e) => setEditandoSalario(e.target.value.replace(/[^0-9]/g, ''))}
                       className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bomberored-700"
                       autoComplete="off"
                       spellCheck="false"
                       onKeyDown={(e) => {
                         if (e.key === "Enter") {
                           e.preventDefault();
                           handleGuardarEdicion(cargo.id);
                         }
                       }}
                     />
                  ) : (
                    <div className="text-gray-900 overflow-hidden text-ellipsis">
                      $ {cargo.salario ? formatNumberWithSpace(cargo.salario) : "0.00"}
                    </div>
                  )}
                </div>
                <div className="col-span-5 flex items-center justify-end gap-2">
                  {editandoCargo === cargo.id.toString() ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGuardarEdicion(cargo.id)}
                      >
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditandoCargo(null);
                          setValorEditando("");
                          setEditandoSalario("");
                          setError(null);
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditandoCargo(cargo.id.toString());
                          setValorEditando(cargo.nombre);
                          // Reset salario editing when editing name
                          setEditandoSalario("");
                        }}
                      >
                        Editar Nombre
                      </Button>
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => {
                           setEditandoCargo(cargo.id.toString());
                           setValorEditando(cargo.nombre);
                           setEditandoSalario(cargo.salario.toString());
                         }}
                       >
                         Editar Salario
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
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function ControlHorasExtras() {
  const [fechaInicio, setFechaInicio] = useState<Date>(startOfMonth(new Date()))
  const [festivos, setFestivos] = useState<{ fecha: string; nombre: string; tipo: 'FIJO' | 'MOVIL' }[]>([])
  const [diasMes, setDiasMes] = useState<{ [key: string]: DiaData }>({})
  const [cargoSeleccionado, setCargoSeleccionado] = useState("BOMBERO")
  const [salarioMensual, setSalarioMensual] = useState(2054865)
  const [totalHorasMes, setTotalHorasMes] = useState(0)
  const [totalRecargos, setTotalRecargos] = useState(0)
  const [totalHorasExtras, setTotalHorasExtras] = useState(0)
  const [totalAPagar, setTotalAPagar] = useState(0)
  const [tiempoCompensatorio, setTiempoCompensatorio] = useState(0)
  const [desgloseCompensatorio, setDesgloseCompensatorio] = useState<DesgloseCompensatorio>({
    diurnaLV: { minutos: 0, valor: 0, porcentaje: 1.25 },
    nocturnaLV: { minutos: 0, valor: 0, porcentaje: 1.75 },
    diurnaFestivo: { minutos: 0, valor: 0, porcentaje: 2.25 },
    nocturnaFestivo: { minutos: 0, valor: 0, porcentaje: 2.75 }
  })
  const [calculoHoras, setCalculoHoras] = useState<CalculoHoras>({
    horasNormales: 0,
    horasNocturnasLV: 0,
    horasDiurnasFestivos: 0,
    horasNocturnasFestivos: 0,
    horasExtDiurnasLV: 0,
    horasExtNocturnasLV: 0,
    horasExtDiurnasFestivos: 0,
    horasExtNocturnasFestivos: 0,
  })
  
  // Nuevo estado para rastrear progreso diario
  const [progresoDiario, setProgresoDiario] = useState<{[key: string]: {
    minutosAcumuladosHastaEseDia: number,
    minutosExtrasAcumuladosHasta: number,
    valorExtrasAcumuladoHasta: number,
    topeHorasAlcanzado: boolean,
    tope50PorAlcanzado: boolean,
    desgloseDia: {
      recNocturno: number,
      recDomNoct: number, 
      recDomDia: number,
      extDia: number,
      extNoct: number,
      extDomDia: number,
      extDomNoct: number
    }
  }}>({})
  
  const [semanaActual, setSemanaActual] = useState(0)
  const [mostrarModalCargos, setMostrarModalCargos] = useState(false)
  const [mostrarModalAuth, setMostrarModalAuth] = useState(false)
  const [cargosState, setCargosState] = useState<{ id: number; nombre: string; salario: number }[]>([])
  const [accessLogs, setAccessLogs] = useState<Array<{ id: number; ip: string; fecha: string }>>([]);
  const [editando, setEditando] = useState<string | null>(null)
  const [focusedInput, setFocusedInput] = useState<{fecha: string, tipo: string} | null>(null)
  const inputCargoRef = useRef<HTMLInputElement>(null)
  const inputSalarioRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'registro' | 'calculos' | 'gestion-cargos'>('registro')
  const [autenticadoGestionCargos, setAutenticadoGestionCargos] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [topeFecha, setTopeFecha] = useState<string | null>(null)
  const [topeHora, setTopeHora] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [errorAuth, setErrorAuth] = useState("")
  const passwordRef = useRef<HTMLInputElement>(null)
  const [errorValidacion, setErrorValidacion] = useState<string>("")
  const [camposConError, setCamposConError] = useState<{[key: string]: string[]}>({})
  const [hasErrorsInCurrentWeek, setHasErrorsInCurrentWeek] = useState(false)
  const [advertenciasDiaDiferente, setAdvertenciasDiaDiferente] = useState<AdvertenciaDiaDiferente[]>([]);
  
  // Variables para la gestión de cargos
  const [editandoCargo, setEditandoCargo] = useState<string | null>(null);
  const [valorEditando, setValorEditando] = useState("");
  const [editandoSalario, setEditandoSalario] = useState("");
  const [nuevoCargo, setNuevoCargo] = useState("");
  const [nuevoSalario, setNuevoSalario] = useState("");

  // Variables para la gestión de festivos
  const [añoSeleccionado, setAñoSeleccionado] = useState<string>(new Date().getFullYear().toString());
  const [festivosPorAño, setFestivosPorAño] = useState<Array<{ id: number; fecha: string; nombre: string; tipo: 'FIJO' | 'MOVIL' }>>([]);
  const [nuevoFestivoFecha, setNuevoFestivoFecha] = useState<Date | null>(new Date());
  const [nuevoFestivoNombre, setNuevoFestivoNombre] = useState("");
  const [nuevoFestivoTipo, setNuevoFestivoTipo] = useState<'FIJO' | 'MOVIL'>('FIJO');
  const [errorFestivo, setErrorFestivo] = useState<string>("");
  const [showFestivoDatePicker, setShowFestivoDatePicker] = useState(false);

  useEffect(() => {
    console.log('Registering access...');
    fetch('/api/registrar-acceso', { method: 'POST' });
  }, []);

  const fetchCargos = useCallback(async () => {
    console.log('Attempting to fetch cargos...');
    try {
      const res = await fetch('/api/cargos');
      if (!res.ok) {
        console.error('Error fetching cargos: HTTP status', res.status);
        return; 
      }
      const data = await res.json();
      console.log('Fetched cargos data:', data);
      if (data && Array.isArray(data.cargos)) {
         setCargosState(data.cargos);
         console.log('Cargos state updated with:', data.cargos);
      } else {
         console.error('Fetched data is not an array or does not contain a cargos array:', data);
         setCargosState([]);
      }
    } catch (err) {
      console.error('Error al obtener cargos:', err);
      setCargosState([]);
    }
  }, []);

  useEffect(() => {
    console.log('useEffect in ControlHorasExtras triggered.');
    fetchCargos();
  }, [fetchCargos]);

  // Set default cargo when cargos are loaded
  useEffect(() => {
    if (Array.isArray(cargosState) && cargosState.length > 0) {
      // Check if current selected cargo exists in the list
      const currentCargo = cargosState.find(c => c.nombre === cargoSeleccionado);
      if (currentCargo) {
        setSalarioMensual(currentCargo.salario);
      } else {
        // Set first available cargo as default
        const firstCargo = cargosState[0];
        setCargoSeleccionado(firstCargo.nombre);
        setSalarioMensual(firstCargo.salario);
      }
    }
  }, [cargosState, cargoSeleccionado]);

  // Function to fetch access logs
  const fetchAccessLogs = useCallback(async () => {
    console.log('Attempting to fetch access logs...');
    try {
      const res = await fetch('/api/accesos');
      if (!res.ok) {
        console.error('Error fetching access logs: HTTP status', res.status);
        return;
      }
      const data = await res.json();
      console.log('Fetched access logs data:', data);
      if (data && Array.isArray(data.accesos)) {
        setAccessLogs(data.accesos);
        console.log('Access logs state updated with:', data.accesos);
      } else {
        console.error('Fetched data is not an array or does not contain an accesos array:', data);
        setAccessLogs([]); // Set to empty array if data is not as expected
      }
    } catch (err) {
      console.error('Error al obtener logs de acceso:', err);
    }
  }, [setAccessLogs]);

  // Fetch access logs when the component mounts
  useEffect(() => {
    console.log('useEffect for fetching access logs triggered.');
    fetchAccessLogs();
  }, [fetchAccessLogs]);
  
  // Funciones para la gestión de cargos
  const handleNuevoCargoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Nuevo Cargo input changed:', e.target.value);
    const value = e.target.value.toUpperCase()
    setNuevoCargo(value)
  };

  const handleNuevoSalarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Nuevo Salario input changed:', e.target.value);
    const value = e.target.value.replace(/[^0-9]/g, '')
    setNuevoSalario(value)
  };

  const handleGuardarEdicion = async (cargoId: number) => {
    try {
      if (!valorEditando.trim() || !editandoSalario) {
        setErrorValidacion('El nombre y salario son requeridos');
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
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error || 'Error al actualizar cargo';
        throw new Error(errorMessage);
      }

      setEditandoCargo(null);
      setValorEditando("");
      setEditandoSalario("");
      setErrorValidacion("");

      fetchCargos();

    } catch (err: any) {
      console.error('Error al actualizar cargo:', err);
      setErrorValidacion(err.message || 'Error al actualizar el cargo');
    }
  };

  const handleEliminarCargo = async (cargoId: number) => {
    try {
      const res = await fetch(`/api/cargos/${cargoId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error || 'Error al eliminar cargo';
        throw new Error(errorMessage);
      }

      setErrorValidacion("");

      fetchCargos();

    } catch (err: any) {
      console.error('Error al eliminar cargo:', err);
      setErrorValidacion(err.message || 'Error al eliminar el cargo');
    }
  };

  const handleSubmitCargo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!nuevoCargo.trim() || !nuevoSalario) {
        setErrorValidacion('El nombre y salario son requeridos');
        return;
      }

      const res = await fetch('/api/cargos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: nuevoCargo, 
          salario: Number(nuevoSalario) 
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error || 'Error al crear cargo';
        throw new Error(errorMessage);
      }

      setNuevoCargo("");
      setNuevoSalario("");
      setErrorValidacion("");
      fetchCargos();

    } catch (err: any) {
      console.error('Error al agregar cargo:', err);
      setErrorValidacion(err.message || 'Error al agregar el cargo');
    }
  };

  // Función para formatear minutos a horas:minutos con precisión de decimales
  const formatTime = (minutos: number) => {
    // Asegurarse de que los minutos sean un número válido
    if (isNaN(minutos) || minutos < 0) return "00:00"
    
    // Calcular horas y minutos
    const horas = Math.floor(minutos / 60)
    const mins = Math.floor(minutos % 60) // Usamos floor en lugar de round para no redondear
    
    // Formatear con padding de ceros
    return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Función para formatear hora en formato 24 horas
  const formatTime24Hour = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  }
  
  // Función para formatear tiempo compensatorio en formato "X horas Y minutos"
  const formatTiempoCompensatorio = (horas: number) => {
    const horasEnteras = Math.floor(horas)
    const minutos = Math.floor((horas - horasEnteras) * 60)
    
    if (minutos === 0) {
      return horasEnteras === 1 ? `${horasEnteras} hora` : `${horasEnteras} horas`
    } else if (horasEnteras === 0) {
      return `${minutos} minutos`
    } else if (horasEnteras === 1) {
      return `${horasEnteras} hora ${minutos} minutos`
    } else {
      return `${horasEnteras} horas ${minutos} minutos`
    }
  }

  // Calcular las semanas del mes
  const semanasDelMes = (() => {
    const semanas = []
    const primerDia = startOfMonth(fechaInicio)
    const ultimoDia = endOfMonth(fechaInicio)
    let inicio = startOfWeek(primerDia, { weekStartsOn: 1 })
    while (inicio <= ultimoDia) {
      const fin = endOfWeek(inicio, { weekStartsOn: 1 })
      semanas.push({ inicio: new Date(inicio), fin: new Date(fin) })
      inicio = addDays(fin, 1)
    }
    return semanas
  })()

  // Verificar si una fecha es festivo
  const esDiaFestivo = (fecha: Date): boolean => {
    const fechaStr = format(fecha, "yyyy-MM-dd")
    const esDomingo = fecha.getDay() === 0
    return esDomingo || festivos.some(f => f.fecha === fechaStr);
  }

  // Obtener los días de la semana actual
  const diasSemanaActual = (() => {
    const semana = semanasDelMes[semanaActual]
    const dias: Date[] = []
    if (!semana) {
      console.log('Semana object is undefined, returning empty days array.'); // Log si semana es undefined
      return dias; // Retornar array vacío si semana no está definida
    }
    console.log(`Generating days for week starting: ${semana.inicio}`); // Log inicio de semana
    for (let i = 0; i < 7; i++) {
      const fecha = addDays(semana.inicio, i)
      dias.push(fecha)
      const fechaStr = format(fecha, "yyyy-MM-dd");
      const isHoliday = esDiaFestivo(fecha);
      console.log(`Date: ${fechaStr}, isHoliday: ${isHoliday}`); // Log si el día se identifica como festivo
    }
    return dias
  })()

  // Inicializar los días del mes
  useEffect(() => {
    const nuevoDiasMes: { [key: string]: DiaData } = {}
    const primerDia = startOfMonth(fechaInicio)
    const ultimoDia = endOfMonth(fechaInicio)
    const diasEnMes = getDaysInMonth(fechaInicio)

    for (let i = 0; i < diasEnMes; i++) {
      const fecha = addDays(primerDia, i)
      const fechaStr = format(fecha, "yyyy-MM-dd")
      const isSunday = fecha.getDay() === 0;
      const isHoliday = festivos.some(f => f.fecha === fechaStr);

      nuevoDiasMes[fechaStr] = {
        entrada1: "",
        salida1: "",
        entrada2: "",
        salida2: "",
        total: "",
        isHoliday: isHoliday,
        isSunday: isSunday,
      }
    }

    setDiasMes(nuevoDiasMes)
  }, [fechaInicio, festivos])

  // Manejar cambio de cargo
  const handleCambiarCargo = (valor: string) => {
    if (valor === 'default') return;
    setCargoSeleccionado(valor);
    const cargo = cargosState.find((c) => c.nombre === valor);
    if (cargo) {
      setSalarioMensual(cargo.salario);
    }
  }

  // Manejar cambio de entrada/salida para ambos turnos
  const handleCambioHora = (fecha: string, tipo: "entrada1" | "salida1" | "entrada2" | "salida2", valor: string) => {
    // Crear una copia del estado actual
    const nuevosDias = { ...diasMes }
    
    // Si no existe el día, crearlo
    if (!nuevosDias[fecha]) {
      nuevosDias[fecha] = {
        entrada1: "",
        salida1: "",
        entrada2: "",
        salida2: "",
        total: "",
        isHoliday: esDiaFestivo(parse(fecha, 'yyyy-MM-dd', new Date())),
        isSunday: format(parse(fecha, 'yyyy-MM-dd', new Date()), 'EEEE').toLowerCase() === 'sunday'
      }
    }
    
    // Actualizar el valor correspondiente
    nuevosDias[fecha] = {
      ...nuevosDias[fecha],
      [tipo]: valor
    }
    
    // Calcular total de horas para el día
    if (
      nuevosDias[fecha].entrada1 &&
      nuevosDias[fecha].salida1
    ) {
      try {
        let totalMinutos = 0
        
        // Calcular minutos del primer turno
        const entrada1 = formatTime24Hour(nuevosDias[fecha].entrada1)
        const salida1 = formatTime24Hour(nuevosDias[fecha].salida1)
        
        // Verificar si la entrada es mayor que la salida (turno nocturno)
        if (entrada1 <= salida1) {
          // Turno normal (mismo día)
          const horasEntrada1 = parseInt(entrada1.split(':')[0])
          const minutosEntrada1 = parseInt(entrada1.split(':')[1])
          const horasSalida1 = parseInt(salida1.split(':')[0])
          const minutosSalida1 = parseInt(salida1.split(':')[1])
          
          const minutosTotales1 = (horasSalida1 * 60 + minutosSalida1) - (horasEntrada1 * 60 + minutosEntrada1)
          totalMinutos += minutosTotales1
        } else {
          // Turno nocturno (pasa al día siguiente)
          const horasEntrada1 = parseInt(entrada1.split(':')[0])
          const minutosEntrada1 = parseInt(entrada1.split(':')[1])
          const horasSalida1 = parseInt(salida1.split(':')[0]) + 24 // Añadir 24 horas
          const minutosSalida1 = parseInt(salida1.split(':')[1])
          
          const minutosTotales1 = (horasSalida1 * 60 + minutosSalida1) - (horasEntrada1 * 60 + minutosEntrada1)
          totalMinutos += minutosTotales1
        }
        
        // Si hay segundo turno, calcular minutos
        if (nuevosDias[fecha].entrada2 && nuevosDias[fecha].salida2) {
          const entrada2 = formatTime24Hour(nuevosDias[fecha].entrada2)
          const salida2 = formatTime24Hour(nuevosDias[fecha].salida2)
          
          // Verificar si la entrada es mayor que la salida (turno nocturno)
          if (entrada2 <= salida2) {
            // Turno normal (mismo día)
            const horasEntrada2 = parseInt(entrada2.split(':')[0])
            const minutosEntrada2 = parseInt(entrada2.split(':')[1])
            const horasSalida2 = parseInt(salida2.split(':')[0])
            const minutosSalida2 = parseInt(salida2.split(':')[1])
            
            const minutosTotales2 = (horasSalida2 * 60 + minutosSalida2) - (horasEntrada2 * 60 + minutosEntrada2)
            totalMinutos += minutosTotales2
          } else {
            // Turno nocturno (pasa al día siguiente)
            const horasEntrada2 = parseInt(entrada2.split(':')[0])
            const minutosEntrada2 = parseInt(entrada2.split(':')[1])
            const horasSalida2 = parseInt(salida2.split(':')[0]) + 24 // Añadir 24 horas
            const minutosSalida2 = parseInt(salida2.split(':')[1])
            
            const minutosTotales2 = (horasSalida2 * 60 + minutosSalida2) - (horasEntrada2 * 60 + minutosEntrada2)
            totalMinutos += minutosTotales2
          }
        }
        
        // Formatear el total de horas
        const horas = Math.floor(totalMinutos / 60)
        const minutos = totalMinutos % 60
        nuevosDias[fecha].total = `${horas}:${minutos.toString().padStart(2, '0')}`
        
      } catch (error) {
        console.error("Error al calcular horas:", error)
        nuevosDias[fecha].total = "Error"
      }
    } else {
      nuevosDias[fecha].total = ""
    }
    
    // Actualizar el estado
    setDiasMes(nuevosDias)
    
    // Verificar advertencias de día diferente
    verificarAdvertenciasDiaDiferente(fecha, nuevosDias[fecha])
  }

  // Manejar cambio de fecha
  const handleCambioFecha = (fecha: string) => {
    const nuevaFecha = new Date(fecha)
    setFechaInicio(startOfMonth(nuevaFecha))
  }

  // Calcular todas las horas y recargos
  const calcularHorasYRecargos = () => {
    let hayDatosValidos = false
    const erroresPorFecha: {[key: string]: string[]} = {}

    Object.entries(diasMes).forEach(([fecha, dia]) => {
      const erroresFechaActual: string[] = []

      if ((dia.entrada1 && dia.salida1) || (dia.entrada2 && dia.salida2)) {
        hayDatosValidos = true
      }

      // Validación de turnos incompletos
      if (dia.entrada1 && !dia.salida1) {
        erroresFechaActual.push(`Turno 1: Salida incompleta`)
      }
      if (!dia.entrada1 && dia.salida1) {
        erroresFechaActual.push(`Turno 1: Entrada incompleta`)
      }
      if (dia.entrada2 && !dia.salida2) {
        erroresFechaActual.push(`Turno 2: Salida incompleta`)
      }
      if (!dia.entrada2 && dia.salida2) {
        erroresFechaActual.push(`Turno 2: Entrada incompleta`)
      }

      // Validación de solapamiento y duplicidad
      const e1 = dia.entrada1
      const s1 = dia.salida1
      const e2 = dia.entrada2
      const s2 = dia.salida2

      if (esHoraValida(e1) && esHoraValida(s1) && esHoraValida(e2) && esHoraValida(s2)) {
        const horaEntrada1 = parse(e1, "HH:mm", new Date())
        let horaSalida1 = parse(s1, "HH:mm", new Date())
        const horaEntrada2 = parse(e2, "HH:mm", new Date())
        let horaSalida2 = parse(s2, "HH:mm", new Date())

        // Ajustar horaSalida si cruza la medianoche
        if (horaSalida1 < horaEntrada1) horaSalida1 = addDays(horaSalida1, 1)
        if (horaSalida2 < horaEntrada2) horaSalida2 = addDays(horaSalida2, 1)

        // Validar que Entrada < Salida para cada turno individualmente
        if (isAfter(horaEntrada1, horaSalida1)) erroresFechaActual.push('Turno 1: Entrada después de Salida')
        if (isAfter(horaEntrada2, horaSalida2)) erroresFechaActual.push('Turno 2: Entrada después de Salida')

        // Comprobar solapamiento: (e1 < s2 && e2 < s1) siempre que s1 !== e2
        const overlap = (isBefore(horaEntrada1, horaSalida2) && isBefore(horaEntrada2, horaSalida1))

        if (overlap && !(s1 === e2)) {
          erroresFechaActual.push('Franja horaria duplicada')
        }

        // Validar que no haya duplicidad dentro del mismo turno (e.g., Entrada1 no debe ser igual a Salida1)
        if ((e1 === s1 && e1 !== '') || (e2 === s2 && e2 !== '')) {
          erroresFechaActual.push('Entrada y Salida del mismo turno son idénticas')
        }
      }

      if (erroresFechaActual.length > 0) {
        erroresPorFecha[fecha] = erroresFechaActual.filter((value, index, self) => self.indexOf(value) === index)
      }
    })

    const allErrors: string[] = []
    Object.entries(erroresPorFecha).forEach(([fecha, errores]) => {
      const fechaFormateada = format(parseISO(fecha), 'dd/MM/yyyy')
      errores.forEach(errorMsg => {
        allErrors.push(`${fechaFormateada} (${errorMsg})`)
      })
    })

    if (allErrors.length > 0) {
      setErrorValidacion("Se encontraron errores en las siguientes fechas: " + allErrors.join("; "))
      return
    }

    if (!hayDatosValidos) {
      setErrorValidacion("Debe ingresar al menos un par de hora de entrada y salida para realizar el cálculo.")
      return
    }

    setErrorValidacion("")
    let totalMinutos = 0
    let recNocturno = 0 // L-S (18:00-06:00) hasta 190h
    let recDomNoct = 0  // Dom/fest (18:00-06:00) hasta 190h
    let recDomDia = 0   // Dom/fest (06:00-18:00) hasta 190h
    let extDia = 0      // L-S (06:00-18:00) desde 191h
    let extNoct = 0     // L-S (18:00-06:00) desde 191h
    let extDomDia = 0   // Dom/fest (06:00-18:00) desde 191h
    let extDomNoct = 0  // Dom/fest (18:00-06:00) desde 191h
    let topeAlcanzado = false
    let topeFechaLocal: string | null = null
    let topeHoraLocal: string | null = null
    // Variables para almacenar en qué tipo de hora extra se alcanzó el tope
    let topeAlcanzadoEnNocturnaFestivo = false
    let topeAlcanzadoEnNocturnaLS = false
    let minutosTope = 0
    const valorHora = salarioMensual / 190
    const valorMinuto = valorHora / 60
    const topeMaximo = salarioMensual * 0.5
    let dineroExtrasAcumulado = 0
    let excedente = 0
    let minutosCompensar = 0

    // Definir el tipo para los tipos de horas extras
    type TipoHoraExtra = 'diurnaLV' | 'nocturnaLV' | 'diurnaFestivo' | 'nocturnaFestivo';
    
    // Mapa para contar cuántos minutos de cada tipo de hora extra se han registrado
    let minutosExtraPorTipo: Record<TipoHoraExtra, number> = {
      'diurnaLV': 0,
      'nocturnaLV': 0,
      'diurnaFestivo': 0,
      'nocturnaFestivo': 0
    };
    
    // Mapa para contar minutos compensatorios por tipo (después del tope)
    let minutosCompensatoriosPorTipo: Record<TipoHoraExtra, number> = {
      'diurnaLV': 0,
      'nocturnaLV': 0,
      'diurnaFestivo': 0,
      'nocturnaFestivo': 0
    };
    
    // Nuevo objeto para rastrear progreso diario
    let progresoTemporalDiario: {[key: string]: {
      minutosAcumuladosHastaEseDia: number,
      minutosExtrasAcumuladosHasta: number,
      valorExtrasAcumuladoHasta: number,
      topeHorasAlcanzado: boolean,
      tope50PorAlcanzado: boolean,
      desgloseDia: {
        recNocturno: number,
        recDomNoct: number, 
        recDomDia: number,
        extDia: number,
        extNoct: number,
        extDomDia: number,
        extDomNoct: number
      }
    }} = {}
    
    // Procesar cada día con datos
    const fechasOrdenadas = Object.keys(diasMes).sort() // Procesar en orden cronológico
    
    fechasOrdenadas.forEach((fecha) => {
      const dia = diasMes[fecha]
      if (dia.total === "Error") return
      
      const fechaDate = parse(fecha, "yyyy-MM-dd", new Date())
      const esFestivo = dia.isHoliday || dia.isSunday; // Considerar domingos como festivos para cálculo
      
      // Variables para contar el desglose de este día específico
      let recNocturnoEseDia = 0
      let recDomNoctEseDia = 0
      let recDomDiaEseDia = 0
      let extDiaEseDia = 0
      let extNoctEseDia = 0
      let extDomDiaEseDia = 0
      let extDomNoctEseDia = 0
      let minutosExtrasAcumuladosAntes = dineroExtrasAcumulado
      
      // Guardar estado al inicio del día
      const minutosAcumuladosAntesDelDia = totalMinutos
      const topeHorasAlcanzadoAntesDelDia = totalMinutos >= 190 * 60
      const tope50PorAlcanzadoAntesDelDia = topeAlcanzado
      
      // Procesar ambos turnos
      const turnos = [
        { entrada: dia.entrada1, salida: dia.salida1 },
        { entrada: dia.entrada2, salida: dia.salida2 },
      ]
      
      turnos.forEach(({ entrada, salida }) => {
        if (!entrada || !salida) return
        let horaEntrada = parse(entrada, "HH:mm", fechaDate)
        let horaSalida = parse(salida, "HH:mm", fechaDate)
        if (horaSalida < horaEntrada) horaSalida = addDays(horaSalida, 1)
        let horaActual = new Date(horaEntrada)
        
        while (horaActual < horaSalida) {
          const horaFin = new Date(horaActual)
          horaFin.setMinutes(horaFin.getMinutes() + 1)
          const h = horaActual.getHours()
          const esNocturno = h >= 18 || h < 6
          const esDiurno = h >= 6 && h < 18
          totalMinutos++

          if (totalMinutos <= 190 * 60) {
            // RECARGOS
            if (!esFestivo && esNocturno) {
              recNocturno++ // L-S (18:00-06:00) 35%
              recNocturnoEseDia++
            }
            if (esFestivo && esNocturno) {
              recDomNoct++   // Dom/fest (18:00-06:00) 235%
              recDomNoctEseDia++
            }
            if (esFestivo && esDiurno) {
              recDomDia++      // Dom/fest (06:00-18:00) 200%
              recDomDiaEseDia++
            }
          } else {
            // HORAS EXTRAS
            let valorEsteMinuto = 0
            let tipoHoraActual: TipoHoraExtra | undefined = undefined;
            
            // Solo un tipo de hora puede aplicar para cada minuto
            if (!esFestivo && esDiurno) { 
              if (!topeAlcanzado) {
                extDia++
                extDiaEseDia++
              }
              valorEsteMinuto = valorMinuto * 1.25; // L-S (06:00-18:00) 125%
              tipoHoraActual = 'diurnaLV';
              if (!topeAlcanzado) minutosExtraPorTipo['diurnaLV']++;
            }
            else if (!esFestivo && esNocturno) { 
              if (!topeAlcanzado) {
                extNoct++
                extNoctEseDia++
              }
              valorEsteMinuto = valorMinuto * 1.75; // L-S (18:00-06:00) 175%
              tipoHoraActual = 'nocturnaLV';
              if (!topeAlcanzado) minutosExtraPorTipo['nocturnaLV']++;
            }
            else if (esFestivo && esDiurno) { 
              if (!topeAlcanzado) {
                extDomDia++
                extDomDiaEseDia++
              }
              valorEsteMinuto = valorMinuto * 2.25; // Dom/fest (06:00-18:00) 225%
              tipoHoraActual = 'diurnaFestivo';
              if (!topeAlcanzado) minutosExtraPorTipo['diurnaFestivo']++;
            }
            else if (esFestivo && esNocturno) { 
              if (!topeAlcanzado) {
                extDomNoct++
                extDomNoctEseDia++
              }
              valorEsteMinuto = valorMinuto * 2.75; // Dom/fest (18:00-06:00) 275%
              tipoHoraActual = 'nocturnaFestivo';
              if (!topeAlcanzado) minutosExtraPorTipo['nocturnaFestivo']++;
            }
            
            if (dineroExtrasAcumulado < topeMaximo) {
              // Si este minuto hace que se supere el tope
              if (dineroExtrasAcumulado + valorEsteMinuto > topeMaximo && !topeAlcanzado) {
                topeAlcanzado = true
                topeFechaLocal = format(horaActual, 'yyyy-MM-dd')
                topeHoraLocal = format(horaActual, 'HH:mm')
                
                // Calcular qué fracción de este minuto está dentro del tope
                const fraccionDentroDelTope = (topeMaximo - dineroExtrasAcumulado) / valorEsteMinuto
                
                // Actualizar el valor acumulado exactamente al tope
                dineroExtrasAcumulado = topeMaximo
                
                // Ajustar los minutos de este tipo de hora extra para reflejar el punto exacto donde se alcanzó el tope
                if (tipoHoraActual) {
                  // En lugar de restar la fracción, añadimos solo la fracción que está dentro del tope
                  // Esto hace que el conteo de minutos se detenga exactamente cuando se alcanza el tope
                  if (tipoHoraActual === 'diurnaLV') {
                    // Ajustamos para incluir solo la fracción dentro del tope
                    extDia = extDia - 1 + fraccionDentroDelTope;
                    minutosExtraPorTipo['diurnaLV'] = minutosExtraPorTipo['diurnaLV'] - 1 + fraccionDentroDelTope;
                  } else if (tipoHoraActual === 'nocturnaLV') {
                    extNoct = extNoct - 1 + fraccionDentroDelTope;
                    minutosExtraPorTipo['nocturnaLV'] = minutosExtraPorTipo['nocturnaLV'] - 1 + fraccionDentroDelTope;
                  } else if (tipoHoraActual === 'diurnaFestivo') {
                    extDomDia = extDomDia - 1 + fraccionDentroDelTope;
                    minutosExtraPorTipo['diurnaFestivo'] = minutosExtraPorTipo['diurnaFestivo'] - 1 + fraccionDentroDelTope;
                  } else if (tipoHoraActual === 'nocturnaFestivo') {
                    extDomNoct = extDomNoct - 1 + fraccionDentroDelTope;
                    minutosExtraPorTipo['nocturnaFestivo'] = minutosExtraPorTipo['nocturnaFestivo'] - 1 + fraccionDentroDelTope;
                  }
                  
                  // Registrar la fracción del minuto que excede como compensatorio
                  minutosCompensatoriosPorTipo[tipoHoraActual] += (1 - fraccionDentroDelTope)
                  minutosCompensar += (1 - fraccionDentroDelTope)
                }
              } else {
                // Si no se supera el tope, sumar normalmente
                dineroExtrasAcumulado += valorEsteMinuto
              }
            } else {
              // Excedente para compensatorio (minuto completo)
              minutosCompensar++
              // Registrar el tipo de hora extra que se está compensando
              if (tipoHoraActual) {
                minutosCompensatoriosPorTipo[tipoHoraActual]++;
                console.log(`Minuto compensatorio registrado: ${tipoHoraActual}, total: ${minutosCompensatoriosPorTipo[tipoHoraActual]}`)
              }
            }
          }
          horaActual = horaFin
        }
      })
      
      // Guardar el progreso diario al final de cada día
      progresoTemporalDiario[fecha] = {
        minutosAcumuladosHastaEseDia: totalMinutos,
        minutosExtrasAcumuladosHasta: Math.max(0, totalMinutos - 190 * 60),
        valorExtrasAcumuladoHasta: dineroExtrasAcumulado,
        topeHorasAlcanzado: totalMinutos >= 190 * 60,
        tope50PorAlcanzado: topeAlcanzado,
        desgloseDia: {
          recNocturno: recNocturnoEseDia,
          recDomNoct: recDomNoctEseDia,
          recDomDia: recDomDiaEseDia,
          extDia: extDiaEseDia,
          extNoct: extNoctEseDia,
          extDomDia: extDomDiaEseDia,
          extDomNoct: extDomNoctEseDia
        }
      }
    })

    // Actualizar el estado del progreso diario
    setProgresoDiario(progresoTemporalDiario)

    // Calcular valores monetarios
    const valorRecargoNocturnoLV = valorMinuto * recNocturno * 0.35
    const valorRecargoNocturnoFestivo = valorMinuto * recDomNoct * 2.35
    const valorRecargoDiurnoFestivo = valorMinuto * recDomDia * 2.0
    
    // Calcular valores brutos de extras (sin ajustar al tope)
    const valorBrutoExtraDiurnaLV = valorMinuto * extDia * 1.25
    const valorBrutoExtraNocturnaLV = valorMinuto * extNoct * 1.75
    const valorBrutoExtraDiurnaFestivo = valorMinuto * extDomDia * 2.25
    const valorBrutoExtraNocturnaFestivo = valorMinuto * extDomNoct * 2.75
    
    const totalRecargosCalculado = valorRecargoNocturnoLV + valorRecargoNocturnoFestivo + valorRecargoDiurnoFestivo
    const totalExtrasCalculado = valorBrutoExtraDiurnaLV + valorBrutoExtraNocturnaLV + valorBrutoExtraDiurnaFestivo + valorBrutoExtraNocturnaFestivo

    // Debug: Imprimir valores para verificar el cálculo del tope
    console.log('=== DEBUG TOPE DEL 50% ===')
    console.log('Salario mensual:', salarioMensual)
    console.log('Tope máximo (50%):', topeMaximo)
    console.log('Total extras calculado:', totalExtrasCalculado)
    console.log('¿Se supera el tope?', totalExtrasCalculado > topeMaximo || Math.abs(totalExtrasCalculado - topeMaximo) < 0.01)
    console.log('Diferencia:', totalExtrasCalculado - topeMaximo)
    console.log('Minutos compensar acumulados:', minutosCompensar)

    // Tope: solo aplica a extras
    let pagoExtras = totalExtrasCalculado
    let tiempoCompensatorioMinutos = 0
    let excedenteDinero = 0
    
    // Valores ajustados de extras (después de aplicar el tope)
    let valorExtraDiurnaLV = valorBrutoExtraDiurnaLV
    let valorExtraNocturnaLV = valorBrutoExtraNocturnaLV
    let valorExtraDiurnaFestivo = valorBrutoExtraDiurnaFestivo
    let valorExtraNocturnaFestivo = valorBrutoExtraNocturnaFestivo
    
    // Variables para el desglose del tiempo compensatorio
    let compDiurnaLVMinutos = 0
    let compNocturnaLVMinutos = 0
    let compDiurnaFestivoMinutos = 0
    let compNocturnaFestivoMinutos = 0
    
    // Usar tolerancia para errores de punto flotante
    if (totalExtrasCalculado > topeMaximo || Math.abs(totalExtrasCalculado - topeMaximo) < 0.01) {
      pagoExtras = topeMaximo
      excedenteDinero = totalExtrasCalculado - topeMaximo
      
      // Ajustar los valores de extras para que sumen exactamente el tope
      if (totalExtrasCalculado > 0) {
        // Factor de ajuste para distribuir el tope proporcionalmente
        const factorAjuste = topeMaximo / totalExtrasCalculado
        
        // Ajustar cada tipo de extra proporcionalmente
        valorExtraDiurnaLV = valorBrutoExtraDiurnaLV * factorAjuste
        valorExtraNocturnaLV = valorBrutoExtraNocturnaLV * factorAjuste
        valorExtraDiurnaFestivo = valorBrutoExtraDiurnaFestivo * factorAjuste
        valorExtraNocturnaFestivo = valorBrutoExtraNocturnaFestivo * factorAjuste
      }
      
      // Usar los minutos compensatorios por tipo registrados después del tope
      compDiurnaLVMinutos = minutosCompensatoriosPorTipo.diurnaLV;
      compNocturnaLVMinutos = minutosCompensatoriosPorTipo.nocturnaLV;
      compDiurnaFestivoMinutos = minutosCompensatoriosPorTipo.diurnaFestivo;
      compNocturnaFestivoMinutos = minutosCompensatoriosPorTipo.nocturnaFestivo;
      
      console.log('=== MINUTOS COMPENSATORIOS POR TIPO ===')
      console.log('Diurna L-V:', compDiurnaLVMinutos)
      console.log('Nocturna L-V:', compNocturnaLVMinutos)
      console.log('Diurna Festivo:', compDiurnaFestivoMinutos)
      console.log('Nocturna Festivo:', compNocturnaFestivoMinutos)
      
      // Verificar que la suma sea igual a minutosCompensar
      const sumaMinutos = compDiurnaLVMinutos + compNocturnaLVMinutos + compDiurnaFestivoMinutos + compNocturnaFestivoMinutos;
      
      // Si hay alguna discrepancia (por redondeo o cálculo), ajustar
      if (sumaMinutos !== minutosCompensar) {
        const diferencia = minutosCompensar - sumaMinutos;
        
        // Determinar qué tipo de hora compensatoria tiene más minutos para ajustar
        if (compDiurnaLVMinutos > 0) {
          compDiurnaLVMinutos += diferencia;
        } else if (compNocturnaLVMinutos > 0) {
          compNocturnaLVMinutos += diferencia;
        } else if (compDiurnaFestivoMinutos > 0) {
          compDiurnaFestivoMinutos += diferencia;
        } else if (compNocturnaFestivoMinutos > 0) {
          compNocturnaFestivoMinutos += diferencia;
        } else {
          // Si no hay ningún tipo con minutos, asignar al tipo diurnaLV por defecto
          compDiurnaLVMinutos += diferencia;
        }
      }
      
      // Calcular valores monetarios para cada tipo
      const valorCompDiurnaLV = valorMinuto * compDiurnaLVMinutos * 1.25
      const valorCompNocturnaLV = valorMinuto * compNocturnaLVMinutos * 1.75
      const valorCompDiurnaFestivo = valorMinuto * compDiurnaFestivoMinutos * 2.25
      const valorCompNocturnaFestivo = valorMinuto * compNocturnaFestivoMinutos * 2.75
      
      // Actualizar desglose
      setDesgloseCompensatorio({
        diurnaLV: { minutos: compDiurnaLVMinutos, valor: valorCompDiurnaLV, porcentaje: 1.25 },
        nocturnaLV: { minutos: compNocturnaLVMinutos, valor: valorCompNocturnaLV, porcentaje: 1.75 },
        diurnaFestivo: { minutos: compDiurnaFestivoMinutos, valor: valorCompDiurnaFestivo, porcentaje: 2.25 },
        nocturnaFestivo: { minutos: compNocturnaFestivoMinutos, valor: valorCompNocturnaFestivo, porcentaje: 2.75 }
      })
      
      // Convertir el excedente a tiempo compensatorio (en minutos exactos)
      tiempoCompensatorioMinutos = compDiurnaLVMinutos + compNocturnaLVMinutos + compDiurnaFestivoMinutos + compNocturnaFestivoMinutos
      
      // Asegurarnos de que el tiempo compensatorio sea mayor que cero si se superó el tope
      if (tiempoCompensatorioMinutos === 0 && excedenteDinero > 0) {
        // Si no hay minutos compensatorios registrados pero hay excedente de dinero,
        // calculamos los minutos compensatorios basados en el excedente
        tiempoCompensatorioMinutos = Math.round(excedenteDinero / valorMinuto);
        
        // Distribuir estos minutos en alguna categoría (por ejemplo, diurnaLV)
        compDiurnaLVMinutos = tiempoCompensatorioMinutos;
        
        // Recalcular el valor
        const valorCompDiurnaLV = valorMinuto * compDiurnaLVMinutos * 1.25;
        
        // Actualizar el desglose nuevamente
        setDesgloseCompensatorio({
          diurnaLV: { minutos: compDiurnaLVMinutos, valor: valorCompDiurnaLV, porcentaje: 1.25 },
          nocturnaLV: { minutos: 0, valor: 0, porcentaje: 1.75 },
          diurnaFestivo: { minutos: 0, valor: 0, porcentaje: 2.25 },
          nocturnaFestivo: { minutos: 0, valor: 0, porcentaje: 2.75 }
        });
      }
    } else {
      // Reiniciar desglose si no hay tiempo compensatorio
      setDesgloseCompensatorio({
        diurnaLV: { minutos: 0, valor: 0, porcentaje: 1.25 },
        nocturnaLV: { minutos: 0, valor: 0, porcentaje: 1.75 },
        diurnaFestivo: { minutos: 0, valor: 0, porcentaje: 2.25 },
        nocturnaFestivo: { minutos: 0, valor: 0, porcentaje: 2.75 }
      })
    }

    setTotalHorasMes(totalMinutos)
    setTotalRecargos(totalRecargosCalculado)
    setTotalHorasExtras(pagoExtras)
    setTotalAPagar(totalRecargosCalculado + pagoExtras)
    setTiempoCompensatorio(tiempoCompensatorioMinutos / 60) // Guardamos en horas con decimales
    
    // Imprimir información de depuración para verificar los valores
    console.log('Tiempo compensatorio en minutos:', tiempoCompensatorioMinutos)
    console.log('Tiempo compensatorio en horas:', tiempoCompensatorioMinutos / 60)
    console.log('Desglose compensatorio:', {
      diurnaLV: desgloseCompensatorio.diurnaLV,
      nocturnaLV: desgloseCompensatorio.nocturnaLV,
      diurnaFestivo: desgloseCompensatorio.diurnaFestivo,
      nocturnaFestivo: desgloseCompensatorio.nocturnaFestivo
    })
    
    setTopeFecha(topeFechaLocal)
    setTopeHora(topeHoraLocal)
    // Actualizamos las horas calculadas con los valores exactos (incluyendo decimales)
    // para reflejar el punto exacto donde se alcanza el tope
    setCalculoHoras({
      horasNormales: Math.min(totalMinutos, 190 * 60) - recNocturno - recDomNoct - recDomDia,
      horasNocturnasLV: recNocturno,
      horasDiurnasFestivos: recDomDia,
      horasNocturnasFestivos: recDomNoct,
      horasExtDiurnasLV: extDia,
      horasExtNocturnasLV: extNoct,
      horasExtDiurnasFestivos: extDomDia,
      horasExtNocturnasFestivos: extDomNoct,
    })

    // Dentro de la función calcularHorasYRecargos, justo antes del return
    const camposError: {[key: string]: string[]} = {}
    Object.entries(diasMes).forEach(([fecha, dia]) => {
      const errores: string[] = []
      if (dia.entrada1 && !dia.salida1) {
        errores.push('salida1')
      }
      if (!dia.entrada1 && dia.salida1) {
        errores.push('entrada1')
      }
      if (dia.entrada2 && !dia.salida2) {
        errores.push('salida2')
      }
      if (!dia.entrada2 && dia.salida2) {
        errores.push('entrada2')
      }
      if (errores.length > 0) {
        camposError[fecha] = errores
      }
    })
    setCamposConError(camposError)
  }

  // Navegar al mes anterior
  const irMesAnterior = () => {
    const nuevoMes = new Date(fechaInicio)
    nuevoMes.setMonth(nuevoMes.getMonth() - 1)
    setFechaInicio(startOfMonth(nuevoMes))
  }

  // Navegar al mes siguiente
  const irMesSiguiente = () => {
    const nuevoMes = new Date(fechaInicio)
    nuevoMes.setMonth(nuevoMes.getMonth() + 1)
    setFechaInicio(startOfMonth(nuevoMes))
  }

  // Limpiar todos los datos
  const limpiarTodo = () => {
    setDiasMes({})
    calcularHorasYRecargos()
  }

  // Función para copiar horas al día siguiente
  const copiarAlDiaSiguiente = (fechaStr: string) => {
    const fechaActual = parse(fechaStr, 'yyyy-MM-dd', new Date())
    const fechaSiguiente = format(addDays(fechaActual, 1), 'yyyy-MM-dd')
    
    // Solo copiar si el día actual tiene datos y el día siguiente es del mismo mes
    if (diasMes[fechaStr] && isSameMonth(parse(fechaSiguiente, 'yyyy-MM-dd', new Date()), fechaInicio)) {
      const diaActual = diasMes[fechaStr]
      
      // Crear copia del estado actual
      const nuevosDias = { ...diasMes }
      
      // Copiar datos al día siguiente
      nuevosDias[fechaSiguiente] = {
        ...nuevosDias[fechaSiguiente] || {},
        entrada1: diaActual.entrada1,
        salida1: diaActual.salida1,
        entrada2: diaActual.entrada2,
        salida2: diaActual.salida2,
        total: diaActual.total,
        isHoliday: nuevosDias[fechaSiguiente]?.isHoliday || false,
        isSunday: nuevosDias[fechaSiguiente]?.isSunday || false
      }
      
      // Actualizar estado
      setDiasMes(nuevosDias)
      
      // Verificar advertencias para el día siguiente
      verificarAdvertenciasDiaDiferente(fechaSiguiente, nuevosDias[fechaSiguiente])
    }
  }

  // Función para copiar horas al resto de la semana
  const copiarAlRestoSemana = (fechaStr: string) => {
    const fechaActual = parse(fechaStr, 'yyyy-MM-dd', new Date())
    const diaActual = diasMes[fechaStr]
    
    // Solo proceder si el día actual tiene datos
    if (!diaActual) return
    
    // Crear copia del estado actual
    const nuevosDias = { ...diasMes }
    
    // Encontrar el índice del día actual en la semana actual
    const indexDiaActual = diasSemanaActual.findIndex(dia => 
      format(dia, 'yyyy-MM-dd') === fechaStr
    )
    
    // Si no se encuentra el día o es el último día de la semana, salir
    if (indexDiaActual === -1 || indexDiaActual === diasSemanaActual.length - 1) return
    
    // Copiar a los días restantes de la semana
    for (let i = indexDiaActual + 1; i < diasSemanaActual.length; i++) {
      const fechaDestino = format(diasSemanaActual[i], 'yyyy-MM-dd')
      
      // Solo copiar si el día destino es del mismo mes
      if (isSameMonth(diasSemanaActual[i], fechaInicio)) {
        nuevosDias[fechaDestino] = {
          ...nuevosDias[fechaDestino] || {},
          entrada1: diaActual.entrada1,
          salida1: diaActual.salida1,
          entrada2: diaActual.entrada2,
          salida2: diaActual.salida2,
          total: diaActual.total,
          isHoliday: nuevosDias[fechaDestino]?.isHoliday || false,
          isSunday: nuevosDias[fechaDestino]?.isSunday || false
        }
        
        // Verificar advertencias para cada día copiado
        verificarAdvertenciasDiaDiferente(fechaDestino, nuevosDias[fechaDestino])
      }
    }
    
    // Actualizar estado
    setDiasMes(nuevosDias)
  }

  // Función para copiar horas al resto del mes
  const copiarAlRestoMes = (fechaStr: string) => {
    const fechaActual = parse(fechaStr, 'yyyy-MM-dd', new Date())
    const diaActual = diasMes[fechaStr]
    
    // Solo proceder si el día actual tiene datos
    if (!diaActual) return
    
    // Crear copia del estado actual
    const nuevosDias = { ...diasMes }
    
    // Obtener todos los días del mes
    const ultimoDiaMes = endOfMonth(fechaInicio)
    let diaIterador = addDays(fechaActual, 1)
    
    // Copiar a todos los días restantes del mes
    while (isSameMonth(diaIterador, fechaInicio) && isBefore(diaIterador, addDays(ultimoDiaMes, 1))) {
      const fechaDestino = format(diaIterador, 'yyyy-MM-dd')
      
      nuevosDias[fechaDestino] = {
        ...nuevosDias[fechaDestino] || {},
        entrada1: diaActual.entrada1,
        salida1: diaActual.salida1,
        entrada2: diaActual.entrada2,
        salida2: diaActual.salida2,
        total: diaActual.total,
        isHoliday: nuevosDias[fechaDestino]?.isHoliday || false,
        isSunday: nuevosDias[fechaDestino]?.isSunday || false
      }
      
      // Verificar advertencias para cada día copiado
      verificarAdvertenciasDiaDiferente(fechaDestino, nuevosDias[fechaDestino])
      
      diaIterador = addDays(diaIterador, 1)
    }
    
    // Actualizar estado
    setDiasMes(nuevosDias)
  }

  // Función para verificar advertencias de día diferente
  const verificarAdvertenciasDiaDiferente = (fechaStr: string, dia: DiaData) => {
    // Eliminar advertencias existentes para esta fecha
    const nuevasAdvertencias = [...advertenciasDiaDiferente.filter(adv => adv.fecha !== fechaStr)]
    
    // Verificar turno 1
    if (dia.entrada1 && dia.salida1) {
      const entrada1 = formatTime24Hour(dia.entrada1)
      const salida1 = formatTime24Hour(dia.salida1)
      
      if (entrada1 > salida1) {
        nuevasAdvertencias.push({
          fecha: fechaStr,
          turno: "1",
          entrada: entrada1,
          salida: salida1
        })
      }
    }
    
    // Verificar turno 2
    if (dia.entrada2 && dia.salida2) {
      const entrada2 = formatTime24Hour(dia.entrada2)
      const salida2 = formatTime24Hour(dia.salida2)
      
      if (entrada2 > salida2) {
        nuevasAdvertencias.push({
          fecha: fechaStr,
          turno: "2",
          entrada: entrada2,
          salida: salida2
        })
      }
    }
    
    // Actualizar el estado con todas las advertencias
    setAdvertenciasDiaDiferente(nuevasAdvertencias)
    
    // Retornar las nuevas advertencias para esta fecha específica
    return nuevasAdvertencias.filter(adv => adv.fecha === fechaStr)
  }

  // Función para generar hash de la contraseña
  const generateHash = (text: string) => {
    return createHash('sha256').update(text).digest('hex')
  }

  // Función para manejar la autenticación
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    // Hash para "AdminBomberos2025"
    const correctHash = "261d09646a120661f8002b5bf8e4c2c30dc04bd462bae895315635f0a8c115df"
    const hashedPassword = generateHash(password)
    
    console.log("Contraseña ingresada:", password)
    console.log("Hash generado:", hashedPassword)
    console.log("Hash correcto:", correctHash)
    console.log("¿Coinciden?", hashedPassword === correctHash)
    
    if (hashedPassword === correctHash) {
      setMostrarModalAuth(false)
      setAutenticadoGestionCargos(true)
      setTab('gestion-cargos')
      setPassword("")
      setErrorAuth("")
    } else {
      setErrorAuth("Contraseña incorrecta")
    }
  }

  // Modal de autenticación
  const ModalAuth = () => {
    useEffect(() => {
      if (mostrarModalAuth) {
        setTimeout(() => {
          passwordRef.current?.focus()
        }, 0)
      }
    }, [mostrarModalAuth])

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-bomberored-800 flex items-center gap-2">
              <Lock className="w-6 h-6" />
              Autenticación
            </h2>
            <button 
              className="text-gray-500 hover:text-bomberored-700 transition-colors"
              onClick={() => {
                setMostrarModalAuth(false)
                setPassword("")
                setErrorAuth("")
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1 block">
                Contraseña
              </Label>
              <Input
                ref={passwordRef}
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                placeholder="Ingrese la contraseña"
                required
                autoComplete="off"
              />
              {errorAuth && (
                <p className="text-red-500 text-sm mt-1">{errorAuth}</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-bomberored-700 hover:bg-bomberored-800">
              Acceder
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // Calcula los valores monetarios individuales para cada tipo de recargo y hora extra justo antes del return
  const valorHora = salarioMensual / 190
  const valorMinuto = valorHora / 60
  const valorRecargoNocturnoLV = valorMinuto * calculoHoras.horasNocturnasLV * 0.35
  const valorRecargoNocturnoFestivo = valorMinuto * calculoHoras.horasNocturnasFestivos * 2.35
  const valorRecargoDiurnoFestivo = valorMinuto * calculoHoras.horasDiurnasFestivos * 2.0
  const valorExtraDiurnaLV = valorMinuto * calculoHoras.horasExtDiurnasLV * 1.25
  const valorExtraNocturnaLV = valorMinuto * calculoHoras.horasExtNocturnasLV * 1.75
  const valorExtraDiurnaFestivo = valorMinuto * calculoHoras.horasExtDiurnasFestivos * 2.25
  const valorExtraNocturnaFestivo = valorMinuto * calculoHoras.horasExtNocturnasFestivos * 2.75
  
  // Calcular totales de recargos y extras
  const totalRecargosCalculado = valorRecargoNocturnoLV + valorRecargoNocturnoFestivo + valorRecargoDiurnoFestivo
  const totalExtrasCalculado = valorExtraDiurnaLV + valorExtraNocturnaLV + valorExtraDiurnaFestivo + valorExtraNocturnaFestivo
  const topeMaximo = salarioMensual * 0.5
  
  // Calcular el valor monetario del tiempo compensatorio (excedente del 50% del salario)
  // Usamos el valor de tiempoCompensatorio para determinar si hay tiempo compensatorio
  const valorTiempoCompensatorio = tiempoCompensatorio > 0 ? totalExtrasCalculado - topeMaximo : 0
  
  // Variable para verificar la precisión del cálculo
  const valorTotalCompensatorioDesglosado = (desgloseCompensatorio?.diurnaLV?.valor || 0) + 
                                          (desgloseCompensatorio?.nocturnaLV?.valor || 0) + 
                                          (desgloseCompensatorio?.diurnaFestivo?.valor || 0) + 
                                          (desgloseCompensatorio?.nocturnaFestivo?.valor || 0)
                                          
  // Función para formatear valores monetarios con 2 decimales
  const formatCurrency = (value: number): string => {
    return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  useEffect(() => {
    const loadFestivos = async () => {
      try {
        console.log('Fetching holidays from /api/festivos...'); // Log de inicio de fetch
        const res = await fetch('/api/festivos');
        if (!res.ok) {
          console.error('Error fetching holidays: HTTP status', res.status);
          return;
        }
        const data = await res.json();
        console.log('Fetched raw data:', data); // Log datos crudos
        if (data && Array.isArray(data.festivos)) {
          // No es necesario formatear la fecha ya que Oracle devuelve en formato correcto
          setFestivos(data.festivos);
          console.log('Holidays loaded successfully. Total:', data.festivos.length); // Log éxito y cantidad
          console.log('Example holidays:', data.festivos.slice(0, 5)); // Log primeros 5
        } else {
          console.error('Fetched data does not contain a festivos array or is not an array:', data); // Log error en formato
          setFestivos([]);
        }
      } catch (err) {
        console.error('Error loading holidays:', err);
        setFestivos([]); // Asegurarse de que festivos sea un array vacío en caso de error
      }
    };
    loadFestivos();
  }, []); // Este efecto se ejecuta solo una vez al montar el componente

  useEffect(() => {
    const hasErrors = Object.keys(camposConError).some(dateKey => {
      return diasSemanaActual.some(day => format(day, "yyyy-MM-dd") === dateKey) && camposConError[dateKey].length > 0
    })
    if (hasErrors !== hasErrorsInCurrentWeek) {
      setHasErrorsInCurrentWeek(hasErrors)
    }
  }, [semanaActual, camposConError, diasSemanaActual, hasErrorsInCurrentWeek])

  // Efecto para verificar advertencias cuando cambia el estado de diasMes
  useEffect(() => {
    // Crear un array para almacenar todas las advertencias
    const todasLasAdvertencias: AdvertenciaDiaDiferente[] = []
    // Crear un objeto para almacenar los campos con error
    const nuevosCamposConError: {[key: string]: string[]} = {}

    // Verificar cada día del mes
    Object.entries(diasMes).forEach(([fechaStr, dia]) => {
      const erroresFecha: string[] = []
      
      // Verificar turno 1
      if (dia.entrada1 && dia.salida1) {
        const entrada1 = formatTime24Hour(dia.entrada1)
        const salida1 = formatTime24Hour(dia.salida1)
        
        if (entrada1 > salida1) {
          todasLasAdvertencias.push({
            fecha: fechaStr,
            turno: "1",
            entrada: entrada1,
            salida: salida1
          })
        }
      }
      
      // Verificar turno 2
      if (dia.entrada2 && dia.salida2) {
        const entrada2 = formatTime24Hour(dia.entrada2)
        const salida2 = formatTime24Hour(dia.salida2)
        
        if (entrada2 > salida2) {
          todasLasAdvertencias.push({
            fecha: fechaStr,
            turno: "2",
            entrada: entrada2,
            salida: salida2
          })
        }
      }
      
      // Verificar solapamiento entre turnos
      if (dia.entrada1 && dia.salida1 && dia.entrada2 && dia.salida2) {
        const entrada1 = formatTime24Hour(dia.entrada1)
        const salida1 = formatTime24Hour(dia.salida1)
        const entrada2 = formatTime24Hour(dia.entrada2)
        const salida2 = formatTime24Hour(dia.salida2)
        
        // Convertir a objetos Date para facilitar la comparación
        const fechaBase = parse(fechaStr, 'yyyy-MM-dd', new Date())
        let horaEntrada1 = parse(entrada1, 'HH:mm', fechaBase)
        let horaSalida1 = parse(salida1, 'HH:mm', fechaBase)
        let horaEntrada2 = parse(entrada2, 'HH:mm', fechaBase)
        let horaSalida2 = parse(salida2, 'HH:mm', fechaBase)
        
        // Ajustar si cruza la medianoche
        if (entrada1 > salida1) {
          horaSalida1 = addDays(horaSalida1, 1)
        }
        if (entrada2 > salida2) {
          horaSalida2 = addDays(horaSalida2, 1)
        }
        
        // Verificar solapamiento: (e1 < s2 && e2 < s1)
        const haySolapamiento = (
          isBefore(horaEntrada1, horaSalida2) && 
          isBefore(horaEntrada2, horaSalida1) &&
          // Excluir el caso donde la salida1 es igual a entrada2 (turnos consecutivos)
          !(salida1 === entrada2)
        )
        
        if (haySolapamiento) {
          erroresFecha.push('entrada1', 'salida1', 'entrada2', 'salida2')
        }
      }
      
      // Si hay errores para esta fecha, guardarlos
      if (erroresFecha.length > 0) {
        nuevosCamposConError[fechaStr] = erroresFecha
      }
    })
    
    // Actualizar el estado con todas las advertencias
    setAdvertenciasDiaDiferente(todasLasAdvertencias)
    // Actualizar el estado de los campos con error
    setCamposConError(nuevosCamposConError)
  }, [diasMes])

  // Función para calcular el valor monetario de un día
  const calcularValorMonetarioDia = (fechaStr: string, dia: DiaData): { 
    total: number, 
    desglose: {
      tipo: string,
      horas: string,
      valor: number
    }[],
    horasCompensatorias: number,
    valorCompensatorio: number,
    esElDiaDelTope?: boolean
  } => {
    if (!dia.total || dia.total === "0:00" || dia.total === "Error") {
      return { 
        total: 0, 
        desglose: [],
        horasCompensatorias: 0,
        valorCompensatorio: 0,
        esElDiaDelTope: false
      };
    }

    // Usar la información del progreso diario (ahora calculado automáticamente)
    const progresoDeDia = progresoDiario[fechaStr];
    if (progresoDeDia) {
      // Usar valores del progreso diario calculado correctamente
      const valorHora = salarioMensual / 190;
      const valorMinuto = valorHora / 60;
      const topeMaximo = salarioMensual * 0.5;
      
      // Obtener el desglose de horas de este día específico
      const desglose = progresoDeDia.desgloseDia;
      
      // Calcular valores monetarios según las fórmulas especificadas
      const valorRecargoNocturno = (desglose.recNocturno / 60) * valorHora * 0.35; // 35% recargo
      const valorRecargoFestivoNocturno = (desglose.recDomNoct / 60) * valorHora * 2.35; // 235% recargo
      const valorRecargoFestivoDiurno = (desglose.recDomDia / 60) * valorHora * 2.0; // 200% recargo
      
      // Calcular valores brutos de extras
      const valorExtraDiurna = (desglose.extDia / 60) * valorHora * 1.25; // 125% recargo
      const valorExtraNocturna = (desglose.extNoct / 60) * valorHora * 1.75; // 175% recargo
      const valorExtraFestivoDiurna = (desglose.extDomDia / 60) * valorHora * 2.25; // 225% recargo
      const valorExtraFestivoNocturna = (desglose.extDomNoct / 60) * valorHora * 2.75; // 275% recargo
      
      const totalExtrasEseDia = valorExtraDiurna + valorExtraNocturna + valorExtraFestivoDiurna + valorExtraFestivoNocturna;
      
      // Determinar si hay tiempo compensatorio usando la información del estado global
      let valorExtrasAPagar = totalExtrasEseDia;
      let horasCompensatorias = 0;
      let valorCompensatorio = 0;
      let esElDiaDelTope = false;
      
      // Verificar si hay tiempo compensatorio en el desglose global
      const fechaObj = parse(fechaStr, 'yyyy-MM-dd', new Date());
      const diaDelMes = fechaObj.getDate();
      
      // Calcular tiempo compensatorio total para este día específico desde el desglose global
      let tiempoCompensatorioMinutos = 0;
      
      // Si se alcanzó el tope, calcular las horas compensatorias
      if (progresoDeDia.tope50PorAlcanzado) {
        const valorExtrasAcumuladoAntesDeDia = progresoDeDia.valorExtrasAcumuladoHasta - totalExtrasEseDia;
        
        if (valorExtrasAcumuladoAntesDeDia < topeMaximo) {
          // Este es el día donde se alcanza el tope
          esElDiaDelTope = true;
          const espacioDisponible = topeMaximo - valorExtrasAcumuladoAntesDeDia;
          
          if (totalExtrasEseDia > espacioDisponible) {
            valorExtrasAPagar = espacioDisponible;
            valorCompensatorio = totalExtrasEseDia - espacioDisponible;
            horasCompensatorias = valorCompensatorio / valorHora;
          }
        } else {
          // El tope ya se había alcanzado, todo es compensatorio
          valorExtrasAPagar = 0;
          valorCompensatorio = totalExtrasEseDia;
          horasCompensatorias = valorCompensatorio / valorHora;
        }
      }
       
       // Calcular total a pagar (solo recargos + extras dentro del tope)
       const totalAPagar = valorRecargoNocturno + valorRecargoFestivoNocturno + 
                          valorRecargoFestivoDiurno + valorExtrasAPagar;
       
       // Crear desglose para el tooltip
       const desgloseArray = [];
       
       // Agregar recargos al desglose
       if (desglose.recNocturno > 0) {
         desgloseArray.push({
           tipo: "Recargo nocturno L-S (35%)",
           horas: formatHorasDecimales(desglose.recNocturno / 60),
           valor: valorRecargoNocturno
         });
       }
       
       if (desglose.recDomDia > 0) {
         desgloseArray.push({
           tipo: "Recargo festivo diurno (200%)",
           horas: formatHorasDecimales(desglose.recDomDia / 60),
           valor: valorRecargoFestivoDiurno
         });
       }
       
       if (desglose.recDomNoct > 0) {
         desgloseArray.push({
           tipo: "Recargo festivo nocturno (235%)",
           horas: formatHorasDecimales(desglose.recDomNoct / 60),
           valor: valorRecargoFestivoNocturno
         });
       }
       
       // Agregar extras al desglose (solo la parte que se paga)
       if (desglose.extDia > 0) {
         const valorAPagarEsteItem = progresoDeDia.tope50PorAlcanzado && totalExtrasEseDia > 0 ? 
           Math.min(valorExtraDiurna, valorExtrasAPagar * (valorExtraDiurna / totalExtrasEseDia)) : 
           valorExtraDiurna;
         
         desgloseArray.push({
           tipo: "Extra diurna L-S (125%)",
           horas: formatHorasDecimales(desglose.extDia / 60),
           valor: valorAPagarEsteItem
         });
       }
       
       if (desglose.extNoct > 0) {
         const valorAPagarEsteItem = progresoDeDia.tope50PorAlcanzado && totalExtrasEseDia > 0 ? 
           Math.min(valorExtraNocturna, valorExtrasAPagar * (valorExtraNocturna / totalExtrasEseDia)) : 
           valorExtraNocturna;
         
         desgloseArray.push({
           tipo: "Extra nocturna L-S (175%)",
           horas: formatHorasDecimales(desglose.extNoct / 60),
           valor: valorAPagarEsteItem
         });
       }
       
       if (desglose.extDomDia > 0) {
         const valorAPagarEsteItem = progresoDeDia.tope50PorAlcanzado && totalExtrasEseDia > 0 ? 
           Math.min(valorExtraFestivoDiurna, valorExtrasAPagar * (valorExtraFestivoDiurna / totalExtrasEseDia)) : 
           valorExtraFestivoDiurna;
         
         desgloseArray.push({
           tipo: "Extra festivo diurna (225%)",
           horas: formatHorasDecimales(desglose.extDomDia / 60),
           valor: valorAPagarEsteItem
         });
       }
       
       if (desglose.extDomNoct > 0) {
         const valorAPagarEsteItem = progresoDeDia.tope50PorAlcanzado && totalExtrasEseDia > 0 ? 
           Math.min(valorExtraFestivoNocturna, valorExtrasAPagar * (valorExtraFestivoNocturna / totalExtrasEseDia)) : 
           valorExtraFestivoNocturna;
         
         desgloseArray.push({
           tipo: "Extra festivo nocturna (275%)",
           horas: formatHorasDecimales(desglose.extDomNoct / 60),
           valor: valorAPagarEsteItem
         });
       }
       
       return { 
         total: totalAPagar, 
         desglose: desgloseArray,
         horasCompensatorias: horasCompensatorias,
         valorCompensatorio: valorCompensatorio,
         esElDiaDelTope: esElDiaDelTope
       };
    }

    // Fallback: cálculo básico solo si no hay progreso diario disponible
    const fecha = parse(fechaStr, 'yyyy-MM-dd', new Date());
    const esFestivo = dia.isHoliday || dia.isSunday;
    const [horasStr, minutosStr] = dia.total.split(':');
    const horasTotal = parseInt(horasStr);
    const minutosTotal = parseInt(minutosStr);
    
    if (horasTotal === 0 && minutosTotal === 0) {
      return { 
        total: 0, 
        desglose: [],
        horasCompensatorias: 0,
        valorCompensatorio: 0,
        esElDiaDelTope: false
      };
    }
    
    const valorHora = salarioMensual / 190;
    const totalHoras = horasTotal + minutosTotal / 60;
    
    // Cálculo básico simplificado
    let valorBasico = 0;
    const desgloseBasico = [];
    
    if (esFestivo) {
      valorBasico = totalHoras * valorHora * 2.0;
      desgloseBasico.push({
        tipo: "Recargo festivo (estimado)",
        horas: formatHorasDecimales(totalHoras),
        valor: valorBasico
      });
    } else {
      const horasEstimadasNocturnas = Math.min(totalHoras * 0.3, totalHoras);
      if (horasEstimadasNocturnas > 0) {
        const valorNocturno = horasEstimadasNocturnas * valorHora * 0.35;
        valorBasico += valorNocturno;
        desgloseBasico.push({
          tipo: "Recargo nocturno L-S (35% estimado)",
          horas: formatHorasDecimales(horasEstimadasNocturnas),
          valor: valorNocturno
        });
      }
      
      if (totalHoras > 10) {
        const horasExtrasEstimadas = totalHoras - 10;
        const valorExtras = horasExtrasEstimadas * valorHora * 1.25;
        valorBasico += valorExtras;
        desgloseBasico.push({
          tipo: "Horas extras (estimado)",
          horas: formatHorasDecimales(horasExtrasEstimadas),
          valor: valorExtras
        });
      }
    }
    
    return { 
      total: valorBasico, 
      desglose: desgloseBasico,
      horasCompensatorias: 0,
      valorCompensatorio: 0,
      esElDiaDelTope: false
    };
  };
  
  // Función para formatear horas decimales
  const formatHorasDecimales = (horas: number): string => {
    const horasEnteras = Math.floor(horas);
    const minutosDecimales = Math.floor((horas - horasEnteras) * 60);
    return `${horasEnteras}:${minutosDecimales.toString().padStart(2, '0')}`;
  };

  // Función para calcular los minutos que se solapan entre dos rangos de tiempo
  const calcularMinutosEnRango = (inicio: Date, fin: Date, rangoInicio: Date, rangoFin: Date): number => {
    // Si no hay solapamiento, retornar 0
    if (isAfter(inicio, rangoFin) || isAfter(rangoInicio, fin)) {
      return 0;
    }
    
    // Calcular el inicio y fin del solapamiento
    const solapamientoInicio = isAfter(inicio, rangoInicio) ? inicio : rangoInicio;
    const solapamientoFin = isBefore(fin, rangoFin) ? fin : rangoFin;
    
    // Calcular minutos de solapamiento
    return differenceInMinutes(solapamientoFin, solapamientoInicio);
  };

  // Funciones para la gestión de festivos
  const fetchFestivosPorAño = useCallback(async (año: string) => {
    try {
      const res = await fetch(`/api/festivos?anio=${año}`);
      if (!res.ok) {
        throw new Error('Error al obtener los festivos');
      }
      const data = await res.json();
      if (data && Array.isArray(data.festivos)) {
        setFestivosPorAño(data.festivos);
      } else {
        setFestivosPorAño([]);
      }
    } catch (err: any) {
      console.error('Error al obtener festivos:', err);
      setErrorFestivo(err.message || 'Error al obtener los festivos');
    }
  }, []);
  
  useEffect(() => {
    fetchFestivosPorAño(añoSeleccionado);
  }, [añoSeleccionado, fetchFestivosPorAño]);
  
  const handleCambioAñoFestivos = (año: string) => {
    setAñoSeleccionado(año);
  };

  // Función para hacer scroll suave hacia la sección de festivos
  const scrollToFestivos = () => {
    const element = document.getElementById('gestion-festivos');
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  
  const handleSubmitFestivo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!nuevoFestivoFecha || !nuevoFestivoNombre.trim() || !nuevoFestivoTipo) {
        setErrorFestivo('Todos los campos son requeridos');
        return;
      }
      
      const fechaFormateada = format(nuevoFestivoFecha, 'yyyy-MM-dd');
      
      const res = await fetch('/api/festivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: fechaFormateada,
          nombre: nuevoFestivoNombre,
          tipo: nuevoFestivoTipo
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error || 'Error al crear festivo';
        throw new Error(errorMessage);
      }
      
      setNuevoFestivoFecha(new Date());
      setNuevoFestivoNombre("");
      setErrorFestivo("");
      fetchFestivosPorAño(añoSeleccionado);
      
    } catch (err: any) {
      console.error('Error al agregar festivo:', err);
      setErrorFestivo(err.message || 'Error al agregar el festivo');
    }
  };
  
  const handleEliminarFestivo = async (fecha: string) => {
    try {
      console.log('Eliminando festivo con fecha:', fecha);
      
      if (!fecha) {
        console.error('Fecha no válida');
        setErrorFestivo('Fecha no válida');
        return;
      }
      
      // La fecha ya viene en formato yyyy-MM-dd desde Oracle
      console.log('Fecha para eliminar:', fecha);
      
      const res = await fetch(`/api/festivos?fecha=${fecha}`, {
        method: 'DELETE'
      });
      
      console.log('Respuesta del servidor:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error('Error data:', errorData);
        const errorMessage = errorData?.error || 'Error al eliminar festivo';
        throw new Error(errorMessage);
      }
      
      const responseData = await res.json();
      console.log('Respuesta exitosa:', responseData);
      
      setErrorFestivo("");
      fetchFestivosPorAño(añoSeleccionado);
      
    } catch (err: any) {
      console.error('Error al eliminar festivo:', err);
      setErrorFestivo(err.message || 'Error al eliminar el festivo');
    }
  };

  // Función auxiliar para calcular progreso diario automáticamente
  const calcularProgresoDiarioAutomatico = useCallback(() => {
    // Verificar si hay datos válidos para calcular
    const hayDatosValidos = Object.values(diasMes).some(dia => 
      dia.total && dia.total !== "0:00" && dia.total !== "Error"
    );
    
    if (!hayDatosValidos) {
      setProgresoDiario({});
      return;
    }

    // Usar la misma lógica que calcularHorasYRecargos pero solo para el progreso diario
    let totalMinutos = 0
    let recNocturno = 0
    let recDomNoct = 0  
    let recDomDia = 0   
    let extDia = 0      
    let extNoct = 0     
    let extDomDia = 0   
    let extDomNoct = 0  
    let topeAlcanzado = false
    const valorHora = salarioMensual / 190
    const valorMinuto = valorHora / 60
    const topeMaximo = salarioMensual * 0.5
    let dineroExtrasAcumulado = 0
    let minutosCompensar = 0

    type TipoHoraExtra = 'diurnaLV' | 'nocturnaLV' | 'diurnaFestivo' | 'nocturnaFestivo';
    let minutosExtraPorTipo: Record<TipoHoraExtra, number> = {
      'diurnaLV': 0,
      'nocturnaLV': 0,
      'diurnaFestivo': 0,
      'nocturnaFestivo': 0
    };
    let minutosCompensatoriosPorTipo: Record<TipoHoraExtra, number> = {
      'diurnaLV': 0,
      'nocturnaLV': 0,
      'diurnaFestivo': 0,
      'nocturnaFestivo': 0
    };
    
    let progresoTemporalDiario: {[key: string]: {
      minutosAcumuladosHastaEseDia: number,
      minutosExtrasAcumuladosHasta: number,
      valorExtrasAcumuladoHasta: number,
      topeHorasAlcanzado: boolean,
      tope50PorAlcanzado: boolean,
      desgloseDia: {
        recNocturno: number,
        recDomNoct: number, 
        recDomDia: number,
        extDia: number,
        extNoct: number,
        extDomDia: number,
        extDomNoct: number
      }
    }} = {}
    
    const fechasOrdenadas = Object.keys(diasMes).sort()
    
    fechasOrdenadas.forEach((fecha) => {
      const dia = diasMes[fecha]
      if (dia.total === "Error") return
      
      const fechaDate = parse(fecha, "yyyy-MM-dd", new Date())
      const esFestivo = dia.isHoliday || dia.isSunday;
      
      let recNocturnoEseDia = 0
      let recDomNoctEseDia = 0
      let recDomDiaEseDia = 0
      let extDiaEseDia = 0
      let extNoctEseDia = 0
      let extDomDiaEseDia = 0
      let extDomNoctEseDia = 0
      
      const turnos = [
        { entrada: dia.entrada1, salida: dia.salida1 },
        { entrada: dia.entrada2, salida: dia.salida2 },
      ]
      
      turnos.forEach(({ entrada, salida }) => {
        if (!entrada || !salida) return
        let horaEntrada = parse(entrada, "HH:mm", fechaDate)
        let horaSalida = parse(salida, "HH:mm", fechaDate)
        if (horaSalida < horaEntrada) horaSalida = addDays(horaSalida, 1)
        let horaActual = new Date(horaEntrada)
        
        while (horaActual < horaSalida) {
          const horaFin = new Date(horaActual)
          horaFin.setMinutes(horaFin.getMinutes() + 1)
          const h = horaActual.getHours()
          const esNocturno = h >= 18 || h < 6
          const esDiurno = h >= 6 && h < 18
          totalMinutos++

          if (totalMinutos <= 190 * 60) {
            if (!esFestivo && esNocturno) {
              recNocturno++
              recNocturnoEseDia++
            }
            if (esFestivo && esNocturno) {
              recDomNoct++
              recDomNoctEseDia++
            }
            if (esFestivo && esDiurno) {
              recDomDia++
              recDomDiaEseDia++
            }
          } else {
            let valorEsteMinuto = 0
            let tipoHoraActual: TipoHoraExtra | undefined = undefined;
            
            if (!esFestivo && esDiurno) { 
              if (!topeAlcanzado) {
                extDia++
                extDiaEseDia++
              }
              valorEsteMinuto = valorMinuto * 1.25;
              tipoHoraActual = 'diurnaLV';
              if (!topeAlcanzado) minutosExtraPorTipo['diurnaLV']++;
            }
            else if (!esFestivo && esNocturno) { 
              if (!topeAlcanzado) {
                extNoct++
                extNoctEseDia++
              }
              valorEsteMinuto = valorMinuto * 1.75;
              tipoHoraActual = 'nocturnaLV';
              if (!topeAlcanzado) minutosExtraPorTipo['nocturnaLV']++;
            }
            else if (esFestivo && esDiurno) { 
              if (!topeAlcanzado) {
                extDomDia++
                extDomDiaEseDia++
              }
              valorEsteMinuto = valorMinuto * 2.25;
              tipoHoraActual = 'diurnaFestivo';
              if (!topeAlcanzado) minutosExtraPorTipo['diurnaFestivo']++;
            }
            else if (esFestivo && esNocturno) { 
              if (!topeAlcanzado) {
                extDomNoct++
                extDomNoctEseDia++
              }
              valorEsteMinuto = valorMinuto * 2.75;
              tipoHoraActual = 'nocturnaFestivo';
              if (!topeAlcanzado) minutosExtraPorTipo['nocturnaFestivo']++;
            }
            
                         if (dineroExtrasAcumulado < topeMaximo) {
               if (dineroExtrasAcumulado + valorEsteMinuto > topeMaximo && !topeAlcanzado) {
                 topeAlcanzado = true
                 const fraccionDentroDelTope = (topeMaximo - dineroExtrasAcumulado) / valorEsteMinuto
                 dineroExtrasAcumulado = topeMaximo
                
                if (tipoHoraActual) {
                  if (tipoHoraActual === 'diurnaLV') {
                    extDia = extDia - 1 + fraccionDentroDelTope;
                    minutosExtraPorTipo['diurnaLV'] = minutosExtraPorTipo['diurnaLV'] - 1 + fraccionDentroDelTope;
                  } else if (tipoHoraActual === 'nocturnaLV') {
                    extNoct = extNoct - 1 + fraccionDentroDelTope;
                    minutosExtraPorTipo['nocturnaLV'] = minutosExtraPorTipo['nocturnaLV'] - 1 + fraccionDentroDelTope;
                  } else if (tipoHoraActual === 'diurnaFestivo') {
                    extDomDia = extDomDia - 1 + fraccionDentroDelTope;
                    minutosExtraPorTipo['diurnaFestivo'] = minutosExtraPorTipo['diurnaFestivo'] - 1 + fraccionDentroDelTope;
                  } else if (tipoHoraActual === 'nocturnaFestivo') {
                    extDomNoct = extDomNoct - 1 + fraccionDentroDelTope;
                    minutosExtraPorTipo['nocturnaFestivo'] = minutosExtraPorTipo['nocturnaFestivo'] - 1 + fraccionDentroDelTope;
                  }
                  minutosCompensatoriosPorTipo[tipoHoraActual] += (1 - fraccionDentroDelTope)
                  minutosCompensar += (1 - fraccionDentroDelTope)
                }
              } else {
                dineroExtrasAcumulado += valorEsteMinuto
              }
            } else {
              minutosCompensar++
              if (tipoHoraActual) {
                minutosCompensatoriosPorTipo[tipoHoraActual]++;
              }
            }
          }
          horaActual = horaFin
        }
      })
      
      progresoTemporalDiario[fecha] = {
        minutosAcumuladosHastaEseDia: totalMinutos,
        minutosExtrasAcumuladosHasta: Math.max(0, totalMinutos - 190 * 60),
        valorExtrasAcumuladoHasta: dineroExtrasAcumulado,
        topeHorasAlcanzado: totalMinutos >= 190 * 60,
        tope50PorAlcanzado: topeAlcanzado,
        desgloseDia: {
          recNocturno: recNocturnoEseDia,
          recDomNoct: recDomNoctEseDia,
          recDomDia: recDomDiaEseDia,
          extDia: extDiaEseDia,
          extNoct: extNoctEseDia,
          extDomDia: extDomDiaEseDia,
          extDomNoct: extDomNoctEseDia
        }
      }
    })

         setProgresoDiario(progresoTemporalDiario)
   }, [diasMes, salarioMensual])

  // Efecto para calcular automáticamente el progreso diario
  useEffect(() => {
    calcularProgresoDiarioAutomatico()
  }, [calcularProgresoDiarioAutomatico])

  return (
    <div className="w-full py-8 flex flex-col gap-8">
      {/* Modal de autenticación */}
      {mostrarModalAuth && <ModalAuth />}
      
      {/* Navegación de pestañas */}
      <div className="bg-gray-100 rounded-xl p-2 flex flex-col sm:flex-row mb-6 gap-2 sm:gap-0">
        <button
          className={`px-4 sm:px-8 py-2 rounded-md font-bold transition-colors text-sm sm:text-base ${tab === 'registro' ? 'bg-white text-black shadow' : 'text-gray-500'}`}
          onClick={() => setTab('registro')}
        >
          Registro de Horas
        </button>
        <button
          className={`px-4 sm:px-8 py-2 rounded-md font-bold transition-colors text-sm sm:text-base ${tab === 'calculos' ? 'bg-white text-black shadow' : 'text-gray-500'}`}
          onClick={() => setTab('calculos')}
        >
          Cálculos y Reportes
        </button>
        <button
          className={`px-4 sm:px-8 py-2 rounded-md font-bold transition-colors text-sm sm:text-base ${tab === 'gestion-cargos' ? 'bg-white text-black shadow' : 'text-gray-500'}`}
          onClick={() => {
            if (!autenticadoGestionCargos) {
              setMostrarModalAuth(true);
              setPassword("");
              setErrorAuth("");
            } else {
              setTab('gestion-cargos');
            }
          }}
        >
          Administración
        </button>
      </div>
      {/* Registro de Horas */}
      {tab === 'registro' && (
        <>
          {mostrarModalCargos && (
            <ModalGestionCargos
              onClose={() => setMostrarModalCargos(false)}
              cargos={cargosState}
              fetchCargos={fetchCargos}
              cargoSeleccionado={cargoSeleccionado}
            />
          )}
          {/* Selección de mes */}
          <section className="bg-white rounded-2xl shadow-md p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-gray-100">
            <div className="flex flex-col gap-2 w-fit">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-7 w-7 text-red-500" />
                <span className="text-2xl font-bold text-black">Seleccionar Mes</span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-5 py-2 text-lg font-medium text-gray-700 shadow-sm hover:bg-gray-100 focus:ring-2 focus:ring-red-300 transition"
                  onClick={() => setShowDatePicker(true)}
                >
                  <Calendar className="flex items-center justify-center h-5 w-5 text-gray-400" />
                  <span>{format(fechaInicio, "MMMM 'de' yyyy", { locale: es })}</span>
                </button>
                {showDatePicker && (
                  <div className="absolute left-0 top-full mt-2 bg-white rounded-xl shadow-lg z-30">
                    <DatePicker
                      selected={fechaInicio}
                      onChange={(date: Date | null) => {
                        if (date) {
                          setFechaInicio(startOfMonth(date))
                        }
                        setShowDatePicker(false)
                      }}
                      onClickOutside={() => setShowDatePicker(false)}
                      dateFormat="MMMM yyyy"
                      showMonthYearPicker
                      inline
                      locale={es}
                    />
                  </div>
                )}
              </div>
            </div>
            <div>
              <button
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2 rounded-lg shadow-sm border border-red-500 transition-colors text-lg"
                onClick={limpiarTodo}
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar Todo
              </button>
            </div>
          </section>

          {/* Navegación de semanas */}
          <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
            <button
              className="bg-white border border-gray-300 text-black font-bold px-6 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              onClick={() => setSemanaActual((s) => Math.max(0, s - 1))}
              disabled={semanaActual === 0}
              type="button"
            >
              <span className="text-lg">&#8592;</span> Semana anterior
            </button>
            <div className="font-bold text-lg text-black text-center flex-1 flex items-center justify-center gap-2">
              Semana {semanaActual + 1} de {semanasDelMes.length}
              {hasErrorsInCurrentWeek && (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <button
              className="bg-white border border-gray-300 text-black font-bold px-6 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 justify-end"
              onClick={() => setSemanaActual((s) => Math.min(semanasDelMes.length - 1, s + 1))}
              disabled={semanaActual === semanasDelMes.length - 1}
              type="button"
            >
              Semana siguiente <span className="text-lg">&#8594;</span>
            </button>
          </section>

          {/* Advertencias de días diferentes */}
          {advertenciasDiaDiferente.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Advertencias de días diferentes
              </h3>
              <div className="space-y-2">
                {advertenciasDiaDiferente.map((advertencia, index) => (
                  <div key={index} className="text-yellow-700">
                    <p>
                      <span className="font-medium">
                        {format(parseISO(advertencia.fecha), 'dd/MM/yyyy')} - Turno {advertencia.turno}:
                      </span>
                      {" "}Se ha detectado que la hora de entrada ({advertencia.entrada}) es mayor que la hora de salida ({advertencia.salida}), 
                      lo que indica que el turno se extiende hasta el día siguiente. Si esto es correcto, puede ignorar esta advertencia.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Advertencias de solapamiento de horarios */}
          {Object.keys(camposConError).length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Advertencias de solapamiento de horarios
              </h3>
              <div className="space-y-2">
                {Object.entries(camposConError).map(([fecha, errores]) => (
                  errores.includes('entrada1') && errores.includes('entrada2') && (
                    <div key={fecha} className="text-red-700">
                      <p>
                        <span className="font-medium">
                          {format(parseISO(fecha), 'dd/MM/yyyy')}:
                        </span>
                        {" "}Se ha detectado un solapamiento entre el primer y segundo turno.
                        Los turnos no deben solaparse en el tiempo. Por favor, revise y ajuste los horarios.
                      </p>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Tabla de días (solo semana actual) */}
          <section className="bg-white rounded-lg shadow p-6">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-8 gap-2 font-bold mb-2 text-center text-black text-sm">
                  <div className="text-left">DÍA</div>
                  <div>ENTRADA 1</div>
                  <div>SALIDA 1</div>
                  <div>ENTRADA 2</div>
                  <div>SALIDA 2</div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      COPIAR A
                    </div>
                  </div>
                  <div>TOTAL</div>
                  <div>FESTIVOS</div>
                </div>
                {diasSemanaActual.map((fechaDate, idx) => {
                  const fechaStr = format(fechaDate, "yyyy-MM-dd")
                  const nombreDia = format(fechaDate, "EEEE", { locale: es }).toUpperCase()
                  const fechaFormateada = format(fechaDate, "dd/MM/yyyy")
                  const esDelMes = isSameMonth(fechaDate, fechaInicio)
                  const dia = diasMes[fechaStr] || { entrada1: "", salida1: "", entrada2: "", salida2: "", total: "", isHoliday: false, isSunday: false }
                  const rowBg = idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"
                  const hasErrors = Object.keys(camposConError).some(dateKey => {
                    return diasSemanaActual.some(day => format(day, "yyyy-MM-dd") === dateKey) && camposConError[dateKey].length > 0
                  })
                  if (hasErrors !== hasErrorsInCurrentWeek) {
                    setHasErrorsInCurrentWeek(hasErrors)
                  }
                  return (
                    <div
                      key={fechaStr}
                      className={cn(
                        "grid grid-cols-8 gap-2 mb-2 items-start rounded-lg border-b border-gray-200 py-3",
                        rowBg,
                        !esDelMes && "bg-gray-100 opacity-60"
                      )}
                    >
                      {/* DÍA */}
                      <div className="flex flex-col justify-center h-full pt-2">
                        <div className="font-bold text-black text-xs">{nombreDia}</div>
                        <div className="text-gray-500 text-[10px]">{fechaFormateada}</div>
                      </div>
                      
                      {/* ENTRADA 1 */}
                      <div className="relative w-full">
                        <div className={cn(
                          "border rounded-md px-1 py-1 text-center w-full min-w-[100px] h-[52px] flex flex-col justify-center",
                          !esDelMes ? "bg-[#FEF2F2] border-gray-300" : "bg-white border-gray-300",
                          camposConError[fechaStr]?.includes('entrada1') && "border-red-500 bg-red-50"
                        )}>
                          <Input
                            type="time"
                            value={dia.entrada1}
                            onChange={(e) => handleCambioHora(fechaStr, "entrada1", e.target.value)}
                            onFocus={() => setFocusedInput({fecha: fechaStr, tipo: "entrada1"})}
                            onBlur={() => setFocusedInput((prev) => prev && prev.fecha === fechaStr && prev.tipo === "entrada1" ? null : prev)}
                            readOnly={!esDelMes}
                            className={cn(
                              "text-center border-0 px-0 py-0 text-sm focus:outline-none focus:ring-0 w-full bg-transparent h-6 min-w-[100px] flex-shrink-0",
                              !esDelMes ? "text-gray-400" : "text-black"
                            )}
                            style={{ minWidth: '100px' }}
                          />
                          {dia.entrada1 && (
                            <div className="text-left text-xs text-gray-500 leading-none pl-1 mt-1">
                              {formatTime24Hour(dia.entrada1)}
                            </div>
                          )}
                        </div>
                        {focusedInput && focusedInput.fecha === fechaStr && focusedInput.tipo === "entrada1" && (
                          <div className="absolute w-full left-0 -top-12 bg-white border border-gray-300 shadow-md rounded px-3 py-0.5 text-xs font-semibold text-gray-700 z-20 flex items-center justify-center">
                          Formato de hora:12 horas (AM/PM)
                          </div>
                        )}
                      </div>
                      
                      {/* SALIDA 1 */}
                      <div className="relative w-full">
                        <div className={cn(
                          "border rounded-md px-1 py-1 text-center w-full min-w-[100px] h-[52px] flex flex-col justify-center",
                          !esDelMes ? "bg-[#FEF2F2] border-gray-300" : "bg-white border-gray-300",
                          camposConError[fechaStr]?.includes('salida1') && "border-red-500 bg-red-50"
                        )}>
                          <Input
                            type="time"
                            value={dia.salida1}
                            onChange={(e) => handleCambioHora(fechaStr, "salida1", e.target.value)}
                            onFocus={() => setFocusedInput({fecha: fechaStr, tipo: "salida1"})}
                            onBlur={() => setFocusedInput((prev) => prev && prev.fecha === fechaStr && prev.tipo === "salida1" ? null : prev)}
                            readOnly={!esDelMes}
                            className={cn(
                              "text-center border-0 px-0 py-0 text-sm focus:outline-none focus:ring-0 w-full bg-transparent h-6 min-w-[100px] flex-shrink-0",
                              !esDelMes ? "text-gray-400" : "text-black"
                            )}
                            style={{ minWidth: '100px' }}
                          />
                          {dia.salida1 && (
                            <div className="text-left text-xs text-gray-500 leading-none pl-1 mt-1">
                              {formatTime24Hour(dia.salida1)}
                            </div>
                          )}
                        </div>
                        {focusedInput && focusedInput.fecha === fechaStr && focusedInput.tipo === "salida1" && (
                          <div className="absolute w-full left-0 -top-12 bg-white border border-gray-300 shadow-md rounded px-3 py-0.5 text-xs font-semibold text-gray-700 z-20 flex items-center justify-center">
                            Formato de hora:12 horas (AM/PM)
                          </div>
                        )}
                      </div>
                      
                      {/* ENTRADA 2 */}
                      <div className="relative w-full">
                        <div className={cn(
                          "border rounded-md px-1 py-1 text-center w-full min-w-[100px] h-[52px] flex flex-col justify-center",
                          !esDelMes ? "bg-[#FEF2F2] border-gray-300" : "bg-white border-gray-300",
                          camposConError[fechaStr]?.includes('entrada2') && "border-red-500 bg-red-50"
                        )}>
                          <Input
                            type="time"
                            value={dia.entrada2}
                            onChange={(e) => handleCambioHora(fechaStr, "entrada2", e.target.value)}
                            onFocus={() => setFocusedInput({fecha: fechaStr, tipo: "entrada2"})}
                            onBlur={() => setFocusedInput((prev) => prev && prev.fecha === fechaStr && prev.tipo === "entrada2" ? null : prev)}
                            readOnly={!esDelMes}
                            className={cn(
                              "text-center border-0 px-0 py-0 text-sm focus:outline-none focus:ring-0 w-full bg-transparent h-6 min-w-[100px] flex-shrink-0",
                              !esDelMes ? "text-gray-400" : "text-black"
                            )}
                            style={{ minWidth: '100px' }}
                          />
                          {dia.entrada2 && (
                            <div className="text-left text-xs text-gray-500 leading-none pl-1 mt-1">
                              {formatTime24Hour(dia.entrada2)}
                            </div>
                          )}
                        </div>
                        {focusedInput && focusedInput.fecha === fechaStr && focusedInput.tipo === "entrada2" && (
                          <div className="absolute w-full left-0 -top-12 bg-white border border-gray-300 shadow-md rounded px-3 py-0.5 text-xs font-semibold text-gray-700 z-20 flex items-center justify-center">
                            Formato de hora:12 horas (AM/PM)
                          </div>
                        )}
                      </div>
                      
                      {/* SALIDA 2 */}
                      <div className="relative w-full">
                        <div className={cn(
                          "border rounded-md px-1 py-1 text-center w-full min-w-[100px] h-[52px] flex flex-col justify-center",
                          !esDelMes ? "bg-[#FEF2F2] border-gray-300" : "bg-white border-gray-300",
                          camposConError[fechaStr]?.includes('salida2') && "border-red-500 bg-red-50"
                        )}>
                          <Input
                            type="time"
                            value={dia.salida2}
                            onChange={(e) => handleCambioHora(fechaStr, "salida2", e.target.value)}
                            onFocus={() => setFocusedInput({fecha: fechaStr, tipo: "salida2"})}
                            onBlur={() => setFocusedInput((prev) => prev && prev.fecha === fechaStr && prev.tipo === "salida2" ? null : prev)}
                            readOnly={!esDelMes}
                            className={cn(
                              "text-center border-0 px-0 py-0 text-sm focus:outline-none focus:ring-0 w-full bg-transparent h-6 min-w-[100px] flex-shrink-0",
                              !esDelMes ? "text-gray-400" : "text-black"
                            )}
                            style={{ minWidth: '100px' }}
                          />
                          {dia.salida2 && (
                            <div className="text-left text-xs text-gray-500 leading-none pl-1 mt-1">
                              {formatTime24Hour(dia.salida2)}
                            </div>
                          )}
                        </div>
                        {focusedInput && focusedInput.fecha === fechaStr && focusedInput.tipo === "salida2" && (
                          <div className="absolute w-full left-0 -top-12 bg-white border border-gray-300 shadow-md rounded px-3 py-0.5 text-xs font-semibold text-gray-700 z-20 flex items-center justify-center">
                            Formato de hora:12 horas (AM/PM)
                          </div>
                        )}
                      </div>
                      
                      {/* COPIAR A */}
                      <div className="flex items-start justify-center pt-2">
                        {esDelMes && (
                          <div className="flex flex-row gap-1">
                            <button
                              type="button"
                              onClick={() => copiarAlDiaSiguiente(fechaStr)}
                              disabled={!dia.entrada1 || !dia.salida1 || idx === diasSemanaActual.length - 1}
                              className={cn(
                                "p-0.5 rounded-md text-xs font-medium transition-colors flex flex-col items-center",
                                (dia.entrada1 && dia.salida1 && idx !== diasSemanaActual.length - 1) 
                                  ? "bg-blue-100 hover:bg-blue-200 text-blue-700" 
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                              )}
                              title="Copiar al día siguiente"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              <span className="text-[8px] mt-0.5">Día</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => copiarAlRestoSemana(fechaStr)}
                              disabled={!dia.entrada1 || !dia.salida1 || idx === diasSemanaActual.length - 1}
                              className={cn(
                                "p-0.5 rounded-md text-xs font-medium transition-colors flex flex-col items-center",
                                (dia.entrada1 && dia.salida1 && idx !== diasSemanaActual.length - 1) 
                                  ? "bg-green-100 hover:bg-green-200 text-green-700" 
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                              )}
                              title="Copiar al resto de la semana"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="text-[8px] mt-0.5">Semana</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => copiarAlRestoMes(fechaStr)}
                              disabled={!dia.entrada1 || !dia.salida1}
                              className={cn(
                                "p-0.5 rounded-md text-xs font-medium transition-colors flex flex-col items-center",
                                (dia.entrada1 && dia.salida1) 
                                  ? "bg-purple-100 hover:bg-purple-200 text-purple-700" 
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                              )}
                              title="Copiar al resto del mes"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                              </svg>
                              <span className="text-[8px] mt-0.5">Mes</span>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* TOTAL */}
                      <div className="text-center font-bold text-blue-900 text-sm relative group pt-2">
                        <div>
                          {dia.total || "0:00"}
                        </div>
                        {/* TOTAL MONETARIO OCULTO - Para volver a mostrar, cambia 'false' por 'true' en la siguiente línea */}
                        {false && dia.total && dia.total !== "0:00" && (
                          <div className="text-xs font-normal text-green-600">
                            ${formatNumberWithSpace(calcularValorMonetarioDia(fechaStr, dia).total)}
                          </div>
                        )}
                        
                        {/* TOOLTIP CON DESGLOSE OCULTO - Para volver a mostrar, cambia 'false' por 'true' en la siguiente línea */}
                        {false && dia.total && dia.total !== "0:00" && dia.total !== "Error" && calcularValorMonetarioDia(fechaStr, dia).desglose.length > 0 && (
                          <div className="absolute z-50 invisible group-hover:visible bg-white border border-gray-200 shadow-lg rounded-md p-3 w-96 -left-40 top-full mt-1">
                            <div className="text-left text-sm font-medium text-gray-700 mb-2">
                              Desglose de horas:
                            </div>
                            <div className="space-y-1">
                              {calcularValorMonetarioDia(fechaStr, dia).desglose.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs gap-3 min-w-0">
                                  <span className="text-gray-600 whitespace-nowrap">{item.tipo} ({item.horas})</span>
                                  <span className="text-green-600 font-medium whitespace-nowrap flex-shrink-0">${formatNumberWithSpace(item.valor)}</span>
                                </div>
                              ))}
                              
                              {/* Mostrar horas compensatorias si existen */}
                              {(() => {
                                const resultado = calcularValorMonetarioDia(fechaStr, dia);
                                return resultado.horasCompensatorias > 0 || resultado.esElDiaDelTope;
                              })() && (
                                <div className="mt-2 pt-1 border-t border-gray-200">
                                  
      
                                  {/* Mensaje cuando es el día del tope */}
                                  {(() => {
                                    const resultado = calcularValorMonetarioDia(fechaStr, dia);
                                    return resultado.esElDiaDelTope;
                                  })() && (
                                    <div className="text-xs text-red-600 italic mt-1">
                                       A partir de este momento todas las horas horas trabajadas se convierten en tiempo compensatorio, Ir a calculo y reportes para mas detalles
                                  
                                    </div>
                                    
                                    
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* FESTIVOS */}
                      <div className="flex justify-center pt-2">
                        {dia.isHoliday ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F44E4E] text-white font-bold text-xs">
                            <AlertCircle className="w-3 h-3" />
                            Festivo
                          </span>
                        ) : dia.isSunday ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F44E4E] text-white font-bold text-xs">
                            <AlertCircle className="w-3 h-3" />
                            Domingo
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </>
      )}
      {/* Cálculos y Reportes */}
      {tab === 'calculos' && (
        <>
          {/* Resumen y cálculos */}
          <section className="flex flex-col items-center gap-8 w-full">
            <div className="w-full flex flex-col md:flex-row gap-6">
              <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-2 min-w-[400px] md:min-w-[500px]">
                <div className="uppercase text-gray-500 font-bold text-sm mb-2">Total trabajo mensual</div>
                <div className="flex flex-row gap-4 justify-between">
                  <div>
                    <div className="text-xs text-gray-500 font-bold">Tiempo total</div>
                    <div className="text-2xl font-bold text-black">{formatTime(totalHorasMes)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-bold">Recargos</div>
                    <div className="text-2xl font-bold text-red-500 whitespace-nowrap">${formatNumberWithSpace(totalRecargos)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-bold">Horas Extras</div>
                    <div className="text-2xl font-bold text-red-500 whitespace-nowrap">${formatNumberWithSpace(totalHorasExtras)}</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4 min-w-[260px]">
                <div className="uppercase text-gray-500 font-bold text-sm mb-2">Calcular precio horas extras</div>
                <div>
                  <div className="text-xs text-gray-500 font-bold mb-1">Cargo</div>
                  <Select value={cargoSeleccionado || 'default'} onValueChange={handleCambiarCargo}>
                    <SelectTrigger id="cargo">
                      <SelectValue placeholder="Seleccionar cargo" />
                    </SelectTrigger>
                    <SelectContent className="bg-white shadow-lg border border-gray-200 z-50">
                      {Array.isArray(cargosState) && cargosState.map((cargo) => (
                        <SelectItem key={cargo.id} value={cargo.nombre || 'default'}>
                          {cargo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-bold mb-1">Salario mensual</div>
                  <div className="text-2xl font-bold text-black">$ {formatNumberWithSpace(salarioMensual)}</div>
                </div>
              </div>
              <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-2 min-w-[260px]">
                <div className="uppercase text-gray-500 font-bold text-sm mb-2">Resumen</div>
                <div className="flex flex-row gap-8 justify-between">
                  <div>
                    <div className="text-xs text-gray-500 font-bold">Total recargos y horas extras</div>
                    <div className="text-2xl font-bold text-red-500">${formatNumberWithSpace(totalAPagar)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-bold">Tiempo compensatorio</div>
                    <div className="text-2xl font-bold text-black">
                      {`${Math.floor(tiempoCompensatorio)} h ${Math.floor((tiempoCompensatorio - Math.floor(tiempoCompensatorio)) * 60)} min`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center w-full mt-2">
              <button className="bg-red-500 hover:bg-red-500 text-white w-auto px-10 py-4 text-lg font-bold rounded-lg shadow flex items-center gap-2 justify-center transition-colors" onClick={calcularHorasYRecargos} type="button">
                <Clock className="w-5 h-5" />
                CALCULAR HORAS Y RECARGOS
              </button>
              {errorValidacion && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4 text-center w-full" role="alert">
                  <strong className="font-bold">Error: </strong>
                  <span className="block sm:inline">{errorValidacion}</span>
                </div>
              )}
            </div>
            <section className="w-full mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Recargos */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
                <div className="uppercase text-bomberored-700 font-bold text-base mb-2">Recargos</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Nocturnas L-S</span>
                    <span>{formatTime(calculoHoras.horasNocturnasLV)} <span className="text-gray-400">(${formatCurrency(valorRecargoNocturnoLV)})</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diurnas Festivo</span>
                    <span>{formatTime(calculoHoras.horasDiurnasFestivos)} <span className="text-gray-400">(${formatCurrency(valorRecargoDiurnoFestivo)})</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nocturnas Festivo</span>
                    <span>{formatTime(calculoHoras.horasNocturnasFestivos)} <span className="text-gray-400">(${formatCurrency(valorRecargoNocturnoFestivo)})</span></span>
                  </div>
                </div>
                <div className="font-bold text-right mt-2">Total Recargos: <span className="text-bomberored-700">${formatCurrency(totalRecargos)}</span></div>
              </div>

              {/* Horas Extras */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
                <div className="uppercase text-bomberored-700 font-bold text-base mb-2">
                  Horas Extras
                  <span className="text-xs font-normal text-gray-500 block mt-1">VALORES AJUSTADOS AL TOPE DEL 50%</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Extra Diurna L-S</span>
                    <span>{formatTime(calculoHoras.horasExtDiurnasLV)} <span className="text-gray-400">(${formatCurrency(valorExtraDiurnaLV)})</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra Nocturna L-S</span>
                    <span>{formatTime(calculoHoras.horasExtNocturnasLV)} <span className="text-gray-400">(${formatCurrency(valorExtraNocturnaLV)})</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra Diurna Festivo</span>
                    <span>{formatTime(calculoHoras.horasExtDiurnasFestivos)} <span className="text-gray-400">(${formatCurrency(valorExtraDiurnaFestivo)})</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra Nocturna Festivo</span>
                    <span>{formatTime(calculoHoras.horasExtNocturnasFestivos)} <span className="text-gray-400">(${formatCurrency(valorExtraNocturnaFestivo)})</span></span>
                  </div>
                </div>
                <div className="font-bold text-right mt-2">Total Extras: <span className="text-bomberored-700">${formatCurrency(totalHorasExtras)}</span></div>
              </div>
              
              {/* Tiempo Compensatorio */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
                <div className="uppercase text-green-700 font-bold text-base mb-2">Tiempo Compensatorio</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Horas Compensatorias</span>
                    <span>{Math.floor(tiempoCompensatorio)} h {Math.floor((tiempoCompensatorio - Math.floor(tiempoCompensatorio)) * 60)} min</span>
                  </div>
                </div>
                
                {/* Desglose del tiempo compensatorio - Mostrar siempre */}
                <div className="mt-2 space-y-2 border-t pt-2 border-gray-100">
                    <div className="text-sm font-semibold text-gray-700 mb-1">Desglose por tipo de hora extra:</div>
                    
                    {/* Siempre mostrar todos los tipos, incluso con valor cero */}
                    <div className="flex justify-between text-sm">
                      <span>Extra Diurna L-S ({(desgloseCompensatorio.diurnaLV.porcentaje * 100).toFixed(0)}%)</span>
                      <span>{Math.floor(desgloseCompensatorio.diurnaLV.minutos / 60)}h {Math.floor(desgloseCompensatorio.diurnaLV.minutos % 60)}m <span className="text-gray-400">(${formatCurrency(desgloseCompensatorio.diurnaLV.valor)})</span></span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Extra Nocturna L-S ({(desgloseCompensatorio.nocturnaLV.porcentaje * 100).toFixed(0)}%)</span>
                      <span>{Math.floor(desgloseCompensatorio.nocturnaLV.minutos / 60)}h {Math.floor(desgloseCompensatorio.nocturnaLV.minutos % 60)}m <span className="text-gray-400">(${formatCurrency(desgloseCompensatorio.nocturnaLV.valor)})</span></span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Extra Diurna Festivo ({(desgloseCompensatorio.diurnaFestivo.porcentaje * 100).toFixed(0)}%)</span>
                      <span>{Math.floor(desgloseCompensatorio.diurnaFestivo.minutos / 60)}h {Math.floor(desgloseCompensatorio.diurnaFestivo.minutos % 60)}m <span className="text-gray-400">(${formatCurrency(desgloseCompensatorio.diurnaFestivo.valor)})</span></span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Extra Nocturna Festivo ({(desgloseCompensatorio.nocturnaFestivo.porcentaje * 100).toFixed(0)}%)</span>
                      <span>{Math.floor(desgloseCompensatorio.nocturnaFestivo.minutos / 60)}h {Math.floor(desgloseCompensatorio.nocturnaFestivo.minutos % 60)}m <span className="text-gray-400">(${formatCurrency(desgloseCompensatorio.nocturnaFestivo.valor)})</span></span>
                    </div>
                  </div>
                
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-sm text-gray-600 mb-2">
                    El tiempo compensatorio representa las horas que pueden ser tomadas como descanso en lugar de ser pagadas.
                    Cada tipo de hora mantiene su porcentaje correspondiente.
                  </div>
                </div>
                <div className="font-bold text-right mt-2">
                  Valor Total: <span className="text-green-700">${formatCurrency(valorTotalCompensatorioDesglosado || 0)}</span>
                </div>
              </div>
            </section>
            {/* Resumen final */}
            <div className="w-full mt-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div className="font-bold text-lg">
                  Total recargos y horas extras: <span className="text-bomberored-800">${formatCurrency(totalAPagar)}</span>
                </div>
              </div>
            </div>
            {topeFecha && topeHora && (
              <div className="w-full text-right mt-2 font-medium text-base text-gray-700">
                Tope del 50% alcanzado el <span className="font-bold">{format(parse(topeFecha, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}</span> a las <span className="font-bold">{topeHora}</span>
                <div className="text-sm text-gray-600 mt-1">
                  Los valores de horas extras han sido ajustados proporcionalmente para sumar exactamente el tope del 50% del salario (${formatCurrency(topeMaximo)})
                </div>
              </div>
            )}
          </section>
        </>
      )}
      {/* Gestión de Cargos */}
      {tab === 'gestion-cargos' && autenticadoGestionCargos && (
        <section className="flex flex-col gap-6 w-full">
          {/* Pestañas para Cargos y Festivos */}
          <div className="bg-gray-100 rounded-xl p-2 flex mb-2">
            <button
              className={`px-6 py-2 rounded-md font-bold transition-colors ${tab === 'gestion-cargos' ? 'bg-white text-black shadow' : 'text-gray-500'}`}
              onClick={() => {}}
            >
              Gestión de Cargos
            </button>
            <button
              className={`px-6 py-2 rounded-md font-bold transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-100`}
              onClick={scrollToFestivos}
            >
              Gestión de Festivos
            </button>
          </div>
          
          {/* Sección de Cargos */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-red-500"
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
              <h2 className="text-2xl font-bold text-gray-900">Agregar Nuevo Cargo</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSubmitCargo(e);
            }} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="nuevoCargo">Nombre del Cargo</Label>
                <Input
                  id="nuevoCargo"
                  value={nuevoCargo}
                  onChange={handleNuevoCargoChange}
                  placeholder="Ingrese el nombre del cargo"
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="nuevoSalario">Salario Base</Label>
                <Input
                  id="nuevoSalario"
                  type="number"
                  value={nuevoSalario}
                  onChange={handleNuevoSalarioChange}
                  placeholder="Ingrese el salario base"
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="bg-red-500 hover:bg-red-600">
                  Agregar Cargo
                </Button>
              </div>
            </form>
            
            {errorValidacion && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{errorValidacion}</span>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900">Lista de Cargos</h2>
            </div>
            
            <div className="space-y-4">
              {Array.isArray(cargosState) && cargosState.length > 0 ? (
                cargosState.map((cargo) => (
                  <div key={cargo.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm">
                    {editandoCargo === cargo.id.toString() ? (
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <Label htmlFor={`editCargo-${cargo.id}`}>Nombre</Label>
                          <Input
                            id={`editCargo-${cargo.id}`}
                            value={valorEditando}
                            onChange={(e) => setValorEditando(e.target.value)}
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
                            disabled={cargo.nombre === cargoSeleccionado}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No hay cargos registrados</p>
              )}
            </div>
          </div>
          
          {/* Sección de Festivos */}
          <div id="gestion-festivos" className="bg-white rounded-xl shadow-md p-6 mt-8">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Festivos</h2>
            </div>
            
            <div className="mb-6">
              <Label htmlFor="añoFestivos" className="mb-2 block">Seleccionar Año</Label>
              <Select value={añoSeleccionado} onValueChange={handleCambioAñoFestivos}>
                <SelectTrigger id="añoFestivos" className="w-full md:w-48">
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent className="bg-white shadow-lg border border-gray-200 z-50">
                  {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i).map((año) => (
                    <SelectItem key={año} value={año.toString()}>
                      {año}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <form onSubmit={handleSubmitFestivo} className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-lg mb-4">Agregar Nuevo Festivo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="nuevoFestivoFecha">Fecha</Label>
                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 w-full"
                      onClick={() => setShowFestivoDatePicker(true)}
                    >
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {nuevoFestivoFecha 
                          ? format(nuevoFestivoFecha, "dd/MM/yyyy") 
                          : "Seleccionar fecha"}
                      </span>
                    </button>
                    {showFestivoDatePicker && (
                      <div className="absolute left-0 top-full mt-2 bg-white rounded-xl shadow-lg z-30">
                        <DatePicker
                          selected={nuevoFestivoFecha}
                          onChange={(date: Date | null) => {
                            setNuevoFestivoFecha(date);
                            setShowFestivoDatePicker(false);
                          }}
                          onClickOutside={() => setShowFestivoDatePicker(false)}
                          dateFormat="dd/MM/yyyy"
                          inline
                          locale={es}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="nuevoFestivoNombre">Nombre</Label>
                  <Input
                    id="nuevoFestivoNombre"
                    value={nuevoFestivoNombre}
                    onChange={(e) => setNuevoFestivoNombre(e.target.value)}
                    placeholder="Nombre del festivo"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="nuevoFestivoTipo">Tipo</Label>
                  <Select 
                    value={nuevoFestivoTipo} 
                    onValueChange={(value) => setNuevoFestivoTipo(value as 'FIJO' | 'MOVIL')}
                  >
                    <SelectTrigger id="nuevoFestivoTipo" className="w-full">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-white shadow-lg border border-gray-200 z-50">
                      <SelectItem value="FIJO">Fijo</SelectItem>
                      <SelectItem value="MOVIL">Móvil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Button type="submit" className="bg-red-500 hover:bg-red-600">
                  Agregar Festivo
                </Button>
              </div>
              
              {errorFestivo && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                  <strong className="font-bold">Error: </strong>
                  <span className="block sm:inline">{errorFestivo}</span>
                </div>
              )}
            </form>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">Festivos del año {añoSeleccionado}</h3>
              
              {festivosPorAño.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {festivosPorAño.map((festivo) => (
                        <tr key={festivo.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {festivo.fecha.split('-').reverse().join('/')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {festivo.nombre}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {festivo.tipo === 'FIJO' ? 'Fijo' : 'Móvil'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleEliminarFestivo(festivo.fecha)}
                            >
                              Eliminar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay festivos registrados para el año {añoSeleccionado}</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
