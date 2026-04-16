/* ==========================================================================
   ModerationPanel — Panel completo de moderación
   --------------------------------------------------------------------------
   Combina tres secciones en una sola vista:
   1. Buscador de usuarios
   2. Lista de usuarios baneados con botón de desbanear
   3. Historial de acciones de moderación
   ========================================================================== */

import { useState } from "react"

const API = "http://localhost:4000/api"

interface User {
  id: number
  username: string
  email: string
  role: string
  membership: string
  is_verified?: boolean
  locked_until: string | null
  created_at: string
}

interface UsuarioAfectado {
  id: number
  username: string
  email: string
  role: string
}

interface ModerationAction {
  id: number
  user_id: number
  action: string
  metadata: string | null
  target_user_id: number | null
  created_at: string
  users: { id: number; username: string; role: string } | null
  usuarioAfectado: UsuarioAfectado | null
}

interface ModerationPanelProps {
  token: string
}

const colorRol: Record<string, string> = {
  admin:  "bg-red-500 text-red-950",
  editor: "bg-yellow-500 text-yellow-950",
  user:   "bg-blue-500 text-blue-950",
}

const iconoAccion: Record<string, string> = {
  content_blocked: "🚫",
  user_banned:     "⛔",
  warning_sent:    "⚠️",
  user_unbanned:   "✅",
}

const colorAccion: Record<string, string> = {
  content_blocked: "bg-orange-500 text-orange-950",
  user_banned:     "bg-red-500 text-red-950",
  warning_sent:    "bg-yellow-500 text-yellow-950",
  user_unbanned:   "bg-green-500 text-green-950",
}

const textoAccion: Record<string, string> = {
  content_blocked: "Contenido bloqueado",
  user_banned:     "Usuario baneado",
  warning_sent:    "Warning enviado",
  user_unbanned:   "Usuario desbaneado",
}

export default function ModerationPanel({ token }: ModerationPanelProps) {
  const [busqueda, setBusqueda] = useState("")
  const [resultados, setResultados] = useState<User[]>([])
  const [baneados, setBaneados] = useState<User[]>([])
  const [historial, setHistorial] = useState<ModerationAction[]>([])
  const [cargando, setCargando] = useState(false)
  const [vista, setVista] = useState<"buscador" | "baneados" | "historial">("buscador")

  const headers = { Authorization: `Bearer ${token}` }

  const buscar = async () => {
    if (!busqueda.trim()) return
    setCargando(true)
    const res = await fetch(`${API}/rbac/users/search?query=${busqueda}`, { headers })
    const data = await res.json()
    setResultados(data)
    setCargando(false)
  }

  const cargarBaneados = async () => {
    setCargando(true)
    const res = await fetch(`${API}/rbac/users/banned`, { headers })
    const data = await res.json()
    setBaneados(data)
    setCargando(false)
    setVista("baneados")
  }

  const cargarHistorial = async () => {
    setCargando(true)
    const res = await fetch(`${API}/rbac/moderation/history`, { headers })
    const data = await res.json()
    setHistorial(data)
    setCargando(false)
    setVista("historial")
  }

  const desbanear = async (userId: number) => {
  if (!confirm("¿Seguro que quieres desbanear a este usuario?")) return
  const res = await fetch(`${API}/rbac/users/${userId}/unban`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  const data = await res.json()
  if (data.error) {
    alert("Error: " + data.error.message)
  } else {
    alert("Usuario desbaneado correctamente")
    setBaneados(prev => prev.filter(u => u.id !== userId))
    setResultados(prev => prev.map(u => 
      u.id === userId ? { ...u, locked_until: null } : u
    ))
  }
}

  return (
    <div className="space-y-6">
      <h2 className="text-white text-xl font-bold">🛡️ Panel de Moderación</h2>

      {/* TABS */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${vista === "buscador" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
          onClick={() => setVista("buscador")}
        >
          🔍 Buscar usuario
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${vista === "baneados" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
          onClick={cargarBaneados}
        >
          ⛔ Usuarios baneados
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${vista === "historial" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
          onClick={cargarHistorial}
        >
          📋 Historial
        </button>
      </div>

      {/* BUSCADOR */}
      {vista === "buscador" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm"
              placeholder="Buscar por username o email..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscar()}
            />
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              onClick={buscar}
            >
              Buscar
            </button>
          </div>

          {cargando && <p className="text-gray-400 text-sm">Buscando...</p>}

          {resultados.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((usuario, i) => (
                    <tr key={usuario.id} className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}>
                      <td className="px-4 py-3 text-white font-medium">{usuario.username}</td>
                      <td className="px-4 py-3 text-gray-400">{usuario.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorRol[usuario.role]}`}>
                          {usuario.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {usuario.locked_until && new Date(usuario.locked_until) > new Date() ? (
                          <div className="flex items-center gap-2">
                            <span className="bg-red-500 text-red-950 px-2 py-1 rounded-full text-xs font-semibold">⛔ Baneado</span>
                            <button
                              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                              onClick={() => desbanear(usuario.id)}
                            >
                              Desbanear
                            </button>
                          </div>
                        ) : (
                          <span className="bg-green-500 text-green-950 px-2 py-1 rounded-full text-xs font-semibold">✅ Activo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* USUARIOS BANEADOS */}
      {vista === "baneados" && (
        <div className="space-y-4">
          {cargando && <p className="text-gray-400 text-sm">Cargando...</p>}
          {!cargando && baneados.length === 0 && (
            <p className="text-gray-500 text-sm">No hay usuarios baneados.</p>
          )}
          {baneados.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-left">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {baneados.map((usuario, i) => (
                    <tr key={usuario.id} className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}>
                      <td className="px-4 py-3 text-white font-medium">{usuario.username}</td>
                      <td className="px-4 py-3 text-gray-400">{usuario.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorRol[usuario.role]}`}>
                          {usuario.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold"
                          onClick={() => desbanear(usuario.id)}
                        >
                          ✅ Desbanear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* HISTORIAL */}
      {vista === "historial" && (
        <div className="space-y-4">
          {cargando && <p className="text-gray-400 text-sm">Cargando...</p>}
          {!cargando && historial.length === 0 && (
            <p className="text-gray-500 text-sm">No hay acciones registradas.</p>
          )}
          {historial.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Acción</th>
                    <th className="px-4 py-3 text-left">Admin</th>
                    <th className="px-4 py-3 text-left">Usuario afectado</th>
                    <th className="px-4 py-3 text-left">Motivo</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((item, i) => (
                  <tr key={item.id} className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorAccion[item.action] ?? "bg-gray-500 text-gray-950"}`}>
                        {iconoAccion[item.action] ?? "⚡"} {textoAccion[item.action] ?? item.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {item.users?.username ?? "🤖 Bot Moderación"}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {item.usuarioAfectado ? (
                        <div>
                          <p className="font-medium">{item.usuarioAfectado.username}</p>
                          <p className="text-gray-500 text-xs">{item.usuarioAfectado.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                      {item.metadata ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(item.created_at).toLocaleString("es-ES")}
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}