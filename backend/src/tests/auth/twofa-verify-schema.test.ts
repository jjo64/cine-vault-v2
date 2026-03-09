import { describe, it, expect } from "vitest"
import { twoFAVerifySchema } from "../../schemas/auth.js"

describe("2FA verify schema", () => {
  it("acepta payload válido", () => {
    const res = twoFAVerifySchema.safeParse({
      codigo: "123456",
      tokenTemporal: "t",
    })
    expect(res.success).toBe(true)
  })

  it("rechaza sin codigo", () => {
    const res = twoFAVerifySchema.safeParse({ tokenTemporal: "t" })
    expect(res.success).toBe(false)
  })

  it("rechaza sin tokenTemporal", () => {
    const res = twoFAVerifySchema.safeParse({ codigo: "123456" })
    expect(res.success).toBe(false)
  })
})
