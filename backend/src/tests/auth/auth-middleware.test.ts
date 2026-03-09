import { describe, it, expect, vi, beforeAll } from "vitest"
import { middlewareAutenticacion } from "../../middlewares/auth.middlewares.js"
import jwt from "jsonwebtoken"
import { UnauthorizedError } from "../../errors/AppErrors.js"

describe("middlewareAutenticacion", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret"
  })

  const makeReq = (token?: string) =>
    ({
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }) as any

  it("lanza UnauthorizedError cuando falta token", () => {
    const req = makeReq()
    const res = {} as any
    const next = vi.fn()

    expect(() => middlewareAutenticacion(req, res, next)).toThrow(
      UnauthorizedError
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("propaga UnauthorizedError cuando el token es inválido", () => {
    const req = makeReq("token-invalido")
    const res = {} as any
    const next = vi.fn()

    middlewareAutenticacion(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(UnauthorizedError)
  })

  it("adjunta req.user y llama next cuando el token es válido", () => {
    const token = jwt.sign(
      { user_id: 1, role: "user", is_verified: true },
      process.env.JWT_SECRET!
    )
    const req = makeReq(token)
    const res = {} as any
    const next = vi.fn()

    middlewareAutenticacion(req, res, next)

    expect(req.user?.user_id).toBe(1)
    expect(next).toHaveBeenCalledOnce()
  })
})
