import { useState, useEffect } from "react"
import ReportsTable from "./components/ReportsTable"
import ModerationPanel from "./components/ModerationPanel"
import UserCommentsTable from "./components/UserCommentsTable"
import ActivityFeedTable from "./components/ActivityFeedTable"
import Dashboard from "./components/Dashboard"

import SessionsChart from "./components/SessionsChart"
import { conectarSocket, desconectarSocket, socket } from "./socket"
import type { Alerta } from "./types/alertas"

const API = "http://localhost:4000/api"
//const API = "http://192.168.1.15:4000/api"  para pruebas login movil

export default function App() {
  const [token, setToken] = useState("")
  const [rol, setRol] = useState<"admin" | "editor" | "user" | "">("")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) 
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [vista, setVista] = useState("login")
  const [datos, setDatos] = useState<any>(null)
  const [error, setError] = useState("")
  const [endpoint, setEndpoint] = useState("dashboard")
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [usuariosBaneados, setUsuariosBaneados] = useState<Set<number>>(new Set())



 // Escucha alertas de contenido bloqueado por la IA
useEffect(() => {
  socket.on("contenido_bloqueado", (datos) => {
    setAlertas(prev => {
      const sinDuplicados = prev.filter(a => a.userId !== datos.userId)
      return [{
        tipo: "contenido_bloqueado",
        prioridad: "critico",
        leida: false,
        ...datos,
      }, ...sinDuplicados].slice(0, 20)
    })
  })

  socket.on("nuevo_reporte", (datos) => {
    setAlertas(prev => {
      const sinDuplicados = prev.filter(a => a.reporteId !== datos.reporteId)
      return [{
        tipo: "nuevo_reporte",
        leida: false,
        ...datos,
      }, ...sinDuplicados].slice(0, 20)
    })
  })

socket.on("ban_automatico", (datos) => {
  // Actualizar el set de usuarios baneados
  if (datos.userId) {
    setUsuariosBaneados(prev => new Set([...prev, datos.userId]))
  }
  setAlertas(prev => {
    const sinDuplicados = prev.filter(a => a.userId !== datos.userId)
    return [{
      tipo: "ban_automatico",
      prioridad: "critico",
      leida: false,
      ...datos,
    }, ...sinDuplicados].slice(0, 20)
  })
})

  return () => {
    socket.off("contenido_bloqueado")
    socket.off("nuevo_reporte")
    socket.off("ban_automatico")
  }
}, [])
  

  // LOGIN
  const login = async () => {
    setError("")
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    })
    const data = await res.json()
    if (data.accessToken) {
    setToken(data.accessToken)
    setVista("panel")
    const payload = decodificarToken(data.accessToken)
    if (payload) {
       console.log("ROL:", payload.role)
      setRol(payload.role)
      conectarSocket(payload.user_id, payload.role)
      }
    } else {
      setError("Credenciales incorrectas")
    }
  }

  // LLAMADA A LA API
  const llamar = async (endpoint: string) => {
    setError("")
    setDatos(null)
    setEndpoint(endpoint)
    const res = await fetch(`${API}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error.message)
    } else {
      setDatos(data)
    }
  }

  // BANEAR USUARIO
const banearUsuario = async (userId: number) => {
  if (!userId) return alert("No se puede identificar al usuario")
  if (!confirm("¿Seguro que quieres banear a este usuario permanentemente?")) return
  const res = await fetch(`${API}/rbac/users/${userId}/ban`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (data.error) {
    alert("Error: " + data.error.message)
  } else {
    alert("Usuario baneado correctamente")
    setUsuariosBaneados(prev => new Set([...prev, userId]))  // ← añadir
    setAlertas(prev => prev.filter(a => a.userId !== userId))
    setDatos(null)
    setEndpoint("")
  }
}

// ENVIAR WARNING
const enviarWarning = async (userId: number, contenidoOfensivo: string) => {
  if (!userId) return alert("No se puede identificar al usuario")
  const res = await fetch(`${API}/rbac/users/${userId}/warning`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ contenidoOfensivo }),
  })
  const data = await res.json()
  if (data.error) {
    alert("Error: " + data.error.message)
  } else {
    alert("Warning enviado correctamente")
        setAlertas(prev => prev.filter(a => a.userId !== userId)) // ← elimina la alerta
        setDatos(null)
        setEndpoint("")

  }
}

  // Decodifica el payload del JWT sin verificar la firma
  const decodificarToken = (token: string) => {
    try {
      const payload = token.split(".")[1]
      return JSON.parse(atob(payload))
    } catch {
      return null
    }
  }

  // LOGIN SCREEN
  if (vista === "login") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-xl w-96 space-y-4">
          <h1 className="text-white text-2xl font-bold text-center">
            🎬 CineVault Admin
          </h1>
          <input
            className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg"
            placeholder="Usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg"
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold"
            onClick={login}
          >
            Entrar
          </button>
        </div>
      </div>
    )
  }

  // PANEL
  const sidebarItems = {
  admin: [
    { label: "🏠 Dashboard",    endpoint: "dashboard" },
    { label: "🛡️ Moderación",  endpoint: "/rbac/moderation" },
    { label: "📋 Actividad",    endpoint: "/rbac/users/activity/feed" },
    { label: "🚨 Reportes",     endpoint: "/rbac/reports" },
    { label: "📰 Noticias",     endpoint: "/rbac/news" },
    { label: "🌐 Sesiones",     endpoint: "/rbac/stats/sessions" },
  ],
  editor: [
    { label: "🏠 Dashboard",    endpoint: "dashboard" },
    { label: "📰 Noticias",     endpoint: "/rbac/news" },
  ],
  user: [
    { label: "🏠 Mi perfil",    endpoint: "mi-perfil" },
    { label: "📝 Mis reseñas",  endpoint: "mis-resenas" },
    { label: "🔔 Notificaciones", endpoint: "notificaciones" },
    { label: "💰 Mi suscripción", endpoint: "mi-suscripcion" },
  ],
}

const itemsActuales = sidebarItems[rol as keyof typeof sidebarItems] ?? sidebarItems.user

  return (
    <div className="min-h-screen bg-gray-950 text-white">
        {/* HEADER */}
        <div className="bg-gray-900 px-8 py-4 flex justify-between items-center border-b border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
            >
              ☰
            </button>
            <h1 className="text-xl font-bold">🎬 CineVault</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
              rol === "admin"  ? "bg-red-500/10 text-red-400 border-red-500/20" :
              rol === "editor" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                "bg-blue-500/10 text-blue-400 border-blue-500/20"
            }`}>
              {rol}
            </span>
          </div>
          <button
            className="text-gray-400 hover:text-white text-sm"
            onClick={() => {
              setToken("")
              setRol("")
              setVista("login")
              desconectarSocket()
            }}
          >
            Cerrar sesión
          </button>
        </div>

      <div className="flex">
        {/* SIDEBAR */}
        <div className={`${sidebarCollapsed ? "w-0 overflow-hidden" : "w-64"} bg-gray-900 min-h-screen border-r border-gray-800 transition-all duration-300`}>
          <div className="p-4 space-y-2">
            <p className="text-gray-500 text-xs uppercase mb-4">
              {rol === "admin" ? "Panel de Admin" : rol === "editor" ? "Panel de Editor" : "Mi Panel"}
            </p>
            {itemsActuales.map(item => (
              <button
                key={item.endpoint}
                className={`w-full text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition flex items-center justify-between ${
                  endpoint === item.endpoint ? "bg-gray-800 text-white" : ""
                }`}
                onClick={() => {
                  if (item.endpoint === "/rbac/moderation") {
                    setEndpoint("/rbac/moderation")
                    setDatos(null)
                  } else if (["dashboard", "mi-perfil", "mis-resenas", "notificaciones", "mi-suscripcion", "editor-stats"].includes(item.endpoint)) {
                    setEndpoint(item.endpoint)
                    setDatos(null)
                  } else {
                    llamar(item.endpoint)
                  }
                }}
              >
                <span>{item.label}</span>
                {item.endpoint === "dashboard" && alertas.filter(a => !a.leida).length > 0 && (
                  <span className={`text-white text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    alertas.some(a => !a.leida && a.prioridad === "critico") ? "bg-red-500" :
                    alertas.some(a => !a.leida && a.prioridad === "alto")    ? "bg-orange-500" :
                    "bg-yellow-500"
                  }`}>
                    {alertas.filter(a => !a.leida).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 p-8">
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">
              ⚠️ {error}
            </div>
          )}
        
          {endpoint === "dashboard" && rol === "admin" && (
          <Dashboard
            token={token}
            alertas={alertas}
            onDismissAlerta={(i) => {
              setAlertas(prev => prev.filter((_, j) => j !== i))
            }}
            usuariosBaneados={usuariosBaneados}
            onBanear={banearUsuario}
            onWarning={enviarWarning}
            onVerComentarios={(userId) => llamar(`/rbac/users/${userId}/comments`)}
            onNavegar={(ep) => {
              if (ep === "/rbac/moderation") {
                setEndpoint("/rbac/moderation")
                setDatos(null)
              } else {
                llamar(ep)
              }
            }}
          />
        )}
        
          {endpoint === "dashboard" && rol === "editor" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-white text-xl font-bold mb-1">👋 Panel de Editor</h2>
              <p className="text-gray-500 text-sm">Gestiona el contenido editorial de CineVault.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => llamar("/rbac/news")}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-5 text-left transition-colors"
              >
                <p className="text-2xl mb-2">📰</p>
                <p className="text-sm font-medium text-gray-300">Noticias</p>
                <p className="text-xs text-gray-500 mt-1">Crear, editar y borrar noticias</p>
              </button>
              <button
                onClick={() => setEndpoint("editor-stats")}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-5 text-left transition-colors"
              >
                <p className="text-2xl mb-2">📊</p>
                <p className="text-sm font-medium text-gray-300">Estadísticas</p>
                <p className="text-xs text-gray-500 mt-1">Reseñas y actividad de contenido</p>
              </button>
            </div>
          </div>
        )}

        {endpoint === "dashboard" && rol === "user" && (
          <div className="space-y-4">
            <h2 className="text-white text-xl font-bold">👋 Bienvenido</h2>
            <p className="text-gray-500 text-sm">Usa el menú para navegar por tu panel personal.</p>
          </div>
        )}

          {endpoint === "/rbac/moderation" && (
            <ModerationPanel token={token} />
          )}

          {/* VISTAS DE USUARIO */}
          {rol === "user" && endpoint === "mi-perfil" && (
            <div className="space-y-4">
              <h2 className="text-white text-xl font-bold">👤 Mi perfil</h2>
              <p className="text-gray-500 text-sm">Próximamente — vista de perfil personal.</p>
            </div>
          )}
          {rol === "user" && endpoint === "mis-resenas" && (
            <div className="space-y-4">
              <h2 className="text-white text-xl font-bold">📝 Mis reseñas</h2>
              <p className="text-gray-500 text-sm">Próximamente — historial de reseñas.</p>
            </div>
          )}
          {rol === "user" && endpoint === "notificaciones" && (
            <div className="space-y-4">
              <h2 className="text-white text-xl font-bold">🔔 Notificaciones</h2>
              <p className="text-gray-500 text-sm">Próximamente — notificaciones y warnings.</p>
            </div>
          )}
          {rol === "user" && endpoint === "mi-suscripcion" && (
            <div className="space-y-4">
              <h2 className="text-white text-xl font-bold">💰 Mi suscripción</h2>
              <p className="text-gray-500 text-sm">Próximamente — estado de suscripción y pagos.</p>
            </div>
          )}
          {rol === "editor" && endpoint === "editor-stats" && (
            <div className="space-y-4">
              <h2 className="text-white text-xl font-bold">📊 Estadísticas de contenido</h2>
              <p className="text-gray-500 text-sm">Próximamente — estadísticas de reseñas y comentarios.</p>
            </div>
          )}

          {datos && vista === "panel" && endpoint !== "/rbac/moderation" && endpoint !== "dashboard" && (
            <>
          {endpoint === "/rbac/reports" ? (
            <ReportsTable datos={datos} token={token} />
          ) : endpoint === "/rbac/users/activity/feed" ? (
            <ActivityFeedTable token={token} />
          ) : endpoint === "/rbac/stats/sessions" ? (
            <SessionsChart datos={datos} />
          ) : endpoint.includes("/rbac/users/") && endpoint.includes("/comments") ? (
            <UserCommentsTable
              datos={datos}
              token={token}
              onCommentDeleted={(commentId) => {
                setDatos((prev: any) => prev.filter((c: any) => c.id !== commentId))
              }}
            />
              ) : (
                <pre className="bg-gray-900 p-6 rounded-xl text-green-400 text-sm overflow-auto">
                  {JSON.stringify(datos, null, 2)}
                </pre>
              )}
            </>
          )}

                </div>
              </div>
            </div>
          )
        }