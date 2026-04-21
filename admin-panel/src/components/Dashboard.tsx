/* ==========================================================================
   Dashboard — Vista de inicio del panel de administración
   --------------------------------------------------------------------------
   Carga automáticamente al entrar al panel.
   Muestra estadísticas generales, alertas en tiempo real y accesos rápidos.
   ========================================================================== */

import { useEffect, useState } from "react"
import type { Alerta } from "../types/alertas"

// ─── StatsCard ────────────────────────────────────────────────────────────────

interface StatsCardProps {
  label: string
  value: number | string
  icon: string
  color: string
  sublabel?: string
}

function StatsCard({ label, value, icon, color, sublabel }: StatsCardProps) {
  return (
    <div className={`bg-gray-900 rounded-xl p-5 border-l-4 ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold text-white">
          {typeof value === "number" ? value.toLocaleString("es-ES") : value}
        </span>
      </div>
      <p className="text-gray-300 text-sm font-medium">{label}</p>
      {sublabel && <p className="text-gray-500 text-xs mt-0.5">{sublabel}</p>}
    </div>
  )
}

const API = "http://localhost:4000/api"

interface StatsData {
  usuarios: {
    total: number
    por_rol: { admin: number; editor: number; user: number }
    nuevos_este_mes: number
  }
  resenas: { total: number; esta_semana: number }
  reportes: { pendientes: number; resueltos: number; rechazados: number }
  comentarios: { total: number }
}



interface DashboardProps {
  token: string
  alertas: Alerta[]
  onDismissAlerta: (index: number) => void
  onLeerAlerta: (index: number) => void  // ← añadir
  onBanear: (userId: number) => void
  onWarning: (userId: number, texto: string) => void
  onVerComentarios: (userId: number) => void
  onNavegar: (endpoint: string) => void
}

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

export default function Dashboard({
  token,
  alertas,
  onDismissAlerta,
  onLeerAlerta,  // ← añadir
  onBanear,
  onWarning,
  onVerComentarios,
  onNavegar,
}: DashboardProps) {
  const [stats, setStats]       = useState<StatsData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")

  useEffect(() => {
    fetch(`${API}/rbac/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error.message)
        setStats(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="space-y-8">

      {/* ALERTAS EN TIEMPO REAL */}
{alertas.length > 0 && (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <h3 className="text-sm font-semibold uppercase text-red-400">
        ⚠️ Alertas en tiempo real
      </h3>
      <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full ${
        alertas.some(a => !a.leida && a.prioridad === "critico")
          ? "bg-red-500"
          : alertas.some(a => !a.leida && a.prioridad === "alto")
          ? "bg-orange-500"
          : "bg-yellow-500"
      }`}>
        {alertas.filter(a => !a.leida).length} sin leer
      </span>
    </div>

    {alertas.map((alerta, i) => {
      // Estilos por prioridad
      const estilos = {
        critico: {
          container: "bg-red-950/50 border-red-700/50",
          titulo:    "text-red-400",
          badge:     "bg-red-500/10 text-red-400 border-red-500/20",
          icono:     "🔴",
        },
        alto: {
          container: "bg-orange-950/30 border-orange-700/40",
          titulo:    "text-orange-400",
          badge:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
          icono:     "🟠",
        },
        medio: {
          container: "bg-yellow-950/20 border-yellow-700/30",
          titulo:    "text-yellow-400",
          badge:     "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
          icono:     "🟡",
        },
        info: {
          container: "bg-blue-950/20 border-blue-700/30",
          titulo:    "text-blue-400",
          badge:     "bg-blue-500/10 text-blue-400 border-blue-500/20",
          icono:     "🔵",
        },
      }

      const estilo = estilos[alerta.prioridad] ?? estilos.medio

      // Título según tipo
      const titulo =
        alerta.tipo === "contenido_bloqueado" ? "Contenido bloqueado por IA" :
        alerta.tipo === "nuevo_reporte"        ? "Nuevo reporte recibido" :
        alerta.tipo === "ban_automatico"       ? "Ban automático aplicado" :
        "Alerta"

      // Usuario relevante según tipo
      const usuarioMostrado =
        alerta.tipo === "nuevo_reporte" ? alerta.reporter :
        alerta.usuario

      return (
        <div
          key={i}
          className={`border rounded-xl p-4 transition-opacity ${estilo.container} ${alerta.leida ? "opacity-50" : ""}`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span>{estilo.icono}</span>
                <span className={`text-sm font-semibold ${estilo.titulo}`}>{titulo}</span>
                {/* Badge de categorías o motivo */}
                {alerta.tipo === "contenido_bloqueado" && alerta.categorias && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${estilo.badge}`}>
                    {Array.isArray(alerta.categorias) ? alerta.categorias.join(", ") : alerta.categorias}
                  </span>
                )}
                {alerta.tipo === "nuevo_reporte" && alerta.motivo && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${estilo.badge}`}>
                    {alerta.motivo.replace(/_/g, " ")}
                  </span>
                )}
                {alerta.tipo === "ban_automatico" && alerta.tipoBan && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${estilo.badge}`}>
                    3 strikes · {alerta.tipoBan}
                  </span>
                )}
              </div>

              {/* Texto del contenido si existe */}
              {alerta.texto && (
                <p className="text-xs text-gray-400 truncate max-w-lg mb-2">
                  "{alerta.texto}"
                </p>
              )}

              {/* Detalle del reporte si existe */}
              {alerta.motivoDetalle && (
                <p className="text-xs text-gray-500 italic mb-2">
                  "{alerta.motivoDetalle}"
                </p>
              )}

              {/* Datos del usuario */}
              {usuarioMostrado && (
                <div className="flex gap-2 flex-wrap mt-1">
                  <span className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-300 border border-gray-700">
                    @{usuarioMostrado.username}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-md ${colorRol[usuarioMostrado.role]}`}>
                    {usuarioMostrado.role}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-md ${colorMembresia[usuarioMostrado.membership]}`}>
                    {usuarioMostrado.membership}
                  </span>
                  {(alerta.usuario?.reportes_previos ?? 0) > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                      ⚠️ {alerta.usuario?.reportes_previos} reportes previos
                    </span>
                  )}
                </div>
              )}
            </div>

            <span className="text-gray-500 text-xs whitespace-nowrap ml-4">
              {new Date(alerta.timestamp).toLocaleTimeString("es-ES")}
            </span>
          </div>

          {/* Acciones según tipo */}
          <div className="flex gap-2 flex-wrap">
            {alerta.tipo !== "nuevo_reporte" && (
              <>
                <button
                  onClick={() => alerta.userId && onWarning(alerta.userId, alerta.texto ?? "")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
                >
                  Enviar warning
                </button>
                <button
                  onClick={() => alerta.userId && onBanear(alerta.userId)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Banear usuario
                </button>
                <button
                  onClick={() => alerta.userId && onVerComentarios(alerta.userId)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                >
                  Ver comentarios
                </button>
              </>
            )}
            {alerta.tipo === "nuevo_reporte" && (
              <button
                onClick={() => onNavegar("/rbac/reports")}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
              >
                Ver reportes →
              </button>
            )}
            <button
              onClick={() => onDismissAlerta(i)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 transition-colors"
            >
              Ignorar
            </button>
          </div>
        </div>
      )
    })}
  </div>
)}

      {/* ESTADÍSTICAS */}
      {loading && <p className="text-gray-500 text-sm">Cargando estadísticas...</p>}
      {error && <p className="text-red-400 text-sm">⚠️ {error}</p>}

      {stats && (
        <>
          {/* Usuarios */}
          <div>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Usuarios
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatsCard
                label="Total usuarios"
                value={stats.usuarios.total}
                icon="👥"
                color="border-indigo-500"
                sublabel={`${stats.usuarios.nuevos_este_mes} nuevos este mes`}
              />
              <StatsCard
                label="Admins"
                value={stats.usuarios.por_rol.admin}
                icon="🛡️"
                color="border-red-500"
              />
              <StatsCard
                label="Editores"
                value={stats.usuarios.por_rol.editor}
                icon="✏️"
                color="border-yellow-500"
              />
              <StatsCard
                label="Usuarios"
                value={stats.usuarios.por_rol.user}
                icon="👤"
                color="border-blue-500"
              />
            </div>
          </div>

          {/* Contenido */}
          <div>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Contenido
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatsCard
                label="Reseñas totales"
                value={stats.resenas.total}
                icon="📝"
                color="border-blue-500"
                sublabel={`${stats.resenas.esta_semana} esta semana`}
              />
              <StatsCard
                label="Comentarios"
                value={stats.comentarios.total}
                icon="💬"
                color="border-purple-500"
              />
            </div>
          </div>

          {/* Moderación */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                Moderación
              </h3>
              {stats.reportes.pendientes > 0 && (
                <button
                  onClick={() => onNavegar("/rbac/reports")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Ver reportes pendientes →
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatsCard
                label="Pendientes"
                value={stats.reportes.pendientes}
                icon="🚨"
                color="border-red-500"
              />
              <StatsCard
                label="Resueltos"
                value={stats.reportes.resueltos}
                icon="✅"
                color="border-green-500"
              />
              <StatsCard
                label="Rechazados"
                value={stats.reportes.rechazados}
                icon="❌"
                color="border-gray-500"
              />
            </div>
          </div>

          {/* Accesos rápidos */}
          <div>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Accesos rápidos
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
              { label: "🚨 Reportes", endpoint: "/rbac/reports" },
              { label: "🛡️ Moderación", endpoint: "/rbac/moderation" },
              { label: "📋 Actividad", endpoint: "/rbac/users/activity/feed" },
              { label: "🌐 Sesiones", endpoint: "/rbac/stats/sessions" },
            ].map(item => (
                <button
                  key={item.endpoint}
                  onClick={() => onNavegar(item.endpoint)}
                  className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-4 text-left transition-colors"
                >
                  <p className="text-sm font-medium text-gray-300">{item.label}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}