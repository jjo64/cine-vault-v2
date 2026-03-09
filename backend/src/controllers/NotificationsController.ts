import { Request, Response } from "express"
import * as notifService from "../services/notifications.services.js"

/* ==========================================================================
   CONTROLADOR DE NOTIFICACIONES
   --------------------------------------------------------------------------
   Responsabilidad ÚNICA: extraer datos del request, llamar al servicio y
   devolver res. Sin Prisma directo. Sin Socket.IO directo.

   NOTA: emitirNotificacion se re-exporta desde el servicio para que los
   módulos que la importaban por nombre sigan funcionando sin cambios.
   ========================================================================== */

/** Re-exportación para compatibilidad con imports existentes */
export { emitirNotificacionService as emitirNotificacion } from "../services/notifications.services.js"

export const getNotifications = async (req: Request, res: Response) => {
  const notificaciones = await notifService.obtenerNotificacionesService(
    req.user!.user_id
  )
  res.json(notificaciones)
}

export const marcarComoLeida = async (req: Request, res: Response) => {
  await notifService.marcarComoLeidaService(
    req.user!.user_id,
    Number(req.params.id)
  )
  res.json({ message: "Notificación marcada como leída" })
}

export const marcarTodasComoLeidas = async (req: Request, res: Response) => {
  await notifService.marcarTodasComoLeidasService(req.user!.user_id)
  res.json({ message: "Todas las notificaciones marcadas como leídas" })
}

export const getUnreadCount = async (req: Request, res: Response) => {
  const count = await notifService.contarNoLeidasService(req.user!.user_id)
  res.json({ count })
}

export const getPending = async (req: Request, res: Response) => {
  const pendientes = await notifService.entregarPendientesService(
    req.user!.user_id
  )
  res.json({ pending: pendientes })
}
