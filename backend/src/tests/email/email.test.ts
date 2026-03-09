import { describe, it, expect, vi, beforeEach } from "vitest"

const sendMock = vi.fn()
const instances = vi.hoisted(
  () => [] as Array<{ apiKey?: string; send: typeof sendMock }>
)

vi.mock("resend", () => {
  return {
    Resend: class ResendMock {
      emails = { send: sendMock }
      constructor(apiKey?: string) {
        instances.push({ apiKey, send: sendMock })
      }
    },
    __resendInstances: instances,
  }
})

const loadEmail = async () => import("../../lib/email.js")

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  sendMock.mockReset()
  instances.length = 0
})

describe("email helpers", () => {
  it("usa stub cuando falta RESEND_API_KEY", async () => {
    vi.stubEnv("NODE_ENV", "test")
    const email = await loadEmail()
    const result = await email.enviarCorreoVerificacion("a@b.com", "tok")
    expect(result).toEqual({ id: "mocked-email", mocked: true })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("envía via Resend cuando hay API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "key")
    vi.stubEnv("BACKEND_URL", "https://api.test")
    const email = await loadEmail()
    await email.enviarCorreoResetPassword("a@b.com", "tok")
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@b.com",
        subject: "Restablecer contraseña",
      })
    )
    expect(instances[0]?.apiKey).toBe("key")
  })

  it("envía códigos de respaldo", async () => {
    vi.stubEnv("RESEND_API_KEY", "key")
    const email = await loadEmail()
    await email.enviarCorreoBackupCodes("a@b.com", ["ABC", "DEF"])
    const html = sendMock.mock.calls[0][0].html as string
    expect(html).toContain("ABC")
    expect(html).toContain("DEF")
  })

  it("formatea el recibo de Stripe", async () => {
    vi.stubEnv("RESEND_API_KEY", "key")
    const email = await loadEmail()
    await email.enviarCorreoReciboStripe("a@b.com", {
      amount: 999,
      currency: "usd",
      invoiceUrl: "https://stripe.example/invoice",
    })
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Recibo de pago",
        to: "a@b.com",
      })
    )
    const html = sendMock.mock.calls[0][0].html as string
    expect(html).toContain("9.99 USD")
  })
})
