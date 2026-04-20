/* ==========================================================================
   ReportsTable — Tabla de reportes con modal de gestión completa
   --------------------------------------------------------------------------
   Muestra los reportes en una tabla limpia. Al pulsar "Gestionar" se abre
   un modal con el contenido completo, datos del usuario y acciones de
   moderación disponibles (strike, warning, ban temporal/permanente,
   rechazar o resolver).
   Consume: GET /api/rbac/reports
   Acciones: PATCH /api/rbac/reports/:id
             POST  /api/rbac/users/:id/strikes
             POST  /api/rbac/users/:id/warning
             PATCH /api/rbac/users/:id/ban
   ========================================================================== */

import { useState } from "react"

const API = "http://localhost:4000/api"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id: number
  content: string | null
  rating: string
  // El autor de la reseña (usuario reportado).
  // Requiere que el backend haga include/join de reviews.users en GET /rbac/reports
  users?: {
    id: number
    username: string
    role: string
    membership?: string
  }
}

interface Reporter {
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
  resolution_note?: string
  created_at: string
  users: Reporter   // quien reporta
  reviews: Review   // reseña reportada (incluye autor si el backend lo join-ea)
}

interface ReportsTableProps {
  datos: Report[]
  token: string
}

type StrikeType = "spoiler" | "spam" | "acoso"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ─── Componentes menores ──────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  pending:  "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  resolved: "bg-green-500/10 text-green-400 border border-green-500/20",
  rejected: "bg-gray-700/50 text-gray-400 border border-gray-600/30",
}
const STATUS_LABEL: Record<string, string> = {
  pending:  "Pendiente",
  resolved: "Resuelto",
  rejected: "Rechazado",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function MetaPill({
  label,
  value,
  warn = false,
}: {
  label: string
  value: string | number
  warn?: boolean
}) {
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-md border ${
        warn
          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          : "bg-zinc-800 text-zinc-400 border-zinc-700"
      }`}
    >
      {label}: <span className="font-medium">{value}</span>
    </span>
  )
}

// ─── Modal de gestión ─────────────────────────────────────────────────────────

function ManageModal({
  report,
  token,
  onClose,
  onDone,
}: {
  report: Report
  token: string
  onClose: () => void
  onDone: (id: number, status: "resolved" | "rejected") => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // El usuario reportado es el autor de la reseña
  const reportedUser = report.reviews?.users
  const reportedUserId = reportedUser?.id
  const contenido = report.reviews?.content ?? "(sin contenido)"

  async function call(path: string, method: string, body?: object) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error?.message ?? `Error ${res.status}`)
    }
    return res.json()
  }

  async function resolveReport(status: "resolved" | "rejected", note: string) {
    await call(`/rbac/reports/${report.id}`, "PATCH", { status, resolution_note: note })
    onDone(report.id, status)
  }

  async function handleAction(action: string) {
    setLoading(true)
    setError("")
    try {
      if (!reportedUserId && !["rechazar", "resolver"].includes(action)) {
        throw new Error(
          "No se puede identificar al usuario reportado. " +
          "El backend debe incluir reviews.users en GET /rbac/reports."
        )
      }

      switch (action) {
        case "strike_spoiler":
          await call(`/rbac/users/${reportedUserId}/strikes`, "POST", { tipo: "spoiler" satisfies StrikeType })
          await resolveReport("resolved", "Strike (spoiler) aplicado")
          break

        case "strike_spam":
          await call(`/rbac/users/${reportedUserId}/strikes`, "POST", { tipo: "spam" satisfies StrikeType })
          await resolveReport("resolved", "Strike (spam) aplicado")
          break

        case "strike_acoso":
          await call(`/rbac/users/${reportedUserId}/strikes`, "POST", { tipo: "acoso" satisfies StrikeType })
          await resolveReport("resolved", "Strike (acoso) aplicado")
          break

        case "warning":
          await call(`/rbac/users/${reportedUserId}/warning`, "POST")
          await resolveReport("resolved", "Warning enviado al usuario")
          break

        case "ban_temp": {
          const until = new Date()
          until.setDate(until.getDate() + 30)
          await call(`/rbac/users/${reportedUserId}/ban`, "PATCH", {
            locked_until: until.toISOString(),
          })
          await resolveReport("resolved", "Ban temporal de 30 días aplicado")
          break
        }

        case "ban_perm":
          await call(`/rbac/users/${reportedUserId}/ban`, "PATCH", {
            locked_until: "2099-12-31T23:59:59.000Z",
          })
          await resolveReport("resolved", "Ban permanente aplicado")
          break

        case "rechazar":
          await resolveReport("rejected", "Reporte rechazado por el admin")
          break

        case "resolver":
          await resolveReport("resolved", "Resuelto sin acción adicional")
          break
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al ejecutar la acción")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-800">
          <div>
            <p className="text-sm font-semibold text-white">
              Gestionar reporte
              {reportedUser && (
                <> sobre <span className="text-indigo-400">@{reportedUser.username}</span></>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              #{report.id} · {formatDate(report.created_at)} · {report.reason}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors ml-4 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Contenido reportado */}
        <div className="p-5 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Contenido reportado
          </p>
          <div className="bg-gray-800/60 border-l-2 border-red-500/60 rounded-r-lg px-3 py-2.5">
            <p className="text-sm text-gray-200 leading-relaxed">{contenido}</p>
            {report.reviews?.rating && (
              <p className="text-xs text-gray-500 mt-1.5">
                Rating: {report.reviews.rating} / 5
              </p>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Reportado por{" "}
            <span className="text-gray-400">@{report.users?.username ?? "Desconocido"}</span>
          </p>
        </div>

        {/* Info usuario reportado */}
        <div className="p-5 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Usuario afectado
          </p>
          {reportedUser ? (
            <div className="flex flex-wrap gap-2">
              <MetaPill label="Usuario" value={`@${reportedUser.username}`} />
              <MetaPill label="Rol" value={reportedUser.role} />
              {reportedUser.membership && (
                <MetaPill label="Membresía" value={reportedUser.membership} />
              )}
            </div>
          ) : (
            <p className="text-xs text-yellow-500/70">
              ⚠ El backend no está devolviendo el autor de la reseña en{" "}
              <code className="font-mono text-yellow-400">reviews.users</code>.
              Añade el include en <code className="font-mono text-yellow-400">RbacRepository</code> para
              habilitar las acciones de moderación.
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Acción a tomar
          </p>

          {/* Strikes por tipo */}
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-1.5">Añadir strike</p>
            <div className="grid grid-cols-3 gap-2">
              {(["spoiler", "spam", "acoso"] as const).map((tipo) => (
                <button
                  key={tipo}
                  disabled={loading || !reportedUserId}
                  onClick={() => handleAction(`strike_${tipo}`)}
                  className="text-xs py-2 px-3 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed capitalize"
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Resto de acciones */}
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={loading || !reportedUserId}
              onClick={() => handleAction("warning")}
              className="text-xs py-2.5 px-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Enviar warning
            </button>
            <button
              disabled={loading || !reportedUserId}
              onClick={() => handleAction("ban_temp")}
              className="text-xs py-2.5 px-3 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Ban temporal (30d)
            </button>
            <button
              disabled={loading || !reportedUserId}
              onClick={() => handleAction("ban_perm")}
              className="text-xs py-2.5 px-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Ban permanente
            </button>
            <button
              disabled={loading}
              onClick={() => handleAction("rechazar")}
              className="text-xs py-2.5 px-3 rounded-lg bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              Rechazar reporte
            </button>
            <button
              disabled={loading}
              onClick={() => handleAction("resolver")}
              className="col-span-2 text-xs py-2.5 px-3 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-40"
            >
              Resolver sin acción adicional
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 mt-3 text-center">{error}</p>
          )}
          {loading && (
            <p className="text-xs text-gray-500 mt-3 text-center">Aplicando acción...</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ReportsTable({ datos, token }: ReportsTableProps) {
  const [reportes, setReportes] = useState<Report[]>(datos)
  const [selected, setSelected] = useState<Report | null>(null)

  function handleDone(id: number, status: "resolved" | "rejected") {
    setReportes((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    setSelected(null)
  }

  const pending  = reportes.filter((r) => r.status === "pending").length
  const resolved = reportes.filter((r) => r.status === "resolved").length
  const rejected = reportes.filter((r) => r.status === "rejected").length

  return (
    <>
      {selected && (
        <ManageModal
          report={selected}
          token={token}
          onClose={() => setSelected(null)}
          onDone={handleDone}
        />
      )}

      <div className="space-y-4">
        <h2 className="text-white text-xl font-bold">🚨 Reportes</h2>

        {/* Resumen */}
        <div className="flex gap-3 flex-wrap">
          <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full text-sm font-medium">
            {pending} pendiente{pending !== 1 ? "s" : ""}
          </span>
          <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-sm font-medium">
            {resolved} resuelto{resolved !== 1 ? "s" : ""}
          </span>
          <span className="bg-gray-700/50 text-gray-400 border border-gray-600/30 px-3 py-1 rounded-full text-sm font-medium">
            {rejected} rechazado{rejected !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Reportado por</th>
                <th className="px-4 py-3 text-left">Motivo</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reportes.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    No hay reportes
                  </td>
                </tr>
              )}
              {reportes.map((reporte, i) => (
                <tr
                  key={reporte.id}
                  className={`border-t border-gray-800 ${
                    i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"
                  }`}
                >
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    #{reporte.id}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">
                    @{reporte.users?.username ?? "Desconocido"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{reporte.reason}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={reporte.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDate(reporte.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {reporte.status === "pending" && (
                      <button
                        onClick={() => setSelected(reporte)}
                        className="text-xs font-semibold text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Gestionar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}