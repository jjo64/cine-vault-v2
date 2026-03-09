import { Request, Response } from "express"
import {
  createCheckoutSessionService,
  createPortalSessionService,
  processWebhookEventService,
} from "../services/payments.services.js"

/* ==========================================================================
   CONTROLADOR DE PAGOS
   --------------------------------------------------------------------------
   Responsabilidad ÚNICA: extraer datos del request, llamar al servicio y
   devolver res. Sin Stripe, Prisma ni lógica inline.
   ========================================================================== */

export const createCheckoutSession = async (req: Request, res: Response) => {
  const userId = req.user!.user_id
  const { plan } = req.body
  const url = await createCheckoutSessionService(Number(userId), plan)
  res.json({ url })
}

export const createPortalSession = async (req: Request, res: Response) => {
  const userId = req.user!.user_id
  const url = await createPortalSessionService(Number(userId))
  res.json({ url })
}

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string
  await processWebhookEventService(req.body as unknown as Buffer, sig)
  res.json({ received: true })
}
