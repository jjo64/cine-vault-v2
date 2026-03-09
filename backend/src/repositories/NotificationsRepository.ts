import { notifications, notifications_type } from "@prisma/client"
import { prisma } from "../lib/prisma.js"

/* ==========================================================================
   NOTIFICATIONS REPOSITORY
   --------------------------------------------------------------------------
   Encapsula queries de Prisma para la tabla notifications.
   La lógica de emisión de Socket.IO permanece en el servicio (no aquí),
   porque los repositorios solo gestionan persistencia.
   ========================================================================== */

export interface INotificationsRepository {
  create(data: {
    user_id: number
    sender_id: number
    type: notifications_type
  }): Promise<notifications>
  findByUserId(userId: number, limit?: number): Promise<notifications[]>
  findById(id: number): Promise<notifications | null>
  markAsRead(id: number, userId: number): Promise<notifications | null>
  markAllAsRead(userId: number): Promise<number>
}

export class NotificationsRepository implements INotificationsRepository {
  async create(data: {
    user_id: number
    sender_id: number
    type: notifications_type
  }) {
    return prisma.notifications.create({
      data,
      include: {
        sender: {
          select: { id: true, username: true, avatar_url: true },
        },
      },
    })
  }

  async findByUserId(userId: number, limit = 50) {
    return prisma.notifications.findMany({
      where: { user_id: userId },
      include: {
        sender: {
          select: { id: true, username: true, avatar_url: true },
        },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    })
  }

  async findById(id: number) {
    return prisma.notifications.findUnique({ where: { id } })
  }

  async markAsRead(id: number, userId: number) {
    // Solo marca como leída si pertenece al usuario (seguridad)
    return prisma.notifications.update({
      where: { id, user_id: userId },
      data: { read: true },
    })
  }

  async markAllAsRead(userId: number) {
    const result = await prisma.notifications.updateMany({
      where: { user_id: userId, read: false },
      data: { read: true },
    })
    return result.count
  }
}

export const notificationsRepository = new NotificationsRepository()
