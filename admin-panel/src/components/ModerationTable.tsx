/* ==========================================================================
   ModerationTable — Historial de acciones de moderación
   --------------------------------------------------------------------------
   Muestra las últimas acciones tomadas por los admins:
   content_blocked, user_banned, warning_sent
   ========================================================================== */

interface User {
  id: number
  username: string
  role: string
}

interface ModerationAction {
  id: number
  user_id: number
  action: string
  created_at: string
  users: User
}

interface ModerationTableProps {
  datos: ModerationAction[]
}

const iconoAccion: Record<string, string> = {
  content_blocked: "🚫",
  user_banned:     "⛔",
  warning_sent:    "⚠️",
}

const colorAccion: Record<string, string> = {
  content_blocked: "bg-orange-500 text-orange-950",
  user_banned:     "bg-red-500 text-red-950",
  warning_sent:    "bg-yellow-500 text-yellow-950",
}

const textoAccion: Record<string, string> = {
  content_blocked: "Contenido bloqueado",
  user_banned:     "Usuario baneado",
  warning_sent:    "Warning enviado",
}

export default function ModerationTable({ datos }: ModerationTableProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-bold">🛡️ Historial de Moderación</h2>

      {datos.length === 0 && (
        <p className="text-gray-500 text-sm">No hay acciones de moderación registradas.</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Acción</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Fecha y hora</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((item, i) => (
              <tr
                key={item.id}
                className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}
              >
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorAccion[item.action] ?? "bg-gray-500 text-gray-950"}`}>
                    {iconoAccion[item.action] ?? "⚡"} {textoAccion[item.action] ?? item.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-white font-medium">
                  {item.users?.username ?? "Desconocido"}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(item.created_at).toLocaleString("es-ES")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}