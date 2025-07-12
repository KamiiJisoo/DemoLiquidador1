"use client"

import { useSearchParams } from "next/navigation"

export default function ReportePage() {
  const params = useSearchParams()

  // Leer los valores de la URL
  const total = params.get("total") || "00:00"
  const recNocturno = params.get("recNocturno") || "00:00"
  const recDomNoct = params.get("recDomNoct") || "00:00"
  const recDomDia = params.get("recDomDia") || "00:00"
  const extDia = params.get("extDia") || "00:00"
  const extNoct = params.get("extNoct") || "00:00"
  const extDomDia = params.get("extDomDia") || "00:00"
  const extDomNoct = params.get("extDomNoct") || "00:00"

  return (
    <div className="w-full py-6">
      <div className="bg-red-700 text-white p-4 text-center font-bold text-lg mb-4">
        REPORTE COMPLETO RECARGOS Y HORAS EXTRAS
      </div>
      <div className="bg-white p-6 rounded shadow">
        <div className="mb-6">
          <h2 className="font-bold text-xl mb-2">TOTAL TRABAJO MENSUAL</h2>
          <div>
            <span className="font-bold">Tiempo total</span>
            <div className="text-2xl font-bold">{total}</div>
          </div>
        </div>
        <div className="mb-6">
          <h2 className="font-bold text-xl mb-2">RECARGOS</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="font-bold">Lunes a sábado (6:00 p.m. a 6:00 a.m.)</span>
              <div className="text-2xl font-bold">{recNocturno}</div>
            </div>
            <div>
              <span className="font-bold">Domingos y festivos (6:00 p.m. a 6:00 a.m.)</span>
              <div className="text-2xl font-bold">{recDomNoct}</div>
            </div>
            <div>
              <span className="font-bold">Domingos y festivos (6:00 a.m. a 6:00 p.m.)</span>
              <div className="text-2xl font-bold">{recDomDia}</div>
            </div>
          </div>
        </div>
        <div>
          <h2 className="font-bold text-xl mb-2">HORAS EXTRAS</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="font-bold">Lunes a sábado (6:00 a.m. a 6:00 p.m.)</span>
              <div className="text-2xl font-bold">{extDia}</div>
            </div>
            <div>
              <span className="font-bold">Lunes a sábado (6:00 p.m. a 6:00 a.m.)</span>
              <div className="text-2xl font-bold">{extNoct}</div>
            </div>
            <div>
              <span className="font-bold">Domingos y festivos (6:00 a.m. a 6:00 p.m.)</span>
              <div className="text-2xl font-bold">{extDomDia}</div>
            </div>
            <div>
              <span className="font-bold">Domingos y festivos (6:00 p.m. a 6:00 a.m.)</span>
              <div className="text-2xl font-bold">{extDomNoct}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 