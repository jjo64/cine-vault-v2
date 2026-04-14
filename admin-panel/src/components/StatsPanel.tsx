/* ==========================================================================
   StatsPanel — Panel de estadísticas generales
   --------------------------------------------------------------------------
   Muestra las métricas globales de la plataforma en tarjetas visuales.
   Consume el endpoint GET /api/rbac/stats
   
   Reutilizable en el frontend real — solo necesita recibir los datos
   como prop o hacer el fetch internamente.
   ========================================================================== */

import StatsCard from "./StatsCard"

interface StatsData {
  usuarios: {
    total: number
    por_rol: {
      admin: number
      editor: number
      user: number
    }
    nuevos_este_mes: number
  }
  resenas: {
    total: number
    esta_semana: number
  }
  reportes: {
    pendientes: number
    resueltos: number
    rechazados: number
  }
  comentarios: {
    total: number
  }
}

interface StatsPanelProps {
  datos: StatsData
}

export default function StatsPanel({ datos }: StatsPanelProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-white text-xl font-bold">📊 Estadísticas Generales</h2>

      {/* USUARIOS */}
      <div>
        <h3 className="text-gray-400 text-sm uppercase mb-3">Usuarios</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatsCard label="Total usuarios" value={datos.usuarios.total} icon="👥" color="border-indigo-500" />
          <StatsCard label="Nuevos este mes" value={datos.usuarios.nuevos_este_mes} icon="🆕" color="border-green-500" />
          <StatsCard label="Admins" value={datos.usuarios.por_rol.admin} icon="🛡️" color="border-red-500" />
          <StatsCard label="Editores" value={datos.usuarios.por_rol.editor} icon="✏️" color="border-yellow-500" />
        </div>
      </div>

      {/* CONTENIDO */}
      <div>
        <h3 className="text-gray-400 text-sm uppercase mb-3">Contenido</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatsCard label="Total reseñas" value={datos.resenas.total} icon="📝" color="border-blue-500" />
          <StatsCard label="Reseñas esta semana" value={datos.resenas.esta_semana} icon="📈" color="border-cyan-500" />
          <StatsCard label="Total comentarios" value={datos.comentarios.total} icon="💬" color="border-purple-500" />
        </div>
      </div>

      {/* MODERACIÓN */}
      <div>
        <h3 className="text-gray-400 text-sm uppercase mb-3">Moderación</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatsCard label="Reportes pendientes" value={datos.reportes.pendientes} icon="🚨" color="border-red-500" />
          <StatsCard label="Resueltos" value={datos.reportes.resueltos} icon="✅" color="border-green-500" />
          <StatsCard label="Rechazados" value={datos.reportes.rechazados} icon="❌" color="border-gray-500" />
        </div>
      </div>
    </div>
  )
}