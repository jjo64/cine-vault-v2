/* ==========================================================================
   UserProfilePanel — Perfil completo de usuario para el admin
   --------------------------------------------------------------------------
   Vista detallada de un usuario con tres tabs:
   - Cuenta: estado, suscripción, strikes, reportes recibidos
   - Actividad: reseñas, comentarios, likes
   - Pagos: historial de transacciones
   Consume GET /api/rbac/users/:id/profile
   ========================================================================== */

import { useEffect, useState } from "react"

const API = "http://localhost:4000/api"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Perfil {
  usuario: {
    id: number
    username: string
    email: string
    role: string
    membership: string
    is_verified: boolean
    is_public: boolean
    two_factor_enabled: boolean
    locked_until: string | null
    created_at: string
    updated_at: string
  }
  cuenta: {
    esta_baneado: boolean
    es_baneo_permanente: boolean
    strikes_activos: number
    strikes_historial: { id: number; tipo: string; created_at: string }[]
    reportes_recibidos: number
    suscripcion: {
      id: number
      plan: string
      status: string
      start_date: string
      end_date: string
      provider: string
    } | null
  }
  actividad: {
    resenas: {
      id: number
      movie_id: number
      rating: string
      mode: string
      likes: number
      contiene_spoilers: boolean
      created_at: string
    }[]
    resenas_total: number
    comentarios: {
      id: number
      content: string
      review_id: number
      created_at: string
    }[]
    comentarios_total: number
    likes_dados: { review_id: number; created_at: string }[]
    likes_total: number
  }
  pagos: {
    id: number
    amount: string
    currency: string
    payment_status: string
    provider: string
    created_at: string
    subscriptions: { plan: string; status: string } | null
  }[]
  pagos_total: number
  pagos_completados: number
  total_gastado: string
}

interface UserProfilePanelProps {
  userId: number
  token: string
  onBack: () => void
  onGestionar: (userId: number) => void
}

type Tab = "cuenta" | "actividad" | "pagos" | "sesiones"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const colorRol: Record<string, string> = {
  admin:  "bg-red-500/10 text-red-400 border border-red-500/20",
  editor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  user:   "bg-blue-500/10 text-blue-400 border border-blue-500/20",
}

const colorMembresia: Record<string, string> = {
  pro:  "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  vip:  "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  free: "bg-gray-700/50 text-gray-400 border border-gray-600/30",
}

const colorPago: Record<string, string> = {
  paid:    "bg-green-500/10 text-green-400 border border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  failed:  "bg-red-500/10 text-red-400 border border-red-500/20",
  refunded:"bg-gray-700/50 text-gray-400 border border-gray-600/30",
}

const colorStrike: Record<string, string> = {
  spoiler: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  spam:    "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  acoso:   "bg-red-500/10 text-red-400 border border-red-500/20",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function MetaPill({ label, value, warn = false }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${warn ? "bg-red-500/5 border-red-500/20" : "bg-gray-900 border-gray-800"}`}>
      <p className={`text-xs font-medium mb-1 ${warn ? "text-red-400" : "text-gray-500"}`}>{label}</p>
      <p className={`text-lg font-bold ${warn ? "text-red-300" : "text-white"}`}>{value}</p>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function UserProfilePanel({
  userId,
  token,
  onBack,
  onGestionar,
}: UserProfilePanelProps) {
  const [perfil, setPerfil]   = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState("")
  const [tab, setTab]         = useState<Tab>("cuenta")
  const [sesiones, setSesiones] = useState<any[]>([])
  const [loadingSesiones, setLoadingSesiones] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/rbac/users/${userId}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error.message)
        setPerfil(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [userId, token])

  if (loading) return <p className="text-gray-500 text-sm">Cargando perfil...</p>
  if (error)   return <p className="text-red-400 text-sm">⚠️ {error}</p>
  if (!perfil) return null

  const { usuario, cuenta, actividad, pagos } = perfil

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
          >
            ← Volver
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white text-xl font-bold">@{usuario.username}</h2>
              {cuenta.esta_baneado && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  ⛔ {cuenta.es_baneo_permanente ? "Baneado permanente" : "Baneado temporal"}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">{usuario.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-md ${colorRol[usuario.role]}`}>
            {usuario.role}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-md ${colorMembresia[usuario.membership]}`}>
            {usuario.membership}
          </span>
          <button
            onClick={() => onGestionar(userId)}
            className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Gestionar
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-gray-800 pb-0">
        {(["cuenta", "actividad", "pagos", "sesiones"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              if (t === "sesiones" && sesiones.length === 0) {
                setLoadingSesiones(true)
                fetch(`${API}/rbac/users/${userId}/sessions`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then(res => res.json())
                  .then(data => setSesiones(data))
                  .finally(() => setLoadingSesiones(false))
              }
            }}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "text-white border-indigo-500"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            {t === "cuenta"    && "🔐 Cuenta"}
            {t === "actividad" && "📋 Actividad"}
            {t === "pagos"     && "💰 Pagos"}
            {t === "sesiones"  && "🔗 Sesiones"}
          </button>
        ))}
      </div>

      {/* TAB: CUENTA */}
      {tab === "cuenta" && (
        <div className="space-y-6">

          {/* Métricas rápidas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetaPill label="Reseñas" value={actividad.resenas_total} />
            <MetaPill label="Comentarios" value={actividad.comentarios_total} />
            <MetaPill
              label="Strikes activos"
              value={cuenta.strikes_activos}
              warn={cuenta.strikes_activos > 0}
            />
            <MetaPill
              label="Reportes recibidos"
              value={cuenta.reportes_recibidos}
              warn={cuenta.reportes_recibidos >= 3}
            />
          </div>

          {/* Info de cuenta */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
            {[
              { label: "Verificado", value: usuario.is_verified ? "✅ Sí" : "❌ No" },
              { label: "Perfil público", value: usuario.is_public ? "✅ Sí" : "❌ No" },
              { label: "2FA activado", value: usuario.two_factor_enabled ? "✅ Sí" : "❌ No" },
              { label: "Miembro desde", value: formatDate(usuario.created_at) },
              { label: "Última actualización", value: formatDate(usuario.updated_at) },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center px-4 py-3">
                <span className="text-gray-500 text-sm">{item.label}</span>
                <span className="text-gray-200 text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Suscripción */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Suscripción activa
            </p>
            {cuenta.suscripcion ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
                {[
                  { label: "Plan", value: cuenta.suscripcion.plan.toUpperCase() },
                  { label: "Estado", value: cuenta.suscripcion.status },
                  { label: "Inicio", value: formatDate(cuenta.suscripcion.start_date) },
                  { label: "Renovación", value: formatDate(cuenta.suscripcion.end_date) },
                  { label: "Proveedor", value: cuenta.suscripcion.provider },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center px-4 py-3">
                    <span className="text-gray-500 text-sm">{item.label}</span>
                    <span className="text-gray-200 text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin suscripción activa</p>
            )}
          </div>

          {/* Strikes */}
          {cuenta.strikes_historial.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Historial de strikes
              </p>
              <div className="space-y-2">
                {cuenta.strikes_historial.map(strike => (
                  <div
                    key={strike.id}
                    className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-2.5 border border-gray-800"
                  >
                    <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${colorStrike[strike.tipo] ?? "bg-gray-700 text-gray-400 border-gray-600"}`}>
                      {strike.tipo}
                    </span>
                    <span className="text-gray-500 text-xs">{formatDate(strike.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: ACTIVIDAD */}
      {tab === "actividad" && (
        <div className="space-y-6">

          {/* Reseñas */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Últimas reseñas ({actividad.resenas_total})
            </p>
            {actividad.resenas.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin reseñas</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">ID Película</th>
                      <th className="px-4 py-3 text-left">Rating</th>
                      <th className="px-4 py-3 text-left">Modo</th>
                      <th className="px-4 py-3 text-left">Likes</th>
                      <th className="px-4 py-3 text-left">Spoiler</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actividad.resenas.map((r, i) => (
                      <tr key={r.id} className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{r.movie_id}</td>
                        <td className="px-4 py-3 text-white font-medium">{r.rating}★</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{r.mode}</td>
                        <td className="px-4 py-3 text-gray-400">{r.likes}</td>
                        <td className="px-4 py-3">
                          {r.contiene_spoilers
                            ? <span className="text-xs text-yellow-400">⚠️ Sí</span>
                            : <span className="text-xs text-gray-600">No</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comentarios */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Últimos comentarios ({actividad.comentarios_total})
            </p>
            {actividad.comentarios.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin comentarios</p>
            ) : (
              <div className="space-y-2">
                {actividad.comentarios.map(c => (
                  <div key={c.id} className="bg-gray-900 rounded-lg px-4 py-3 border border-gray-800">
                    <p className="text-gray-200 text-sm">{c.content}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Reseña #{c.review_id} · {formatDate(c.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Likes */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Likes dados ({actividad.likes_total})
            </p>
            {actividad.likes_dados.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin likes</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {actividad.likes_dados.map((l, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 border border-gray-700">
                    Reseña #{l.review_id} · {formatDate(l.created_at)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PAGOS */}
      {tab === "pagos" && (
        <div className="space-y-4">

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <MetaPill label="Total transacciones" value={perfil.pagos_total} />
            <MetaPill label="Completados" value={perfil.pagos_completados} />
            <MetaPill label="Total gastado" value={`${perfil.total_gastado}€`} />
          </div>

          {/* Historial */}
          {pagos.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin pagos registrados</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Importe</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Proveedor</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p, i) => (
                    <tr key={p.id} className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{p.id}</td>
                      <td className="px-4 py-3 text-white font-medium">
                        {p.amount} {p.currency}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs uppercase">
                        {p.subscriptions?.plan ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorPago[p.payment_status] ?? "bg-gray-700 text-gray-400 border-gray-600"}`}>
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.provider}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* TAB: SESIONES */}
{tab === "sesiones" && (
  <div className="space-y-4">
    {loadingSesiones && <p className="text-gray-500 text-sm">Cargando sesiones...</p>}

    {!loadingSesiones && sesiones.length === 0 && (
      <p className="text-gray-500 text-sm">No hay sesiones activas.</p>
    )}

    {sesiones.map(sesion => (
      <div
        key={sesion.id}
        className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-start justify-between gap-4"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {sesion.dispositivo === "mobile" ? "📱" : sesion.dispositivo === "tablet" ? "📟" : "🖥️"}
            </span>
            <span className="text-white text-sm font-medium">
              {sesion.navegador} {sesion.navegador_version}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-800 text-gray-400 border border-gray-700">
              {sesion.so}
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            <span className="text-xs text-gray-500">
              IP: <span className="text-gray-400 font-mono">{sesion.ip_address}</span>
            </span>
            <span className="text-xs text-gray-500">
              Inicio: <span className="text-gray-400">{formatDate(sesion.created_at)}</span>
            </span>
            <span className="text-xs text-gray-500">
              Expira: <span className="text-gray-400">{formatDate(sesion.expires_at)}</span>
            </span>
          </div>
        </div>
        <button
          onClick={async () => {
            await fetch(`${API}/rbac/users/${userId}/sessions/${sesion.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            })
            setSesiones(prev => prev.filter(s => s.id !== sesion.id))
          }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors whitespace-nowrap"
        >
          Invalidar sesión
        </button>
      </div>
    ))}
  </div>
)}
    </div>
  )
}