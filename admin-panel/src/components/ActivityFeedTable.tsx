/* ==========================================================================
   ActivityFeedTable — Feed de actividad real de usuarios
   --------------------------------------------------------------------------
   Consume GET /api/rbac/users/activity/feed?userId=&limit=
   Muestra acciones reales cruzando múltiples tablas.
   Diseñado para ser reemplazado por el frontend real de CineVault.
   ========================================================================== */

import { useState } from "react"

const API = "http://localhost:4000/api"

interface ActivityItem {
  user: { id: number; username: string }
  action: string
  detail: string
  created_at: string
}

interface ActivityFeedTableProps {
  token: string
}

const ACTION_STYLE: Record<string, string> = {
  review_created:    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  review_liked:      "bg-pink-500/10 text-pink-400 border-pink-500/20",
  comment_created:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  user_followed:     "bg-green-500/10 text-green-400 border-green-500/20",
  watchlist_added:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  favorite_added:    "bg-orange-500/10 text-orange-400 border-orange-500/20",
  vault_created:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
  payment_completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

const ACTION_LABEL: Record<string, string> = {
  review_created:    "Reseña",
  review_liked:      "Like",
  comment_created:   "Comentario",
  user_followed:     "Seguidor",
  watchlist_added:   "Watchlist",
  favorite_added:    "Favorito",
  vault_created:     "Vault",
  payment_completed: "Pago",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ActivityFeedTable({ token }: ActivityFeedTableProps) {
  const [feed, setFeed]       = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [search, setSearch]   = useState("")
  const [limit, setLimit]     = useState(50)
  const [cargado, setCargado] = useState(false)

  async function cargar(userId?: number) {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (userId) params.set("userId", String(userId))
      params.set("limit", String(limit))

      const res = await fetch(`${API}/rbac/users/activity/feed?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setFeed(data)
      setCargado(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar")
    } finally {
      setLoading(false)
    }
  }

  async function buscarUsuario() {
    if (!search.trim()) {
      cargar()
      return
    }
    // Buscar el userId por username
    const res = await fetch(
      `${API}/rbac/users/search?query=${encodeURIComponent(search)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const usuarios = await res.json()
    if (!usuarios.length) {
      setError(`No se encontró ningún usuario con "${search}"`)
      setFeed([])
      return
    }
    cargar(usuarios[0].id)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-bold">📋 Actividad de usuarios</h2>

      {/* Controles */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-48">
          <label className="text-xs text-gray-500 mb-1 block">
            Buscar por usuario
          </label>
          <input
            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
            placeholder="username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && buscarUsuario()}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Límite</label>
          <select
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <button
          onClick={buscarUsuario}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Cargando..." : "Buscar"}
        </button>
        {search && (
          <button
            onClick={() => { setSearch(""); cargar() }}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm"
          >
            Ver todo
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Botón inicial */}
      {!cargado && !loading && (
        <button
          onClick={() => cargar()}
          className="w-full py-8 border border-dashed border-gray-700 rounded-xl text-gray-500 hover:border-gray-500 hover:text-gray-400 transition-colors text-sm"
        >
          Cargar actividad
        </button>
      )}

      {/* Tabla */}
      {cargado && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {feed.length} registros
              {search && ` para @${search}`}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Acción</th>
                  <th className="px-4 py-3 text-left">Detalle</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {feed.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-8">
                      No hay actividad
                    </td>
                  </tr>
                )}
                {feed.map((item, i) => (
                  <tr
                    key={i}
                    className={`border-t border-gray-800 ${
                      i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"
                    }`}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      @{item.user.username}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        ACTION_STYLE[item.action] ?? "bg-gray-700 text-gray-400 border-gray-600"
                      }`}>
                        {ACTION_LABEL[item.action] ?? item.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs max-w-xs truncate">
                      {item.detail}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}