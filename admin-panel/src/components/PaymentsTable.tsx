/* ==========================================================================
   PaymentsTable — Tabla de pagos
   --------------------------------------------------------------------------
   Muestra el historial de pagos de la plataforma en una tabla visual.
   Consume el endpoint GET /api/rbac/payments
   
   Cada pago muestra:
   - ID del pago
   - Usuario
   - Importe y moneda
   - Estado del pago con color
   - Proveedor (Stripe/PayPal)
   - Fecha
   ========================================================================== */

interface User {
  id: number
  username: string
  email: string
}

interface Payment {
  id: number
  user_id: number
  amount: number
  currency: string
  provider: "stripe" | "paypal"
  payment_status: "pending" | "paid" | "failed" | "refunded"
  created_at: string
  users: User
}

interface PaymentsTableProps {
  datos: Payment[]
}

// Colores por estado del pago
const colorEstado: Record<string, string> = {
  pending:  "bg-yellow-500 text-yellow-950",
  paid:     "bg-green-500 text-green-950",
  failed:   "bg-red-500 text-red-950",
  refunded: "bg-gray-500 text-gray-950",
}

const textoEstado: Record<string, string> = {
  pending:  "Pendiente",
  paid:     "Pagado",
  failed:   "Fallido",
  refunded: "Reembolsado",
}

// Colores por proveedor
const colorProveedor: Record<string, string> = {
  stripe: "bg-indigo-500 text-indigo-950",
  paypal: "bg-blue-500 text-blue-950",
}

export default function PaymentsTable({ datos }: PaymentsTableProps) {
  // Total recaudado — solo pagos con estado "paid"
  const totalRecaudado = datos
    .filter(p => p.payment_status === "paid")
    .reduce((acc, p) => acc + Number(p.amount), 0)

  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-bold">💰 Pagos</h2>

      {/* RESUMEN */}
      <div className="flex gap-4 mb-4">
        <span className="bg-green-500 text-green-950 px-3 py-1 rounded-full text-sm font-semibold">
          Total recaudado: {totalRecaudado.toFixed(2)} EUR
        </span>
        <span className="bg-yellow-500 text-yellow-950 px-3 py-1 rounded-full text-sm font-semibold">
          {datos.filter(p => p.payment_status === "pending").length} pendientes
        </span>
        <span className="bg-red-500 text-red-950 px-3 py-1 rounded-full text-sm font-semibold">
          {datos.filter(p => p.payment_status === "failed").length} fallidos
        </span>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Importe</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Proveedor</th>
              <th className="px-4 py-3 text-left">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((pago, i) => (
              <tr
                key={pago.id}
                className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}
              >
                <td className="px-4 py-3 text-gray-400">#{pago.id}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-white font-medium">{pago.users?.username ?? "Desconocido"}</p>
                    <p className="text-gray-500 text-xs">{pago.users?.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-white font-bold">
                  {Number(pago.amount).toFixed(2)} {pago.currency}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorEstado[pago.payment_status]}`}>
                    {textoEstado[pago.payment_status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorProveedor[pago.provider]}`}>
                    {pago.provider}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(pago.created_at).toLocaleDateString("es-ES")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}