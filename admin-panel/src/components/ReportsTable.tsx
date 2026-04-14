/* ==========================================================================
   ReportsTable — Tabla de reportes con estado
   --------------------------------------------------------------------------
   Muestra los reportes de contenido inapropiado en una tabla visual.
   Consume el endpoint GET /api/rbac/reports
   
   Cada reporte muestra:
   - ID del reporte
   - Usuario que reportó
   - Motivo del reporte
   - Estado (pending/resolved/rejected) con color
   - Fecha de creación
   ========================================================================== */

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
}

// Color del badge según el estado del reporte
const colorEstado: Record<string, string> = {
  pending:  "bg-yellow-500 text-yellow-950",
  resolved: "bg-green-500 text-green-950",
  rejected: "bg-gray-500 text-gray-950",
}

// Texto en español del estado
const textoEstado: Record<string, string> = {
  pending:  "Pendiente",
  resolved: "Resuelto",
  rejected: "Rechazado",
}

export default function ReportsTable({ datos }: ReportsTableProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-bold">🚨 Reportes</h2>

      {/* RESUMEN */}
      <div className="flex gap-4 mb-4">
        <span className="bg-yellow-500 text-yellow-950 px-3 py-1 rounded-full text-sm font-semibold">
          {datos.filter(r => r.status === "pending").length} pendientes
        </span>
        <span className="bg-green-500 text-green-950 px-3 py-1 rounded-full text-sm font-semibold">
          {datos.filter(r => r.status === "resolved").length} resueltos
        </span>
        <span className="bg-gray-500 text-gray-950 px-3 py-1 rounded-full text-sm font-semibold">
          {datos.filter(r => r.status === "rejected").length} rechazados
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
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((reporte, i) => (
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
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorEstado[reporte.status]}`}>
                    {textoEstado[reporte.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(reporte.created_at).toLocaleDateString("es-ES")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}