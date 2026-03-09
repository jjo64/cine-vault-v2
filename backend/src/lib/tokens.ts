import {
  PayloadAcceso,
  PayloadRefresco,
} from "../middlewares/auth.middlewares.js"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { sessionRepository } from "../repositories/SessionRepository.js"

const EXPIRACION_TOKEN_ACCESO = "15m"
const DIAS_EXPIRACION_TOKEN_REFRESCO = 7
/* ==========================================================================
   1. CONFIGURACIÓN DE COOKIES
   ========================================================================== */

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
}

export const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 15 * 60 * 1000,
}

export const TRUSTED_DEVICE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
}

/* ==========================================================================
   2. TOKENS JWT
   ========================================================================== */

/**
 * Genera un JWT de acceso de corta duración (15 minutos).
 */
export const crearTokenAcceso = (
  idUsuario: number,
  rol: string,
  isVerified: boolean
) => {
  const payload: PayloadAcceso = {
    user_id: idUsuario,
    role: rol as PayloadAcceso["role"],
    is_verified: isVerified,
  }
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: EXPIRACION_TOKEN_ACCESO,
  })
}

/**
 * Genera un Refresh Token, lo hashea y persiste la sesión en la DB.
 * Solo el hash se usa para verificaciones — el token original va en la cookie.
 */
export const crearTokenRefresco = async (idUsuario: number) => {
  const idSesion = crypto.randomUUID()
  const token = jwt.sign(
    { id_session: idSesion, user_id: idUsuario } as PayloadRefresco,
    process.env.REFRESH_SECRET!,
    { expiresIn: `${DIAS_EXPIRACION_TOKEN_REFRESCO}d` }
  )

  await sessionRepository.create({
    id: idSesion,
    refresh_token: token,
    token_hash: hashearToken(token),
    users: { connect: { id: idUsuario } },
    expires_at: new Date(
      Date.now() + DIAS_EXPIRACION_TOKEN_REFRESCO * 24 * 60 * 60 * 1000
    ),
  })

  return { token, idSesion }
}

/**
 * Verifica un Refresh Token y comprueba que la sesión exista en DB por hash.
 * Si la sesión fue revocada, lanza error aunque el JWT sea válido.
 */
export const verificarTokenRefresco = async (token: string) => {
  const payload = jwt.verify(
    token,
    process.env.REFRESH_SECRET!
  ) as PayloadRefresco

  const sesion = await sessionRepository.findByHashAndId(
    payload.id_session,
    hashearToken(token)
  )

  if (!sesion) throw new Error("Sesión inválida o revocada")

  return payload
}

/**
 * Genera un hash SHA-256 de un token.
 * Usado para guardar el refresh_token de forma segura en la DB.
 */
export const hashearToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex")
}
