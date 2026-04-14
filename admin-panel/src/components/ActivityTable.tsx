/* ==========================================================================
   ActivityTable — Tabla de actividad de usuarios
   --------------------------------------------------------------------------
   Muestra el registro de acciones de los usuarios en una tabla visual.
   Consume el endpoint GET /api/rbac/users/activity
   
   Cada entrada muestra:
   - Usuario
   - Acción realizada
   - Fecha y hora
   ========================================================================== */

interface User {
  id: number
  username: string
}

interface Activity {
  id: number
  user_id: number
  action: string
  created_at: string
  users: User
}

interface ActivityTableProps {
  datos: Activity[]
}

// Icono por tipo de acción
const iconoAccion: Record<string, string> = {
  login:            "🔐",
  view_movie:       "🎬",
  add_to_vault:     "🗄️",
  add_to_watchlist: "📋",
  write_review:     "📝",
  like_review:      "❤️",
  follow_user:      "👤",
  update_profile:   "⚙️",
}

export default function ActivityTable({ datos }: ActivityTableProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-bold">📋 Actividad de Usuarios</h2>

      {/* RESUMEN */}
      <p className="text-gray-400 text-sm">
        Mostrando las últimas <span className="text-white font-semibold">{datos.length}</span> acciones
      </p>

      {/* TABLA */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Acción</th>
              <th className="px-4 py-3 text-left">Fecha y hora</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((actividad, i) => (
              <tr
                key={actividad.id}
                className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}
              >
                <td className="px-4 py-3 text-white font-medium">
                  {actividad.users?.username ?? "Desconocido"}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  <span className="mr-2">
                    {iconoAccion[actividad.action] ?? "⚡"}
                  </span>
                  {actividad.action}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(actividad.created_at).toLocaleString("es-ES")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}