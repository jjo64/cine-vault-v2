import { Router } from "express"
import { middlewareAutenticacion } from "../middlewares/auth.middlewares.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"
import {
  getNotifications,
  marcarComoLeida,
  marcarTodasComoLeidas,
  getUnreadCount,
  getPending,
} from "../controllers/NotificationsController.js"

/**
 * @swagger
 * tags:
 *   name: Notificaciones
 *   description: Gestión de notificaciones en tiempo real
 */

const router = Router()

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Obtener mis notificaciones
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de notificaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notificacion'
 *             example:
 *               - id: 1
 *                 user_id: 1
 *                 sender_id: 2
 *                 type: "like"
 *                 read: false
 *                 created_at: "2026-03-04T10:00:00.000Z"
 *                 sender:
 *                   id: 2
 *                   username: "maria"
 *                   avatar_url: "https://res.cloudinary.com/cinevault/avatars/user_2.webp"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", middlewareAutenticacion, manejadorAsincrono(getNotifications))

/**
 * @swagger
 * /notifications/unread:
 *   get:
 *     summary: Obtener número de notificaciones no leídas
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contador de no leídas
 *         content:
 *           application/json:
 *             example:
 *               count: 3
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  "/unread",
  middlewareAutenticacion,
  manejadorAsincrono(getUnreadCount)
)

router.get("/pending", middlewareAutenticacion, manejadorAsincrono(getPending))

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Marcar todas las notificaciones como leídas
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas marcadas como leídas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeResponse'
 *             example:
 *               message: "Todas las notificaciones marcadas como leídas"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/read-all",
  middlewareAutenticacion,
  manejadorAsincrono(marcarTodasComoLeidas)
)

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Marcar una notificación como leída
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Notificación marcada como leída
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeResponse'
 *             example:
 *               message: "Notificación marcada como leída"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/read",
  middlewareAutenticacion,
  manejadorAsincrono(marcarComoLeida)
)

export default router
