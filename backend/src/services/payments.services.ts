import "dotenv/config"
import Stripe from "stripe"
import { paymentsRepository } from "../repositories/PaymentsRepository.js"
import { NotFoundError, ValidationError } from "../errors/AppErrors.js"
import { redis } from "../lib/redis.js"

/* ==========================================================================
   PAYMENTS SERVICE
   --------------------------------------------------------------------------
   Toda la lógica de negocio de pagos: Stripe + operaciones de base de datos
   delegadas al PaymentsRepository.
   ========================================================================== */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

const IDS_PRECIOS = {
  vip: process.env.STRIPE_PRICE_VIP as string,
  pro: process.env.STRIPE_PRICE_PRO as string,
}

/**
 * Crea una sesión de checkout en Stripe para el plan indicado.
 * @returns URL de la sesión de Stripe Checkout
 */
export async function createCheckoutSessionService(
  userId: number,
  plan: string
): Promise<string> {
  if (!IDS_PRECIOS[plan as keyof typeof IDS_PRECIOS]) {
    throw new ValidationError("Plan inválido")
  }

  const usuario = await paymentsRepository.findUserById(userId)
  if (!usuario) throw new NotFoundError("Usuario no encontrado")

  const sesion = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [
      {
        price: IDS_PRECIOS[plan as keyof typeof IDS_PRECIOS],
        quantity: 1,
      },
    ],
    customer_email: usuario.email,
    success_url: `${process.env.FRONTEND_URL}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    metadata: {
      userId: usuario.id.toString(),
      plan,
    },
    payment_intent_data: {
      metadata: {
        userId: usuario.id.toString(),
        plan,
      },
    },
  })

  return sesion.url!
}

export async function createPortalSessionService(
  userId: number
): Promise<string> {
  const sub = await paymentsRepository.findSubscriptionByUser(userId)
  if (!sub) throw new NotFoundError("No tienes una suscripción activa")

  const stripeSubId = sub.provider_subscription_id
  if (!stripeSubId) throw new ValidationError("Suscripción sin ID de Stripe")

  const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
  const customerId = (stripeSub as any).customer as string
  if (!customerId) throw new ValidationError("Stripe no devolvió customer")

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL}/account`,
  })
  return portal.url
}

/**
 * Valida la firma del webhook y procesa el evento de Stripe.
 * Lanza ValidationError (→ 400) si la firma es inválida.
 */
export async function processWebhookEventService(
  rawBody: Buffer,
  signature: string
): Promise<void> {
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch {
    throw new ValidationError("Webhook inválido")
  }

  // Idempotencia básica por event_id (24h)
  const seen = await redis.set(
    `stripe:event:${event.id}`,
    "1",
    "EX",
    60 * 60 * 24,
    "NX"
  )
  if (seen !== "OK") return

  switch (event.type) {
    // Pago inicial completado → crear suscripción y pago
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = Number(session.metadata?.userId)
      const plan = session.metadata?.plan as "vip" | "pro"

      const hoy = new Date()
      const finSuscripcion = new Date()
      finSuscripcion.setMonth(finSuscripcion.getMonth() + 1)

      await paymentsRepository.checkoutCompleted({
        userId,
        plan,
        startDate: hoy,
        endDate: finSuscripcion,
        stripeSubscriptionId: session.subscription as string,
        amountTotal: (session.amount_total ?? 0) / 100,
        currency: session.currency ?? "eur",
        providerPaymentId: session.payment_intent as string,
      })
      break
    }

    // Renovación mensual → actualizar end_date
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice
      const stripeSubId = (invoice as any).subscription as string

      // Solo procesar renovaciones, no el pago inicial
      if (invoice.billing_reason === "subscription_create") break

      const nuevaFechaFin = new Date()
      nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1)
      const sub =
        await paymentsRepository.findSubscriptionByProviderId(stripeSubId)
      if (sub) {
        await paymentsRepository.renewSubscription(stripeSubId, nuevaFechaFin)
        await paymentsRepository.recordPayment({
          userId: sub.user_id,
          subscriptionId: sub.id,
          amount: (invoice.amount_paid ?? 0) / 100,
          currency: invoice.currency ?? "eur",
          providerPaymentId: (invoice as any).payment_intent ?? invoice.id,
          status: "paid",
        })
      }
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const stripeSubId = (invoice as any).subscription as string
      const sub =
        await paymentsRepository.findSubscriptionByProviderId(stripeSubId)
      if (sub) {
        await paymentsRepository.updateSubscriptionStatus(
          stripeSubId,
          "expired"
        )
        await paymentsRepository.recordPayment({
          userId: sub.user_id,
          subscriptionId: sub.id,
          amount: (invoice.amount_due ?? 0) / 100,
          currency: invoice.currency ?? "eur",
          providerPaymentId: (invoice as any).payment_intent ?? invoice.id,
          status: "failed",
        })
      }
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription & {
        current_period_end?: number
      }
      const endDate = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : undefined
      const status = mapStripeStatus(subscription.status)
      await paymentsRepository.updateSubscriptionStatus(
        subscription.id,
        status,
        endDate
      )
      break
    }

    // Cancelación → bajar a free
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      await paymentsRepository.cancelSubscription(subscription.id)
      break
    }

    default:
      console.log(`Evento Stripe no manejado: ${event.type}`)
  }
}

const mapStripeStatus = (
  status: Stripe.Subscription.Status
): "active" | "cancelled" | "expired" => {
  if (status === "canceled") return "cancelled"
  if (
    status === "unpaid" ||
    status === "past_due" ||
    status === "incomplete_expired"
  )
    return "expired"
  return "active"
}
