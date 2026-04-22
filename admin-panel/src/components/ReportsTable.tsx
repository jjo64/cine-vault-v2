/* ==========================================================================
   ReportsTable — Tabla de reportes agrupada por motivo
   --------------------------------------------------------------------------
   Muestra los reportes agrupados por sección (motivo).
   Al pulsar "Gestionar" se abre un modal con el contenido completo,
   datos del usuario afectado y acciones de moderación disponibles.
   ========================================================================== */

import { useState } from "react"
import TruncatedCell from "./ui/TruncatedCell"

const API = "http://localhost:4000/api"

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportReason =
  | "lenguaje_ofensivo"
  | "spam"
  | "spoiler"
  | "contenido_inapropiado"
  | "acoso"
  | "otro"

interface Review {
  id: number
  content: string | null
  rating: string
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
  reason: ReportReason
  reason_detail?: string | null
  status: "pending" | "resolved" | "rejected"
  resolution_note?: string
  created_at: string
  users: Reporter
  reviews: Review
}

interface ReportsTableProps {
  datos: Report[]
  token: string
}

type StrikeType = "spoiler" | "spam" | "acoso"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

const REASON_LABEL: Record<ReportReason, string> = {
  lenguaje_ofensivo:    "Lenguaje ofensivo",
  spam:                 "Spam",
  spoiler:              "Spoiler",
  contenido_inapropiado:"Contenido inapropiado",
  acoso:                "Acoso",
  otro:                 "Otro",
}

const REASON_STYLE: Record<ReportReason, string> = {
  lenguaje_ofensivo:    "bg-red-500/10 text-red-400 border-red-500/20",
  spam:                 "bg-orange-500/10 text-orange-400 border-orange-500/20",
  spoiler:              "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  contenido_inapropiado:"bg-purple-500/10 text-purple-400 border-purple-500/20",
  acoso:                "bg-pink-500/10 text-pink-400 border-pink-500/20",
  otro:                 "bg-gray-700/50 text-gray-400 border-gray-600/30",
}

const REASON_ICON: Record<ReportReason, string> = {
  lenguaje_ofensivo:    "🤬",
  spam:                 "📢",
  spoiler:              "🎬",
  contenido_inapropiado:"🚫",
  acoso:                "😤",
  otro:                 "❓",
}

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

function ReasonBadge({ reason }: { reason: ReportReason }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${REASON_STYLE[reason]}`}>
      {REASON_ICON[reason]} {REASON_LABEL[reason]}
    </span>
  )
}

function MetaPill({ label, value, warn = false }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <span className={`text-xs px-2.5 py-1 rounded-md border ${
      warn
        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
        : "bg-zinc-800 text-zinc-400 border-zinc-700"
    }`}>
      {label}: <span className="font-medium">{value}</span>
    </span>
  )
}

const MOTIVOS_RECHAZO = [
  "No viola las normas de la comunidad",
  "El reporte está fuera de contexto",
  "No hay evidencia suficiente",
  "Contenido ya revisado anteriormente",
  "Reporte duplicado",
]
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
  const [error, setError]     = useState("")

  const reportedUser   = report.reviews?.users
  const reportedUserId = reportedUser?.id
  const contenido      = report.reviews?.content ?? "(sin contenido)"
  const [rechazando, setRechazando] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState("")
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("")
  const [mensajeAdmin, setMensajeAdmin] = useState("")
  const [confirmando, setConfirmando] = useState<"ban_temp" | "ban_perm" | null>(null)

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

  async function resolveReport(status: "resolved" | "rejected", note: string, mensajePersonalizado?: string) {
  await call(`/rbac/reports/${report.id}`, "PATCH", {
    status,
    resolution_note: note,
    mensaje_personalizado: mensajePersonalizado,
  })
  onDone(report.id, status)
  }

    async function handleAction(action: string, nota?: string, mensajePersonalizado?: string) {
    setLoading(true)
    setError("")
    try {
      if (!reportedUserId && !["rechazar", "resolver"].includes(action)) {
        throw new Error("No se puede identificar al usuario reportado.")
      }
      switch (action) {
        case "rechazar_con_motivo":
        await resolveReport("rejected", nota ?? "Reporte rechazado por el admin", mensajePersonalizado)
        break
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
          await call(`/rbac/users/${reportedUserId}/warning`, "POST", {
            contenidoOfensivo: contenido
          })
          await resolveReport("resolved", "Warning enviado al usuario")
          break
        case "ban_temp": {
          const until = new Date()
          until.setDate(until.getDate() + 30)
          await call(`/rbac/users/${reportedUserId}/ban`, "PATCH", { locked_until: until.toISOString() })
          await resolveReport("resolved", "Ban temporal de 30 días aplicado")
          break
        }
        case "ban_perm":
          await call(`/rbac/users/${reportedUserId}/ban`, "PATCH", { locked_until: "2099-12-31T23:59:59.000Z" })
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
    <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-800">
          <div>
            <p className="text-sm font-semibold text-white">
              Gestionar reporte
              {reportedUser && (
                <> sobre <span className="text-indigo-400">@{reportedUser.username}</span></>
              )}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <ReasonBadge reason={report.reason} />
              <span className="text-xs text-gray-500 font-mono">#{report.id} · {formatDate(report.created_at)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors ml-4 text-xl leading-none">✕</button>
        </div>

        {/* Contenido reportado */}
        <div className="p-5 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Contenido reportado
          </p>
          <div className="bg-gray-800/60 border-l-2 border-red-500/60 rounded-r-lg px-3 py-2.5">
            <p className="text-sm text-gray-200 leading-relaxed">{contenido}</p>
            {report.reviews?.rating && (
              <p className="text-xs text-gray-500 mt-1.5">Rating: {report.reviews.rating} / 5</p>
            )}
          </div>
          {/* Motivo detallado del reporter */}
          {report.reason_detail && (
            <div className="mt-2 bg-gray-800/40 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-0.5">Motivo del reporte:</p>
              <p className="text-xs text-gray-300 italic">"{report.reason_detail}"</p>
            </div>
          )}
          <p className="text-xs text-gray-600 mt-2">
            Reportado por <span className="text-gray-400">@{report.users?.username ?? "Desconocido"}</span>
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
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Acción a tomar
          </p>
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
              onClick={() => setConfirmando("ban_temp")}
              className="text-xs py-2.5 px-3 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Ban temporal (30d)
            </button>
            <button
              disabled={loading || !reportedUserId}
              onClick={() => setConfirmando("ban_perm")}
              className="text-xs py-2.5 px-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Ban permanente
            </button>
            <button
              disabled={loading}
              onClick={() => setRechazando(true)}
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

          {/* Confirmación de ban */}
          {confirmando && (
            <div className="mt-3 bg-gray-800/60 rounded-lg p-3 border border-red-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-sm">⚠️</span>
                <p className="text-xs font-semibold text-red-400">
                  {confirmando === "ban_perm"
                    ? "¿Confirmas el ban permanente?"
                    : "¿Confirmas el ban temporal de 30 días?"}
                </p>
              </div>
              <p className="text-xs text-gray-500">
                {confirmando === "ban_perm"
                  ? `@${reportedUser?.username ?? "este usuario"} no podrá acceder a CineVault. Esta acción queda registrada en el historial de moderación.`
                  : `@${reportedUser?.username ?? "este usuario"} no podrá acceder a CineVault durante 30 días. Esta acción queda registrada en el historial de moderación.`}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={loading}
                  onClick={async () => {
                    await handleAction(confirmando)
                    setConfirmando(null)
                  }}
                  className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors disabled:opacity-40 ${
                    confirmando === "ban_perm"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-orange-600 hover:bg-orange-700 text-white"
                  }`}
                >
                  {confirmando === "ban_perm" ? "Sí, banear permanentemente" : "Sí, banear 30 días"}
                </button>
                <button
                  disabled={loading}
                  onClick={() => setConfirmando(null)}
                  className="text-xs py-2 px-3 rounded-lg bg-transparent text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Formulario de rechazo */}
          {rechazando && (
  <div className="mt-3 bg-gray-800/60 rounded-lg p-3 border border-gray-700 space-y-3">
    <p className="text-xs font-semibold text-gray-400">Motivo del rechazo</p>

    {/* Opciones predefinidas */}
    <div className="space-y-1.5">
      {MOTIVOS_RECHAZO.map(motivo => (
        <label
          key={motivo}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <input
            type="radio"
            name="motivoRechazo"
            value={motivo}
            checked={motivoRechazo === motivo}
            onChange={e => setMotivoRechazo(e.target.value)}
            className="accent-indigo-500"
          />
          <span className={`text-xs transition-colors ${
            motivoRechazo === motivo ? "text-white" : "text-gray-400 group-hover:text-gray-300"
          }`}>
            {motivo}
          </span>
        </label>
      ))}
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="radio"
          name="motivoRechazo"
          value="personalizado"
          checked={motivoRechazo === "personalizado"}
          onChange={e => setMotivoRechazo(e.target.value)}
          className="accent-indigo-500"
        />
        <span className={`text-xs transition-colors ${
          motivoRechazo === "personalizado" ? "text-white" : "text-gray-400 group-hover:text-gray-300"
        }`}>
          Otro motivo...
        </span>
      </label>
    </div>

    {/* Texto libre si selecciona "personalizado" */}
    {motivoRechazo === "personalizado" && (
      <textarea
        className="w-full bg-gray-900 text-gray-200 text-xs px-3 py-2 rounded-lg border border-gray-700 focus:border-indigo-500 focus:outline-none resize-none"
        rows={2}
        placeholder="Describe el motivo..."
        value={motivoPersonalizado}
        onChange={e => setMotivoPersonalizado(e.target.value)}
      />
    )}

    {/* Mensaje personalizado del admin */}
    <div className="space-y-1">
      <p className="text-xs text-gray-500">
        Mensaje adicional al usuario <span className="text-gray-600">(opcional)</span>
      </p>
      <textarea
        className="w-full bg-gray-900 text-gray-200 text-xs px-3 py-2 rounded-lg border border-gray-700 focus:border-indigo-500 focus:outline-none resize-none"
        rows={2}
        placeholder="Añade contexto adicional para el usuario..."
        value={mensajeAdmin}
        onChange={e => setMensajeAdmin(e.target.value)}
      />
    </div>
 
    {/* Botones de confirmación */}
    <div className="flex gap-2 pt-1">
      <button
        disabled={loading || !motivoRechazo || (motivoRechazo === "personalizado" && !motivoPersonalizado.trim())}
        onClick={async () => {
        const nota = motivoRechazo === "personalizado"
          ? motivoPersonalizado.trim()
          : motivoRechazo
        await handleAction("rechazar_con_motivo", nota, mensajeAdmin.trim() || undefined)
        setRechazando(false)
        setMensajeAdmin("")
      }}
        className="flex-1 text-xs py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
      >
        Confirmar rechazo
      </button>
      <button
        disabled={loading}
        onClick={() => {
          setRechazando(false)
          setMotivoRechazo("")
          setMotivoPersonalizado("")
        }}
        className="text-xs py-2 px-3 rounded-lg bg-transparent text-gray-500 hover:text-gray-300 transition-colors"
      >
        Cancelar
      </button>
    </div>
  </div>
)}

          {error   && <p className="text-xs text-red-400 mt-3 text-center">{error}</p>}
          {loading && <p className="text-xs text-gray-500 mt-3 text-center">Aplicando acción...</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const REASON_ORDER: ReportReason[] = [
  "acoso",
  "lenguaje_ofensivo",
  "contenido_inapropiado",
  "spoiler",
  "spam",
  "otro",
]

export default function ReportsTable({ datos, token }: ReportsTableProps) {
  const [reportes, setReportes]   = useState<Report[]>(datos)
  const [selected, setSelected]   = useState<Report | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pending" | "resolved" | "rejected">("todos")

  function handleDone(id: number, status: "resolved" | "rejected") {
    setReportes(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setSelected(null)
  }

  const reportesFiltrados = filtroEstado === "todos"
    ? reportes
    : reportes.filter(r => r.status === filtroEstado)

  // Agrupar por motivo
  const grupos = REASON_ORDER.reduce<Record<ReportReason, Report[]>>(
    (acc, reason) => {
      acc[reason] = reportesFiltrados.filter(r => r.reason === reason)
      return acc
    },
    {} as Record<ReportReason, Report[]>
  )

  const pending  = reportes.filter(r => r.status === "pending").length
  const resolved = reportes.filter(r => r.status === "resolved").length
  const rejected = reportes.filter(r => r.status === "rejected").length

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

      <div className="space-y-6">
        <h2 className="text-white text-xl font-bold">🚨 Reportes</h2>

        {/* Resumen + filtros */}
        <div className="flex items-center justify-between flex-wrap gap-3">
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

          {/* Filtro de estado */}
          <div className="flex gap-2">
            {(["todos", "pending", "resolved", "rejected"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroEstado(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  filtroEstado === f
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"
                }`}
              >
                {f === "todos" ? "Todos" : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Secciones por motivo */}
        {REASON_ORDER.map(reason => {
          const grupo = grupos[reason]
          if (grupo.length === 0) return null

          return (
            <div key={reason} className="space-y-2">
              {/* Header de sección */}
              <div className="flex items-center gap-2">
                <ReasonBadge reason={reason} />
                <span className="text-gray-500 text-xs">{grupo.length} reporte{grupo.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Tabla de la sección */}
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "80px" }} />   {/* ID */}
                  <col style={{ width: "180px" }} />  {/* Reportado por */}
                  <col />                             {/* Detalle — ocupa el resto */}
                  <col style={{ width: "110px" }} />  {/* Estado */}
                  <col style={{ width: "110px" }} />  {/* Fecha */}
                  <col style={{ width: "100px" }} />  {/* Acción */}
                </colgroup>
                <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Reportado por</th>
                    <th className="px-4 py-3 text-left">Detalle</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                  <tbody>
                    {grupo.map((reporte, i) => (
                      <tr
                        key={reporte.id}
                        className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}
                      >
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{reporte.id}</td>
                        <td className="px-4 py-3 text-white font-medium">
                          @{reporte.users?.username ?? "Desconocido"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 max-w-xs">
                          <TruncatedCell text={reporte.reason_detail} maxChars={50} />
                        </td>
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
          )
        })}

        {reportesFiltrados.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No hay reportes</p>
        )}
      </div>
    </>
  )
}