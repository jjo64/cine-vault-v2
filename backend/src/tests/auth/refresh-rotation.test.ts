import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { renovarTokenService } from "../../services/auth.services.js"
import * as tokens from "../../lib/tokens.js"
import { sessionRepository } from "../../repositories/SessionRepository.js"

vi.mock("../../repositories/SessionRepository.js", () => ({
  sessionRepository: {
    deleteById: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findByUser: vi.fn(),
  },
}))

vi.mock("../../lib/email.js", () => ({
  enviarCorreoVerificacion: vi.fn(),
  enviarCorreoResetPassword: vi.fn(),
}))

vi.mock("../../repositories/UserRepository.js", () => ({
  userRepository: {
    findById: vi
      .fn()
      .mockResolvedValue({ id: 1, role: "user", is_verified: true }),
  },
}))

vi.mock("../../lib/tokens.js", () => ({
  verificarTokenRefresco: vi.fn().mockResolvedValue({
    id_session: "old-session",
    user_id: 1,
  }),
  crearTokenAcceso: vi.fn().mockReturnValue("access-token"),
  crearTokenRefresco: vi.fn().mockResolvedValue({
    token: "new-refresh",
    idSesion: "new-session",
  }),
}))

describe("renovarTokenService", () => {
  beforeAll(() => {
    process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh-secret"
    process.env.JWT_SECRET = process.env.JWT_SECRET || "jwt-secret"
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("revoca la sesión previa y devuelve access + nuevo refresh", async () => {
    const result = await renovarTokenService("dummy-refresh")

    expect(tokens.verificarTokenRefresco).toHaveBeenCalledWith("dummy-refresh")
    expect(sessionRepository.deleteById).toHaveBeenCalledWith("old-session")
    expect(tokens.crearTokenAcceso).toHaveBeenCalledWith(1, "user", true)
    expect(tokens.crearTokenRefresco).toHaveBeenCalledWith(1)
    expect(result).toEqual({
      accessToken: "access-token",
      refreshToken: "new-refresh",
      sessionId: "new-session",
    })
  })
})
