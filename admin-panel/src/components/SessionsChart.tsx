/* ==========================================================================
   SessionsChart — Visualización de sesiones por navegador y dispositivo
   --------------------------------------------------------------------------
   Muestra las estadísticas de sesiones activas agrupadas por navegador
   y dispositivo en un formato visual con barras de progreso.
   Consume el endpoint GET /api/rbac/stats/sessions
   ========================================================================== */

interface SessionsData {
  sesiones_activas: number
  navegadores: Record<string, number>
  dispositivos: Record<string, number>
}

interface SessionsChartProps {
  datos: SessionsData
}

// Iconos por navegador
const iconoNavegador: Record<string, string> = {
  Chrome:      "🌐",
  Firefox:     "🦊",
  Safari:      "🧭",
  Edge:        "🔷",
  Opera:       "🔴",
  Desconocido: "❓",
}

// Iconos por dispositivo
const iconoDispositivo: Record<string, string> = {
  desktop: "🖥️",
  mobile:  "📱",
  tablet:  "📟",
}

// Componente interno para la barra de progreso
function BarraProgreso({ label, value, total, icono, color }: {
  label: string
  value: number
  total: number
  icono: string
  color: string
}) {
  const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-gray-300 text-sm flex items-center gap-2">
          <span>{icono}</span>
          {label}
        </span>
        <span className="text-white font-semibold text-sm">
          {value} <span className="text-gray-500 font-normal">({porcentaje}%)</span>
        </span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  )
}

export default function SessionsChart({ datos }: SessionsChartProps) {
  const totalNavegadores = Object.values(datos.navegadores).reduce((a, b) => a + b, 0)
  const totalDispositivos = Object.values(datos.dispositivos).reduce((a, b) => a + b, 0)

  const coloresNavegadores = [
    "bg-blue-500", "bg-green-500", "bg-yellow-500",
    "bg-red-500", "bg-purple-500", "bg-indigo-500"
  ]

  const coloresDispositivos: Record<string, string> = {
    desktop: "bg-indigo-500",
    mobile:  "bg-green-500",
    tablet:  "bg-yellow-500",
  }

  return (
    <div className="space-y-6">
      <h2 className="text-white text-xl font-bold">🌐 Sesiones Activas</h2>

      {/* TOTAL */}
      <div className="bg-gray-900 rounded-xl p-6 border-l-4 border-indigo-500 flex items-center gap-4">
        <span className="text-4xl">🔗</span>
        <div>
          <p className="text-gray-400 text-sm">Total sesiones activas</p>
          <p className="text-white text-3xl font-bold">{datos.sesiones_activas}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* NAVEGADORES */}
        <div className="bg-gray-900 rounded-xl p-6 space-y-4">
          <h3 className="text-gray-400 text-sm uppercase">Navegadores</h3>
          {Object.entries(datos.navegadores).map(([nombre, valor], i) => (
            <BarraProgreso
              key={nombre}
              label={nombre}
              value={valor}
              total={totalNavegadores}
              icono={iconoNavegador[nombre] ?? "🌐"}
              color={coloresNavegadores[i % coloresNavegadores.length]}
            />
          ))}
          {Object.keys(datos.navegadores).length === 0 && (
            <p className="text-gray-500 text-sm">Sin datos de navegadores</p>
          )}
        </div>

        {/* DISPOSITIVOS */}
        <div className="bg-gray-900 rounded-xl p-6 space-y-4">
          <h3 className="text-gray-400 text-sm uppercase">Dispositivos</h3>
          {Object.entries(datos.dispositivos).map(([nombre, valor]) => (
            <BarraProgreso
              key={nombre}
              label={nombre}
              value={valor}
              total={totalDispositivos}
              icono={iconoDispositivo[nombre] ?? "💻"}
              color={coloresDispositivos[nombre] ?? "bg-gray-500"}
            />
          ))}
          {Object.keys(datos.dispositivos).length === 0 && (
            <p className="text-gray-500 text-sm">Sin datos de dispositivos</p>
          )}
        </div>
      </div>
    </div>
  )
}