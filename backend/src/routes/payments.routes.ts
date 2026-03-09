import { Router } from "express"
import {
  createCheckoutSession,
  createPortalSession,
  stripeWebhook,
} from "../controllers/PaymentsController.js"
import { middlewareAutenticacion } from "../middlewares/auth.middlewares.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"

/**
 * @swagger
 * tags:
 *   name: Pagos
 *   description: Gestión de suscripciones y pagos con Stripe
 */

const router = Router()

// Rutas de pagos (protegidas con autenticación)
/**
 * @swagger
 * /payments/create-checkout-session:
 *   post:
 *     summary: Crear sesión de pago en Stripe
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan]
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [vip, pro]
 *           example:
 *             plan: "pro"
 *     responses:
 *       200:
 *         description: URL de la sesión de pago de Stripe
 *         content:
 *           application/json:
 *             example:
 *               url: "https://checkout.stripe.com/pay/cs_test_a1b2c3d4e5f6..."
 *       400:
 *         description: Plan inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "Plan inválido"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Usuario no encontrado"
 */
router.post(
  "/create-checkout-session",
  middlewareAutenticacion,
  manejadorAsincrono(createCheckoutSession)
)

router.post(
  "/portal-session",
  middlewareAutenticacion,
  manejadorAsincrono(createPortalSession)
)

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Webhook de Stripe (uso interno)
 *     tags: [Pagos]
 *     description: |
 *       Endpoint llamado automáticamente por Stripe cuando ocurre un evento.
 *       Maneja los siguientes eventos:
 *       - `checkout.session.completed` → crea suscripción y pago
 *       - `invoice.payment_succeeded` → renueva end_date mensualmente
 *       - `customer.subscription.deleted` → cancela suscripción y baja a free
 *     responses:
 *       200:
 *         description: Evento procesado correctamente
 *         content:
 *           application/json:
 *             example:
 *               received: true
 *       400:
 *         description: Webhook inválido (firma no verificada)
 *         content:
 *           application/json:
 *             example:
 *               error: "Webhook inválido"
 */
router.post("/webhook", manejadorAsincrono(stripeWebhook))

export default router
