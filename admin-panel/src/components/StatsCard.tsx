/* ==========================================================================
   StatsCard — Tarjeta individual de estadística
   --------------------------------------------------------------------------
   Componente reutilizable que muestra un valor numérico con su etiqueta
   e icono. Se usa dentro de StatsPanel para mostrar cada métrica.
   
   Props:
   - label: texto descriptivo de la métrica
   - value: valor numérico a mostrar
   - icon: emoji o icono
   - color: color del borde izquierdo (clase Tailwind)
   ========================================================================== */

interface StatsCardProps {
  label: string
  value: number
  icon: string
  color: string
}

export default function StatsCard({ label, value, icon, color }: StatsCardProps) {
  return (
    <div className={`bg-gray-900 rounded-xl p-6 border-l-4 ${color} flex items-center gap-4`}>
      <span className="text-4xl">{icon}</span>
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-white text-3xl font-bold">{value}</p>
      </div>
    </div>
  )
}