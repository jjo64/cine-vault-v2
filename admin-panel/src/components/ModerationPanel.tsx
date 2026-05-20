/* ==========================================================================
   ModerationPanel — Panel completo de moderación
   --------------------------------------------------------------------------
   1. Buscador de usuarios con modal de gestión directa
   2. Lista de usuarios baneados con desbanear
   3. Historial de acciones de moderación
   ========================================================================== */

import { useState } from "react"
import UserProfilePanel from "./UserProfilePanel"


const API = "http://localhost:4000/api"

// ─── Types ────────────────────────────────────────────────────────────────────

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

type StrikeType = "spoiler" | "spam" | "acoso"

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

const iconoAccion: Record<string, string> = {
  content_blocked: "🚫",
  user_banned:     "⛔",
  warning_sent:    "⚠️",
  user_unbanned:   "✅",
  strike_added:    "🎯",
}

const colorAccion: Record<string, string> = {
  content_blocked: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  user_banned:     "bg-red-500/10 text-red-400 border border-red-500/20",
  warning_sent:    "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  user_unbanned:   "bg-green-500/10 text-green-400 border border-green-500/20",
  strike_added:    "bg-amber-500/10 text-amber-400 border border-amber-500/20",
}

const textoAccion: Record<string, string> = {
  content_blocked: "Contenido bloqueado",
  user_banned:     "Usuario baneado",
  warning_sent:    "Warning enviado",
  user_unbanned:   "Usuario desbaneado",
  strike_added:    "Strike añadido",
}

function esBaneado(user: User) {
  return user.locked_until && new Date(user.locked_until) > new Date()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

// ─── Modal de gestión directa ─────────────────────────────────────────────────

function UserManageModal({
  user,
  token,
  onClose,
  onUpdated,
  onVerPerfil,        // ← nuevo
}: {
  user: User
  token: string
  onClose: () => void
  onUpdated: (updated: Partial<User>) => void
  onVerPerfil: (userId: number) => void  // ← nuevo
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [success, setSuccess] = useState("")
  const [baneado, setBaneado] = useState(!!esBaneado(user))  

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

  async function handleAction(action: string, payload?: object) {
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      switch (action) {
        case "role_user":
          await call(`/rbac/users/${user.id}/role`, "PATCH", { role: "user" })
          onUpdated({ role: "user" })
          setSuccess("Rol cambiado a user")
          break
        case "role_editor":
          await call(`/rbac/users/${user.id}/role`, "PATCH", { role: "editor" })
          onUpdated({ role: "editor" })
          setSuccess("Rol cambiado a editor")
          break
        case "role_admin":
          await call(`/rbac/users/${user.id}/role`, "PATCH", { role: "admin" })
          onUpdated({ role: "admin" })
          setSuccess("Rol cambiado a admin")
          break
        case "strike_spoiler": {
          const resultado = await call(`/rbac/users/${user.id}/strikes`, "POST", { tipo: "spoiler" satisfies StrikeType })
          console.log("RESULTADO STRIKE:", resultado)  // ← temporal
          if (resultado?.bloqueado) {
            onUpdated({ locked_until: new Date().toISOString() })
            setBaneado(true)  // ← añadir
          }
          setSuccess("Strike de spoiler añadido")
          break
        }

        case "strike_spam": {
          const resultado = await call(`/rbac/users/${user.id}/strikes`, "POST", { tipo: "spam" satisfies StrikeType })
          if (resultado?.bloqueado) {
            onUpdated({ locked_until: new Date().toISOString() })
            setBaneado(true)  // ← añadir
          }
          setSuccess("Strike de spam añadido")
          break
        }

        case "strike_acoso": {
          const resultado = await call(`/rbac/users/${user.id}/strikes`, "POST", { tipo: "acoso" satisfies StrikeType })
          if (resultado?.bloqueado) {
            onUpdated({ locked_until: new Date().toISOString() })
            setBaneado(true)  // ← añadir
          }
          setSuccess("Strike de acoso añadido")
          break
        }

        case "ban_temp": {
          const until = new Date()
          until.setDate(until.getDate() + 30)
          await call(`/rbac/users/${user.id}/ban`, "PATCH", { locked_until: until.toISOString() })
          onUpdated({ locked_until: until.toISOString() })
          setBaneado(true)  // ← añadir
          setSuccess("Ban temporal de 30 días aplicado")
          break
        }

        case "ban_perm":
          await call(`/rbac/users/${user.id}/ban`, "PATCH", { locked_until: "2099-12-31T23:59:59.000Z" })
          onUpdated({ locked_until: "2099-12-31T23:59:59.000Z" })
          setBaneado(true)  // ← añadir
          setSuccess("Ban permanente aplicado")
          break

        case "unban":
          await call(`/rbac/users/${user.id}/unban`, "PATCH")
          onUpdated({ locked_until: null })
          setBaneado(false)  // ← añadir
          setSuccess("Usuario desbaneado correctamente")
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
      Gestionar <span className="text-indigo-400">@{user.username}</span>
    </p>
    <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
  </div>
  <div className="flex items-center gap-3 ml-4">
    <button
      onClick={() => {
        onClose()
        onVerPerfil(user.id)
      }}
      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
    >
      Ver perfil completo →
    </button>
    <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">✕</button>
  </div>
</div>

        {/* Info usuario */}
        <div className="p-5 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Estado actual
          </p>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-md ${colorRol[user.role]}`}>
              Rol: {user.role}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-md ${colorMembresia[user.membership]}`}>
              Membresía: {user.membership}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 border border-gray-700">
              Registro: {formatDate(user.created_at)}
            </span>
            {esBaneado(user) ? (
              <span className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                ⛔ Baneado hasta {formatDate(user.locked_until!)}
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20">
                ✅ Activo
              </span>
            )}
          </div>
        </div>

        {/* Cambiar rol */}
        <div className="p-5 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Cambiar rol
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["user", "editor", "admin"] as const).map((rol) => (
              <button
                key={rol}
                disabled={loading || user.role === rol}
                onClick={() => handleAction(`role_${rol}`)}
                className={`text-xs py-2 px-3 rounded-lg border transition-colors capitalize
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${user.role === rol
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
                  }`}
              >
                {rol}
              </button>
            ))}
          </div>
        </div>

        {/* Moderación directa */}
        <div className="p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Moderación directa
          </p>

          {/* Aviso de usuario baneado */}
          {baneado && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between">
              <p className="text-xs text-red-400">
                ⛔ Usuario baneado — acciones de moderación deshabilitadas
              </p>
              <button
                onClick={() => { onClose(); onVerPerfil(user.id) }}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap ml-3"
              >
                Ver perfil →
              </button>
            </div>
          )}

          {/* Strikes */}
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-1.5">Añadir strike</p>
            <div className="grid grid-cols-3 gap-2">
              {(["spoiler", "spam", "acoso"] as const).map((tipo) => (
                <button
                  key={tipo}
                  disabled={loading || baneado}
                  title={baneado ? "Usuario baneado — desbanea primero para aplicar esta acción" : undefined}
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
              disabled={loading}
              onClick={() => handleAction("warning")}
              className="text-xs py-2.5 px-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-40"
            >
              Enviar warning
            </button>
            <button
              disabled={loading || baneado}
              title={baneado ? "Usuario baneado — desbanea primero para aplicar esta acción" : undefined}
              onClick={() => handleAction("ban_temp")}
              className="text-xs py-2.5 px-3 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Ban temporal (30d)
            </button>
            <button
              disabled={loading || baneado}
              title={baneado ? "Usuario baneado — desbanea primero para aplicar esta acción" : undefined}
              onClick={() => handleAction("ban_perm")}
              className="text-xs py-2.5 px-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Ban permanente
            </button>
            <button
              disabled={loading || !baneado}
              onClick={() => handleAction("unban")}
              className="text-xs py-2.5 px-3 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Desbanear
            </button>
          </div>

          {error   && <p className="text-xs text-red-400 mt-3 text-center">{error}</p>}
          {success && <p className="text-xs text-green-400 mt-3 text-center">{success}</p>}
          {loading && <p className="text-xs text-gray-500 mt-3 text-center">Aplicando acción...</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ModerationPanel({ token }: ModerationPanelProps) {
  const [busqueda, setBusqueda]   = useState("")
  const [resultados, setResultados] = useState<User[]>([])
  const [baneados, setBaneados]   = useState<User[]>([])
  const [historial, setHistorial] = useState<ModerationAction[]>([])
  const [cargando, setCargando]   = useState(false)
  const [vista, setVista]         = useState<"buscador" | "baneados" | "historial">("buscador")
  const [selected, setSelected]   = useState<User | null>(null)
  const [perfilUserId, setPerfilUserId] = useState<number | null>(null)

  const headers = { Authorization: `Bearer ${token}` }

  const buscar = async () => {
    if (!busqueda.trim()) return
    setCargando(true)
    const res  = await fetch(`${API}/rbac/users/search?query=${busqueda}`, { headers })
    const data = await res.json()
    setResultados(data)
    setCargando(false)
  }

  const cargarBaneados = async () => {
    setCargando(true)
    const res  = await fetch(`${API}/rbac/users/banned`, { headers })
    const data = await res.json()
    setBaneados(data)
    setCargando(false)
    setVista("baneados")
  }

  const cargarHistorial = async () => {
    setCargando(true)
    const res  = await fetch(`${API}/rbac/moderation/history`, { headers })
    const data = await res.json()
    setHistorial(data)
    setCargando(false)
    setVista("historial")
  }

  function handleUpdated(updated: Partial<User>) {
    setResultados(prev => prev.map(u => u.id === selected?.id ? { ...u, ...updated } : u))
    setBaneados(prev => {
      if (updated.locked_until === null) return prev.filter(u => u.id !== selected?.id)
      return prev
    })
    setSelected(prev => prev ? { ...prev, ...updated } : null)
  }

  if (perfilUserId) {
    return (
      <UserProfilePanel
        userId={perfilUserId}
        token={token}
        onBack={() => setPerfilUserId(null)}
        onGestionar={(id) => {
          setPerfilUserId(null)
          fetch(`${API}/rbac/users/search?query=${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(data => {
              if (data.length > 0) setSelected(data[0])
            })
        }}
      />
    )
  }

  return (   // ← el return principal que ya tienes
    <>
      {selected && (
        <UserManageModal
          user={selected}
          token={token}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onVerPerfil={(id) => {        // ← añade esto
            setSelected(null)
            setPerfilUserId(id)
          }}
        />
      )}

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
                className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
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
                      <th className="px-4 py-3 text-left">Membresía</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((usuario, i) => (
                      <tr key={usuario.id} className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}>
                        <td className="px-4 py-3 text-white font-medium">@{usuario.username}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{usuario.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorRol[usuario.role]}`}>
                            {usuario.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorMembresia[usuario.membership]}`}>
                            {usuario.membership}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {esBaneado(usuario) ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">⛔ Baneado</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">✅ Activo</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelected(usuario)}
                            className="text-xs font-semibold text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Gestionar
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
                      <th className="px-4 py-3 text-left">Membresía</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {baneados.map((usuario, i) => (
                      <tr key={usuario.id} className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}>
                        <td className="px-4 py-3 text-white font-medium">@{usuario.username}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{usuario.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorRol[usuario.role]}`}>
                            {usuario.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorMembresia[usuario.membership]}`}>
                            {usuario.membership}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelected(usuario)}
                            className="text-xs font-semibold text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Gestionar
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
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorAccion[item.action] ?? "bg-gray-700/50 text-gray-400 border-gray-600/30"}`}>
                            {iconoAccion[item.action] ?? "⚡"} {textoAccion[item.action] ?? item.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white font-medium">
                          {item.users?.username ?? "🤖 Bot Moderación"}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {item.usuarioAfectado ? (
                            <div>
                              <p className="font-medium">@{item.usuarioAfectado.username}</p>
                              <p className="text-gray-500 text-xs">{item.usuarioAfectado.email}</p>
                            </div>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                          {item.metadata ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
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
    </>
  )
}