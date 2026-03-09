import { notificationsRepository } from "../repositories/NotificationsRepository.js"
import { io, usuariosConectados } from "../config/socketio.config.js"
import type { notifications_type } from "@prisma/client"
import { redis } from "../lib/redis.js"

/* ==========================================================================
   NOTIFICATIONS SERVICE
   --------------------------------------------------------------------------
   Contiene TODA la lógica de notificaciones (persistencia + Socket.IO).

   IMPORTANTE: emitirNotificacionService se exporta para ser usada por otros
   servicios (reviews, diary, etc.) que necesiten notificar a usuarios.
   Así se rompe el acoplamiento cruzado entre controladores que existía antes
   (ReviewsController importaba de NotificationsController).
   ========================================================================== */

/**
 * Crea una notificación en BD y la emite en tiempo real a través de Socket.IO
 * si el destinatario tiene una conexión activa.
 */
export const emitirNotificacionService = async ({
  user_id,
  sender_id,
  type,
}: {
  user_id: number
  sender_id: number
  type: notifications_type
}) => {
  const notificacion = await notificationsRepository.create({
    user_id,
    sender_id,
    type,
  })

  const socketId = usuariosConectados.get(user_id)
  if (socketId) {
    io.to(socketId).emit("nueva_notificacion", notificacion)
  } else {
    await redis.lpush(queueKey(user_id), JSON.stringify(notificacion))
    await redis.ltrim(queueKey(user_id), 0, 49)
  }

  return notificacion
}

export const obtenerNotificacionesService = (userId: number) =>
  notificationsRepository.findByUserId(userId)

export const marcarComoLeidaService = async (
  userId: number,
  notifId: number
) => {
  // markAsRead ya filtra por user_id internamente, devuelve null si no es del usuario
  const notificacion = await notificationsRepository.markAsRead(notifId, userId)
  return notificacion
}

export const marcarTodasComoLeidasService = (userId: number) =>
  notificationsRepository.markAllAsRead(userId)

export const contarNoLeidasService = (userId: number) =>
  notificationsRepository
    .findByUserId(userId, 1000)
    .then((notifs) => notifs.filter((n) => !n.read).length)

export const entregarPendientesService = async (userId: number) => {
  const key = queueKey(userId)
  const pendientes = await redis.lrange(key, 0, -1)
  if (pendientes.length === 0) return []

  await redis.del(key)

  const parsed = pendientes.map((raw) => {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })

  return parsed.filter(Boolean)
}

const queueKey = (userId: number) => `notif:queue:${userId}`
