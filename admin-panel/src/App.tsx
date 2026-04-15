import { useState, useEffect } from "react"
import StatsPanel from "./components/StatsPanel"
import ReportsTable from "./components/ReportsTable"
import UsersTable from "./components/UsersTable"
import PaymentsTable from "./components/PaymentsTable"
import ActivityTable from "./components/ActivityTable"
import ModerationTable from "./components/ModerationTable"
import UserCommentsTable from "./components/UserCommentsTable"

import SessionsChart from "./components/SessionsChart"
import { conectarSocket, desconectarSocket, socket } from "./socket"

const API = "http://localhost:4000/api"
//const API = "http://192.168.1.15:4000/api"  para pruebas login movil


export default function App() {
  const [token, setToken] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [vista, setVista] = useState("login")
  const [datos, setDatos] = useState<any>(null)
  const [error, setError] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [alertas, setAlertas] = useState<any[]>([])
  const [userIdBuscado, setUserIdBuscado] = useState<number | null>(null)


 // Escucha alertas de contenido bloqueado por la IA
  useEffect(() => {
    socket.on("contenido_bloqueado", (datos) => {
      console.log("[Socket] Datos recibidos:", datos)
      setAlertas(prev => [datos, ...prev].slice(0, 10)) // máximo 10 alertas
    })

   return () => {
      socket.off("contenido_bloqueado")
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
            { label: "📊 Estadísticas", endpoint: "/rbac/stats" },
            { label: "🚨 Reportes", endpoint: "/rbac/reports" },
            { label: "👥 Usuarios", endpoint: "/users" },
            { label: "💰 Pagos", endpoint: "/rbac/payments" },
            { label: "📰 Noticias", endpoint: "/rbac/news" },
            { label: "📋 Actividad", endpoint: "/rbac/users/activity" },
            { label: "🌐 Sesiones", endpoint: "/rbac/stats/sessions" },
            { label: "🛡️ Moderación", endpoint: "/rbac/moderation/history" },
            
          ].map(item => (
            <button
              key={item.endpoint}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition"
              onClick={() => llamar(item.endpoint)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 p-8">
          {/* ALERTAS EN TIEMPO REAL */}
        {alertas.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-red-400 text-sm font-semibold uppercase">
              ⚠️ Alertas en tiempo real
            </h3>
        {alertas.map((alerta, i) => (
          <div key={i} className="bg-red-950 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-semibold">Contenido bloqueado</span>
                <span className="text-red-400 ml-2">— {alerta.categorias}</span>
                <p className="text-red-500 text-xs mt-1 truncate max-w-lg">"{alerta.texto}..."</p>
                
                {/* Datos del usuario */}
                {alerta.usuario && (
                  <div className="mt-2 flex gap-3 flex-wrap">
                    <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">
                      👤 {alerta.usuario.username}
                    </span>
                    <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">
                      📧 {alerta.usuario.email}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      alerta.usuario.role === "admin" ? "bg-red-500 text-red-950" :
                      alerta.usuario.role === "editor" ? "bg-yellow-500 text-yellow-950" :
                      "bg-blue-500 text-blue-950"
                    }`}>
                      {alerta.usuario.role}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      alerta.usuario.membership === "pro" ? "bg-indigo-500 text-indigo-950" :
                      alerta.usuario.membership === "vip" ? "bg-purple-500 text-purple-950" :
                      "bg-gray-500 text-gray-950"
                    }`}>
                      {alerta.usuario.membership}
                    </span>
                    {alerta.usuario.reportes_previos > 0 && (
                      <span className="bg-red-800 text-red-300 px-2 py-1 rounded text-xs font-semibold">
                        ⚠️ {alerta.usuario.reportes_previos} reportes previos
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span className="text-red-500 text-xs whitespace-nowrap ml-4">
                {new Date(alerta.timestamp).toLocaleTimeString("es-ES")}
              </span>
            </div>
            {/* ACCIONES */}
            <div className="flex gap-2 mt-2">
              <button
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs font-semibold"
                onClick={() => enviarWarning(alerta.userId, alerta.texto)}
              >
                ⚠️ Enviar warning
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold"
                onClick={() => banearUsuario(alerta.userId)}
              >
                🚫 Banear usuario
              </button>
              <button
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded text-xs font-semibold"
                onClick={() => {
                  setAlertas(prev => prev.filter((_, j) => j !== i))
                  setDatos(null)   // ← añade esto
                  setEndpoint("")  // ← y esto
                }}
              >
                ✕ Ignorar
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold"
                onClick={() => {
                  setUserIdBuscado(alerta.userId)
                  llamar(`/rbac/users/${alerta.userId}/comments`)
                }}
              >
                💬 Ver comentarios
              </button>
            </div>
          </div>
        ))}
          </div>
        )}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">
              ⚠️ {error}
            </div>
          )}
          {!datos && !error && (
            <p className="text-gray-500">Selecciona una sección del menú</p>
          )}
          {datos && vista === "panel" && (
            <>
              {endpoint === "/rbac/stats" ? (
                  <StatsPanel datos={datos} />
                ) : endpoint === "/rbac/reports" ? (
                  <ReportsTable datos={datos} />
                ) : endpoint === "/users" ? (
                  <UsersTable datos={datos} />
                ) : endpoint === "/rbac/payments" ? (
                  <PaymentsTable datos={datos} />
                ) : endpoint === "/rbac/users/activity" ? (
                  <ActivityTable datos={datos} />
                ) : endpoint === "/rbac/stats/sessions" ? (
                  <SessionsChart datos={datos} />
                ) : endpoint === "/rbac/moderation/history" ? (
                  <ModerationTable datos={datos} />
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