/* ==========================================================================
   UsersTable — Tabla de usuarios con rol y membresía
   --------------------------------------------------------------------------
   Muestra la lista de usuarios de la plataforma en una tabla visual.
   Consume el endpoint GET /api/users
   
   Cada usuario muestra:
   - Avatar
   - Username y email
   - Rol (admin/editor/user) con color
   - Membresía (free/vip/pro) con color
   - Verificado o no
   - Fecha de registro
   ========================================================================== */

interface User {
  id: number
  username: string
  email: string
  role: "admin" | "editor" | "user"
  membership: "free" | "vip" | "pro"
  avatar_url: string | null
  is_verified: boolean
  created_at: string
}

interface UsersTableProps {
  datos: User[]
}

// Colores por rol
const colorRol: Record<string, string> = {
  admin:  "bg-red-500 text-red-950",
  editor: "bg-yellow-500 text-yellow-950",
  user:   "bg-blue-500 text-blue-950",
}

// Colores por membresía
const colorMembresia: Record<string, string> = {
  free: "bg-gray-500 text-gray-950",
  vip:  "bg-purple-500 text-purple-950",
  pro:  "bg-indigo-500 text-indigo-950",
}

export default function UsersTable({ datos }: UsersTableProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-bold">👥 Usuarios</h2>

      {/* RESUMEN */}
      <div className="flex gap-4 mb-4">
        <span className="bg-red-500 text-red-950 px-3 py-1 rounded-full text-sm font-semibold">
          {datos.filter(u => u.role === "admin").length} admins
        </span>
        <span className="bg-yellow-500 text-yellow-950 px-3 py-1 rounded-full text-sm font-semibold">
          {datos.filter(u => u.role === "editor").length} editores
        </span>
        <span className="bg-blue-500 text-blue-950 px-3 py-1 rounded-full text-sm font-semibold">
          {datos.filter(u => u.role === "user").length} usuarios
        </span>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Membresía</th>
              <th className="px-4 py-3 text-left">Verificado</th>
              <th className="px-4 py-3 text-left">Registro</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((usuario, i) => (
              <tr
                key={usuario.id}
                className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {usuario.avatar_url ? (
                      <img
                        src={usuario.avatar_url}
                        alt={usuario.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs">
                        {usuario.username[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-white font-medium">{usuario.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400">{usuario.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorRol[usuario.role]}`}>
                    {usuario.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorMembresia[usuario.membership]}`}>
                    {usuario.membership}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {usuario.is_verified ? (
                    <span className="text-green-400">✅</span>
                  ) : (
                    <span className="text-red-400">❌</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(usuario.created_at).toLocaleDateString("es-ES")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}