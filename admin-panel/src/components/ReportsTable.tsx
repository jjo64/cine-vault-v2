/* ==========================================================================
   ReportsTable — Tabla de reportes con estado y acciones
   --------------------------------------------------------------------------
   Muestra los reportes de contenido inapropiado en una tabla visual.
   El admin puede resolver, rechazar y ver el contenido de cada reporte.
   Consume el endpoint GET /api/rbac/reports
   ========================================================================== */

import { useState } from "react"

const API = "http://localhost:4000/api"

interface Review {
  id: number
  content: string | null
  rating: string
}

interface User {
  id: number
  username: string
  role: string
}

interface Report {
  id: number
  reporter_id: number
  review_id: number
  reason: string
  status: "pending" | "resolved" | "rejected"
  created_at: string
  users: User
  reviews: Review
}

interface ReportsTableProps {
  datos: Report[]
  token: string
}

const colorEstado: Record<string, string> = {
  pending:  "bg-yellow-500 text-yellow-950",
  resolved: "bg-green-500 text-green-950",
  rejected: "bg-gray-500 text-gray-950",
}

const textoEstado: Record<string, string> = {
  pending:  "Pendiente",
  resolved: "Resuelto",
  rejected: "Rechazado",
}

export default function ReportsTable({ datos, token }: ReportsTableProps) {
  const [reportes, setReportes] = useState(datos)
  const [reporteExpandido, setReporteExpandido] = useState<number | null>(null)

  const actualizarEstado = async (reporteId: number, status: "resolved" | "rejected") => {
  console.log("Actualizando reporte:", reporteId, "a estado:", status)
  const res = await fetch(`${API}/rbac/reports/${reporteId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  })
  console.log("Respuesta status:", res.status)
  const resultado = await res.json()
  console.log("Respuesta data:", resultado)
  if (resultado.error) {
    alert("Error: " + resultado.error.message)
  } else {
    setReportes(prev =>
      prev.map(r => r.id === reporteId ? { ...r, status } : r)
    )
  }
}

  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-bold">🚨 Reportes</h2>

      {/* RESUMEN */}
      <div className="flex gap-4 mb-4">
        <span className="bg-yellow-500 text-yellow-950 px-3 py-1 rounded-full text-sm font-semibold">
          {reportes.filter(r => r.status === "pending").length} pendientes
        </span>
        <span className="bg-green-500 text-green-950 px-3 py-1 rounded-full text-sm font-semibold">
          {reportes.filter(r => r.status === "resolved").length} resueltos
        </span>
        <span className="bg-gray-500 text-gray-950 px-3 py-1 rounded-full text-sm font-semibold">
          {reportes.filter(r => r.status === "rejected").length} rechazados
        </span>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Reportado por</th>
              <th className="px-4 py-3 text-left">Motivo</th>
              <th className="px-4 py-3 text-left">Reseña</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reportes.map((reporte, i) => (
              <>
                <tr
                  key={reporte.id}
                  className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}
                >
                  <td className="px-4 py-3 text-gray-400">#{reporte.id}</td>
                  <td className="px-4 py-3 text-white font-medium">
                    {reporte.users?.username ?? "Desconocido"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{reporte.reason}</td>
                  <td className="px-4 py-3">
                    <button
                      className="text-indigo-400 hover:text-indigo-300 text-xs underline"
                      onClick={() => setReporteExpandido(
                        reporteExpandido === reporte.id ? null : reporte.id
                      )}
                    >
                      {reporteExpandido === reporte.id ? "Ocultar" : "Ver reseña"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorEstado[reporte.status]}`}>
                      {textoEstado[reporte.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(reporte.created_at).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-4 py-3">
                    {reporte.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-semibold"
                          onClick={() => actualizarEstado(reporte.id, "resolved")}
                        >
                          ✅ Resolver
                        </button>
                        <button
                          className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-semibold"
                          onClick={() => actualizarEstado(reporte.id, "rejected")}
                        >
                          ❌ Rechazar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {/* RESEÑA EXPANDIDA */}
                {reporteExpandido === reporte.id && (
                  <tr className="bg-gray-800 border-t border-gray-700">
                    <td colSpan={7} className="px-6 py-4">
                      <p className="text-gray-400 text-xs uppercase mb-1">Contenido de la reseña</p>
                      <p className="text-gray-200 text-sm">
                        {reporte.reviews?.content ?? "Sin contenido"}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Rating: {reporte.reviews?.rating} / 5
                      </p>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}