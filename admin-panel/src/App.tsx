import { useState } from "react"

const API = "http://localhost:4000/api"

export default function App() {
  const [token, setToken] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [vista, setVista] = useState("login")
  const [datos, setDatos] = useState<any>(null)
  const [error, setError] = useState("")

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
    } else {
      setError("Credenciales incorrectas")
    }
  }

  // LLAMADA A LA API
  const llamar = async (endpoint: string) => {
    setError("")
    setDatos(null)
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
          onClick={() => { setToken(""); setVista("login") }}
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
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">
              ⚠️ {error}
            </div>
          )}
          {!datos && !error && (
            <p className="text-gray-500">Selecciona una sección del menú</p>
          )}
          {datos && (
            <pre className="bg-gray-900 p-6 rounded-xl text-green-400 text-sm overflow-auto">
              {JSON.stringify(datos, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}