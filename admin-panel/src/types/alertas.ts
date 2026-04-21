export interface Alerta {
  tipo: "contenido_bloqueado" | "nuevo_reporte" | "ban_automatico"
  prioridad: "critico" | "alto" | "medio" | "info"
  leida: boolean
  timestamp: string
  // contenido_bloqueado
  categorias?: string[]
  texto?: string
  userId?: number
  usuario?: {
    username: string
    email: string
    role: string
    membership: string
    reportes_previos?: number
  }
  // nuevo_reporte
  reporteId?: number
  motivo?: string
  motivoDetalle?: string
  reviewId?: number
  reporter?: {
    id: number
    username: string
    email: string
    role: string
    membership: string
  }
  // ban_automatico
  tipoBan?: string
}