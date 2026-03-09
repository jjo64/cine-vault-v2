import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import express from "express"
import cookieParser from "cookie-parser"
import { manejadorErrores } from "../middlewares/error.middlewares.js"
import { crearTokenAcceso } from "../lib/tokens.js"

// Configurar secrets y precios dummy para evitar que Stripe falle en tests
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret"
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "sk_test_dummy"
process.env.STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO ?? "price_test_pro"
process.env.STRIPE_PRICE_VIP = process.env.STRIPE_PRICE_VIP ?? "price_test_vip"

const createSession = vi.fn(async () => ({
  url: "https://stripe.test/session",
}))
const constructEvent = vi.fn()
const retrieveSub = vi.fn()
const createPortal = vi.fn(async () => ({ url: "https://stripe.test/portal" }))

vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: createSession } }
    webhooks = { constructEvent }
    subscriptions = { retrieve: retrieveSub }
    billingPortal = { sessions: { create: createPortal } }
  },
}))

const paymentsRepository = {
  findUserById: vi.fn(),
  checkoutCompleted: vi.fn(),
  findSubscriptionByProviderId: vi.fn(),
  recordPayment: vi.fn(),
  renewSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  updateSubscriptionStatus: vi.fn(),
  findSubscriptionByUser: vi.fn(),
}

vi.mock("../repositories/PaymentsRepository.js", () => ({
  paymentsRepository,
}))

const rutasPagos = (await import("../routes/payments.routes.js")).default
const { processWebhookEventService } =
  await import("../services/payments.services.js")

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use("/api/payments", rutasPagos)
app.use(manejadorErrores)

let tokenTest: string

beforeEach(() => {
  vi.clearAllMocks()
  paymentsRepository.findUserById.mockResolvedValue({
    id: 1,
    email: "payer@test.com",
  })
  tokenTest = crearTokenAcceso(1, "user", true)
})

describe("Payments", () => {
  it("POST /api/payments/create-checkout-session — crea sesión con plan válido", async () => {
    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Authorization", `Bearer ${tokenTest}`)
      .send({ plan: "pro" })

    expect(res.status).toBe(200)
    expect(res.body.url).toContain("https://stripe.test/session")
  })

  it("POST /api/payments/create-checkout-session — falla con plan inválido", async () => {
    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Authorization", `Bearer ${tokenTest}`)
      .send({ plan: "platinum" })

    expect(res.status).toBe(400)
    expect(res.body.error?.message).toBe("Plan inválido")
  })

  it("POST /api/payments/create-checkout-session — falla sin autenticación", async () => {
    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .send({ plan: "pro" })

    expect(res.status).toBe(401)
  })

  it("POST /api/payments/portal-session — crea portal con sub existente", async () => {
    paymentsRepository.findSubscriptionByUser.mockResolvedValue({
      provider_subscription_id: "sub_123",
    })
    retrieveSub.mockResolvedValue({ customer: "cus_abc" })

    const res = await request(app)
      .post("/api/payments/portal-session")
      .set("Authorization", `Bearer ${tokenTest}`)

    expect(res.status).toBe(200)
    expect(res.body.url).toContain("https://stripe.test/portal")
  })
})

describe("processWebhookEventService", () => {
  it("rechaza firma inválida", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("bad sig")
    })
    await expect(
      processWebhookEventService(Buffer.from("{}"), "sig")
    ).rejects.toThrow("Webhook inválido")
  })

  it("procesa checkout.session.completed una sola vez (idempotente)", async () => {
    constructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: "1", plan: "pro" },
          subscription: "sub_1",
          amount_total: 1000,
          currency: "eur",
          payment_intent: "pi_1",
        },
      },
    })

    await processWebhookEventService(Buffer.from("{}"), "sig")
    await processWebhookEventService(Buffer.from("{}"), "sig")

    expect(paymentsRepository.checkoutCompleted).toHaveBeenCalledTimes(1)
  })

  it("registra pago en invoice.payment_succeeded", async () => {
    paymentsRepository.findSubscriptionByProviderId.mockResolvedValue({
      id: 10,
      user_id: 1,
    })
    constructEvent.mockReturnValue({
      id: "evt_2",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          subscription: "sub_1",
          amount_paid: 500,
          currency: "usd",
          billing_reason: "subscription_cycle",
          payment_intent: "pi_2",
        },
      },
    })

    await processWebhookEventService(Buffer.from("{}"), "sig")

    expect(paymentsRepository.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: 10, userId: 1, status: "paid" })
    )
  })
})
