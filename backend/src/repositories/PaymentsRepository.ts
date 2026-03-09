import { prisma } from "../lib/prisma.js"
import { users_membership, subscriptions_plan } from "@prisma/client"

/* ==========================================================================
   PAYMENTS REPOSITORY
   --------------------------------------------------------------------------
   Responsabilidad ÚNICA: todas las operaciones de Prisma relacionadas con
   pagos: users, subscriptions y payments.
   ========================================================================== */

export interface ICheckoutCompletedData {
  userId: number
  plan: "vip" | "pro"
  startDate: Date
  endDate: Date
  stripeSubscriptionId: string
  amountTotal: number
  currency: string
  providerPaymentId: string
}

interface PaymentRecord {
  userId: number
  subscriptionId: number
  amount: number
  currency: string
  providerPaymentId: string
  status: "paid" | "failed"
}

class PaymentsRepository {
  async findUserById(userId: number) {
    return prisma.users.findUnique({ where: { id: userId } })
  }

  async findSubscriptionByProviderId(stripeSubId: string) {
    return prisma.subscriptions.findFirst({
      where: { provider_subscription_id: stripeSubId },
    })
  }

  async findSubscriptionByUser(userId: number) {
    return prisma.subscriptions.findFirst({
      where: { user_id: userId },
      orderBy: { id: "desc" },
    })
  }

  /** Crea suscripción + pago y actualiza membresía del usuario (en una transacción) */
  async checkoutCompleted(data: ICheckoutCompletedData) {
    return prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: data.userId },
        data: { membership: data.plan as users_membership },
      })

      const suscripcion = await tx.subscriptions.create({
        data: {
          user_id: data.userId,
          plan: data.plan as subscriptions_plan,
          start_date: data.startDate,
          end_date: data.endDate,
          status: "active",
          provider: "stripe",
          provider_subscription_id: data.stripeSubscriptionId,
        },
      })

      await tx.payments.create({
        data: {
          user_id: data.userId,
          subscription_id: suscripcion.id,
          amount: data.amountTotal,
          currency: data.currency,
          provider: "stripe",
          payment_status: "paid",
          provider_payment_id: data.providerPaymentId,
        },
      })

      return suscripcion
    })
  }

  /** Renueva la fecha de fin de una suscripción activa (invoice mensual) */
  async renewSubscription(stripeSubId: string, newEndDate: Date) {
    return prisma.subscriptions.updateMany({
      where: { provider_subscription_id: stripeSubId },
      data: { end_date: newEndDate, status: "active" },
    })
  }

  async updateSubscriptionStatus(
    stripeSubId: string,
    status: "active" | "cancelled" | "expired",
    newEndDate?: Date
  ) {
    return prisma.subscriptions.updateMany({
      where: { provider_subscription_id: stripeSubId },
      data: {
        status,
        ...(newEndDate && { end_date: newEndDate }),
      },
    })
  }

  async recordPayment(data: PaymentRecord) {
    const existing = await prisma.payments.findFirst({
      where: { provider_payment_id: data.providerPaymentId },
    })
    if (existing) {
      return prisma.payments.update({
        where: { id: existing.id },
        data: { payment_status: data.status === "paid" ? "paid" : "failed" },
      })
    }

    return prisma.payments.create({
      data: {
        user_id: data.userId,
        subscription_id: data.subscriptionId,
        amount: data.amount,
        currency: data.currency,
        provider: "stripe",
        payment_status: data.status === "paid" ? "paid" : "failed",
        provider_payment_id: data.providerPaymentId,
      },
    })
  }

  /** Cancela una suscripción y baja la membresía del usuario a free */
  async cancelSubscription(stripeSubId: string) {
    const sub = await prisma.subscriptions.findFirst({
      where: { provider_subscription_id: stripeSubId },
    })
    if (!sub) return

    await prisma.$transaction([
      prisma.subscriptions.update({
        where: { id: sub.id },
        data: { status: "cancelled" },
      }),
      prisma.users.update({
        where: { id: sub.user_id },
        data: { membership: "free" as users_membership },
      }),
    ])
  }
}

export const paymentsRepository = new PaymentsRepository()
