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
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [vista, setVista] = useState("login")
  const [datos, setDatos] = useState<any>(null)
  const [error, setError] = useState("")
  const [endpoint, setEndpoint] = useState("dashboard")
  const [alertas, setAlertas] = useState<Alerta[]>([])


 // Escucha alertas de contenido bloqueado por la IA
useEffect(() => {
  socket.on("contenido_bloqueado", (datos) => {
    setAlertas(prev => [{
      tipo: "contenido_bloqueado",
      prioridad: "critico",
      leida: false,
      ...datos,
    }, ...prev].slice(0, 20))
  })

  socket.on("nuevo_reporte", (datos) => {
    setAlertas(prev => [{
      tipo: "nuevo_reporte",
      leida: false,
      ...datos,
    }, ...prev].slice(0, 20))
  })

  socket.on("ban_automatico", (datos) => {
    setAlertas(prev => [{
      tipo: "ban_automatico",
      prioridad: "critico",
      leida: false,
      ...datos,
    }, ...prev].slice(0, 20))
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
        setAlertas(prev => prev.filter(a => a.userId !== userId)) // ← elimina la alerta
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
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* HEADER */}
      <div className="bg-gray-900 px-8 py-4 flex justify-between items-center border-b border-gray-800">
        <h1 className="text-xl font-bold">🎬 CineVault Admin</h1>
        <button
          className="text-gray-400 hover:text-white text-sm"
          onClick={() => { 
            setToken("")
            setVista("login")
            desconectarSocket()
          }}
        >
          Cerrar sesión
        </button>
      </div>

      <div className="flex">
        {/* SIDEBAR */}
        <div className="w-64 bg-gray-900 min-h-screen p-4 border-r border-gray-800 space-y-2">
          <p className="text-gray-500 text-xs uppercase mb-4">Panel de Admin</p>
          {[
            { label: "🏠 Dashboard", endpoint: "dashboard" },
            { label: "🛡️ Moderación", endpoint: "/rbac/moderation" },
            { label: "📋 Actividad", endpoint: "/rbac/users/activity/feed" },
            { label: "🚨 Reportes", endpoint: "/rbac/reports" },
            { label: "📰 Noticias", endpoint: "/rbac/news" },
            { label: "🌐 Sesiones", endpoint: "/rbac/stats/sessions" },
          ].map(item => (
            <button
              key={item.endpoint}
              className={`w-full text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition flex items-center justify-between ${
                endpoint === item.endpoint ? "bg-gray-800 text-white" : ""
              }`}
              onClick={() => {
                if (item.endpoint === "/rbac/moderation") {
                  setEndpoint("/rbac/moderation")
                  setDatos(null)
                } else if (item.endpoint === "dashboard") {
                  setEndpoint("dashboard")
                  setDatos(null)
                } else {
                  llamar(item.endpoint)
                }
              }}
            >
              <span>{item.label}</span>
              {item.endpoint === "dashboard" && alertas.filter(a => !a.leida).length > 0 && (
              <span className={`text-white text-xs font-bold px-1.5 py-0.5 rounded-full ${
                alertas.some(a => !a.leida && a.prioridad === "critico")
                  ? "bg-red-500"
                  : alertas.some(a => !a.leida && a.prioridad === "alto")
                  ? "bg-orange-500"
                  : "bg-yellow-500"
              }`}>
                {alertas.filter(a => !a.leida).length}
              </span>
            )}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 p-8">
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">
              ⚠️ {error}
            </div>
          )}

          {endpoint === "dashboard" && (
            <Dashboard
              token={token}
              alertas={alertas}
              onDismissAlerta={(i) => {
                setAlertas(prev => prev.filter((_, j) => j !== i))
              }}
              onLeerAlerta={(i) => {                                    // ← añadir
                setAlertas(prev => prev.map((a, j) =>
                  j === i ? { ...a, leida: true } : a
                ))
              }}
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

          {endpoint === "/rbac/moderation" && (
            <ModerationPanel token={token} />
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