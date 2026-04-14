import jwt from "jsonwebtoken"
import * as OTPAuth from "otpauth"
import QRCode from "qrcode"
import crypto from "crypto"
import {
  crearTokenAcceso,
  crearTokenRefresco,
  hashearToken,
  verificarTokenRefresco,
} from "../lib/tokens.js"
import {
  hashearContrasena,
  compararContrasena,
  encriptarSecreto,
  desencriptarSecreto,
  crearTOTP,
} from "../lib/crypto.js"
import {
  enviarCorreoVerificacion,
  enviarCorreoResetPassword,
} from "../lib/email.js"
import { validarUsuario } from "../schemas/user.js"
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  GoneError,
} from "../errors/AppErrors.js"
import { PayloadRefresco } from "../middlewares/auth.middlewares.js"
import { userRepository } from "../repositories/UserRepository.js"
import { authTokenRepository } from "../repositories/AuthTokenRepository.js"
import { sessionRepository } from "../repositories/SessionRepository.js"
import { LoginResult } from "../types/auth.js"
import { redis } from "../lib/redis.js"

const TRUSTED_DEVICE_TTL_SECONDS = 30 * 24 * 60 * 60
const RECOVERY_CODES_TTL_SECONDS = 180 * 24 * 60 * 60
const RECOVERY_CODES_COUNT = 8

const trustedDeviceFingerprint = (userAgent: string) =>
  crypto.createHash("sha256").update(userAgent || "unknown").digest("hex")

const trustedDeviceKey = (
  userId: number,
  fingerprint: string,
  tokenHash: string
) => `auth:trusted-device:${userId}:${fingerprint}:${tokenHash}`

const recoveryCodesKey = (userId: number) => `auth:2fa:recovery:${userId}`

const normalizeRecoveryCode = (code: string) =>
  code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()

const generateRecoveryCode = () => {
  const bytes = crypto.randomBytes(4).toString("hex").toUpperCase()
  return `${bytes.slice(0, 4)}-${bytes.slice(4, 8)}`
}

const saveRecoveryCodes = async (userId: number, plainCodes: string[]) => {
  const hashedCodes = plainCodes.map((code) =>
    hashearToken(normalizeRecoveryCode(code))
  )

  await redis.set(
    recoveryCodesKey(userId),
    JSON.stringify(hashedCodes),
    "EX",
    RECOVERY_CODES_TTL_SECONDS
  )
}

const createAndStoreRecoveryCodes = async (userId: number) => {
  const codes = Array.from({ length: RECOVERY_CODES_COUNT }, () =>
    generateRecoveryCode()
  )
  await saveRecoveryCodes(userId, codes)
  return codes
}

const getRecoveryCodeHashes = async (userId: number): Promise<string[]> => {
  const raw = await redis.get(recoveryCodesKey(userId))
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const getRecoveryCodesRemaining = async (userId: number) => {
  const hashes = await getRecoveryCodeHashes(userId)
  return hashes.length
}

const consumeRecoveryCodeIfValid = async (userId: number, code: string) => {
  const normalized = normalizeRecoveryCode(code)
  if (!normalized) return { consumed: false, remaining: 0 }

  const codeHash = hashearToken(normalized)
  const hashes = await getRecoveryCodeHashes(userId)
  const matchIndex = hashes.findIndex((hash) => hash === codeHash)

  if (matchIndex === -1) {
    return { consumed: false, remaining: hashes.length }
  }

  hashes.splice(matchIndex, 1)

  if (hashes.length === 0) {
    await redis.del(recoveryCodesKey(userId))
  } else {
    await redis.set(
      recoveryCodesKey(userId),
      JSON.stringify(hashes),
      "EX",
      RECOVERY_CODES_TTL_SECONDS
    )
  }

  return { consumed: true, remaining: hashes.length }
}

const isTrustedDevice = async (
  userId: number,
  trustedDeviceToken: string | undefined,
  userAgent: string
) => {
  if (!trustedDeviceToken) return false

  const fingerprint = trustedDeviceFingerprint(userAgent)
  const tokenHash = hashearToken(trustedDeviceToken)
  const key = trustedDeviceKey(userId, fingerprint, tokenHash)
  const raw = await redis.get(key)
  return Boolean(raw)
}

const registerTrustedDevice = async (userId: number, userAgent: string) => {
  const token = crypto.randomBytes(32).toString("hex")
  const fingerprint = trustedDeviceFingerprint(userAgent)
  const tokenHash = hashearToken(token)
  const key = trustedDeviceKey(userId, fingerprint, tokenHash)

  await redis.set(
    key,
    JSON.stringify({ createdAt: new Date().toISOString() }),
    "EX",
    TRUSTED_DEVICE_TTL_SECONDS
  )

  return token
}

const clearTrustedDevices = async (userId: number) => {
  const keys = await redis.keys(`auth:trusted-device:${userId}:*`)
  if (keys.length) {
    await redis.del(...keys)
  }
}

/* ==========================================================================
   AUTH SERVICE
   --------------------------------------------------------------------------
   Contiene TODA la lógica de negocio de autenticación.
   Los controladores solo llaman a estas funciones y devuelven el resultado.
   Si algo falla, se lanza un error personalizado que el manejadorErrores
   global captura automáticamente.
   ========================================================================== */

// ---------------------------------------------------------------------------
// INICIAR SESIÓN
// ---------------------------------------------------------------------------
export const iniciarSesionService = async (
  username: string,
  password: string,
  context?: {
    trustedDeviceToken?: string
    userAgent?: string
    ipAddress?: string
  }
): Promise<LoginResult> => {
  if (!username || !password) {
    throw new UnauthorizedError("Credenciales incorrectas")
  }

  const usuario = await userRepository.findByUsername(username)
  if (!usuario) throw new UnauthorizedError("Credenciales incorrectas")

  if (usuario.google_id) {
    throw new UnauthorizedError("Esta cuenta usa Google para iniciar sesión")
  }

  if (!usuario.is_verified) {
    throw new ForbiddenError("Debes verificar tu email antes de iniciar sesión")
  }

  const contrasenaValida = await compararContrasena(password, usuario.password)
  if (!contrasenaValida) throw new UnauthorizedError("Credenciales incorrectas")

  // Flujo 2FA: devolver token temporal en vez de tokens reales
  if (usuario.two_factor_enabled) {
    const trusted = await isTrustedDevice(
      usuario.id,
      context?.trustedDeviceToken,
      context?.userAgent || ""
    )

    if (trusted) {
      const tokenAcceso = crearTokenAcceso(
        usuario.id,
        usuario.role as string,
        usuario.is_verified
      )
      const { token: tokenRefresco } = await crearTokenRefresco(
  usuario.id,
  context?.userAgent,
  context?.ipAddress

)
      return { type: "OK", tokenAcceso, tokenRefresco }
    }

    const tokenTemporal = jwt.sign(
      { user_id: usuario.id, two_factor_pending: true },
      process.env.JWT_SECRET!,
      { expiresIn: "5m" }
    )
    return { type: "2FA_REQUIRED", tokenTemporal }
  }

  const tokenAcceso = crearTokenAcceso(
    usuario.id,
    usuario.role as string,
    usuario.is_verified
  )
const { token: tokenRefresco } = await crearTokenRefresco(
  usuario.id,
  context?.userAgent,
  context?.ipAddress

)
  return { type: "OK", tokenAcceso, tokenRefresco }
}

// ---------------------------------------------------------------------------
// REGISTRAR USUARIO
// ---------------------------------------------------------------------------
export const registrarService = async (body: unknown) => {
  const validacion = validarUsuario(body)
  if (!validacion.success || !validacion.data) {
    throw new ValidationError(
      (validacion.errorMessages ?? ["Datos inválidos"]).join(", ")
    )
  }

  const { email, username, password } = validacion.data

  const emitirVerificacion = async (userId: number, userEmail: string) => {
    await authTokenRepository.deleteMany({
      user_id: userId,
      type: "VERIFY_EMAIL",
    })

    const tokenVerificacion = jwt.sign(
      { user_id: userId },
      process.env.VERIFY_EMAIL_SECRET!,
      { expiresIn: "1h" }
    )

    await authTokenRepository.create({
      id: crypto.randomUUID(),
      users: { connect: { id: userId } },
      token: tokenVerificacion,
      type: "VERIFY_EMAIL",
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    })

    await enviarCorreoVerificacion(userEmail, tokenVerificacion)
  }

  const usuarioExistente = await userRepository.findByEmail(email)
  if (usuarioExistente) {
    if (usuarioExistente.is_verified) {
      throw new ConflictError("Ese email ya está registrado. Inicia sesión.")
    }

    await emitirVerificacion(usuarioExistente.id, usuarioExistente.email)
    return { userId: usuarioExistente.id, verificationResent: true }
  }

  const usernameExistente = await userRepository.findByUsername(username)
  if (usernameExistente) {
    throw new ConflictError("Ese nombre de usuario ya está en uso")
  }

  const contrasenaHasheada = await hashearContrasena(password)
  const nuevoUsuario = await userRepository.create({
    email,
    username,
    password: contrasenaHasheada,
  })

  await emitirVerificacion(nuevoUsuario.id, nuevoUsuario.email)

  return { userId: nuevoUsuario.id }
}

// ---------------------------------------------------------------------------
// VERIFICAR EMAIL
// ---------------------------------------------------------------------------
export const verificarEmailService = async (token: string) => {
  type PayloadVerificacion = { user_id: number }

  const payload = jwt.verify(
    token,
    process.env.VERIFY_EMAIL_SECRET!
  ) as PayloadVerificacion

  const tokenEnDb = await authTokenRepository.findFirst({
    token,
    user_id: payload.user_id,
    type: "VERIFY_EMAIL",
  })

  if (!tokenEnDb || tokenEnDb.expires_at < new Date()) {
    throw new GoneError("El enlace ha expirado. Solicita uno nuevo.")
  }

  const usuario = await userRepository.findById(payload.user_id)
  if (!usuario) throw new NotFoundError("Usuario no encontrado")

  await userRepository.update(usuario.id, { is_verified: true })

  await authTokenRepository.deleteMany({
    user_id: usuario.id,
    type: "VERIFY_EMAIL",
  })
}

// ---------------------------------------------------------------------------
// REENVIAR VERIFICACIÓN
// ---------------------------------------------------------------------------
export const reenviarVerificacionService = async (email: string) => {
  if (!email) throw new ValidationError("Email requerido")

  const usuario = await userRepository.findByEmail(email)

  // Respuesta genérica para no revelar si el email existe
  if (!usuario || usuario.is_verified) return

  await authTokenRepository.deleteMany({
    user_id: usuario.id,
    type: "VERIFY_EMAIL",
  })

  const tokenVerificacion = jwt.sign(
    { user_id: usuario.id },
    process.env.VERIFY_EMAIL_SECRET!,
    { expiresIn: "1h" }
  )

  await authTokenRepository.create({
    id: crypto.randomUUID(),
    users: { connect: { id: usuario.id } },
    token: tokenVerificacion,
    type: "VERIFY_EMAIL",
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  })

  await enviarCorreoVerificacion(usuario.email, tokenVerificacion)
}

// ---------------------------------------------------------------------------
// RENOVAR TOKEN
// ---------------------------------------------------------------------------
export const renovarTokenService = async (refreshToken: string) => {
  const payload = await verificarTokenRefresco(refreshToken)

  const usuario = await userRepository.findById(payload.user_id)
  if (!usuario) throw new NotFoundError("Usuario no encontrado")

  // Rotation: invalidar refresh anterior y emitir uno nuevo
  await sessionRepository.deleteById(payload.id_session)

  const accessToken = crearTokenAcceso(
    usuario.id,
    usuario.role as string,
    usuario.is_verified
  )

  const { token: nuevoRefresh, idSesion } = await crearTokenRefresco(usuario.id)

  return { accessToken, refreshToken: nuevoRefresh, sessionId: idSesion }
}

// ---------------------------------------------------------------------------
// CERRAR SESIÓN
// ---------------------------------------------------------------------------
export const cerrarSesionService = async (refreshToken: string | undefined) => {
  if (!refreshToken) return

  try {
    const payload = jwt.verify(
      refreshToken,
      process.env.REFRESH_SECRET!
    ) as PayloadRefresco

    await sessionRepository.deleteById(payload.id_session)
  } catch {
    // Token inválido: igual limpiamos la cookie desde el controller
  }
}

// ---------------------------------------------------------------------------
// VERIFICAR TOKEN (persistir login en el frontend)
// ---------------------------------------------------------------------------
export const verificarTokenService = async (userId: number) => {
  const usuario = await userRepository.getSafeProfile(userId)

  if (!usuario) throw new NotFoundError("Usuario no encontrado")
  return usuario
}

// ---------------------------------------------------------------------------
// GOOGLE CALLBACK
// ---------------------------------------------------------------------------
export const googleCallbackService = async (usuarioPassport: {
  id: number
  role: string
  is_verified: boolean
}) => {
  const tokenAcceso = crearTokenAcceso(
    usuarioPassport.id,
    usuarioPassport.role,
    usuarioPassport.is_verified
  )
  const { token: tokenRefresco } = await crearTokenRefresco(usuarioPassport.id)
  return { tokenAcceso, tokenRefresco }
}

// ---------------------------------------------------------------------------
// ACTIVAR 2FA (generar QR)
// ---------------------------------------------------------------------------
export const activar2FAService = async (userId: number) => {
  const totp = new OTPAuth.TOTP({
    issuer: "CineVault",
    label: userId.toString(),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret(),
  })

  const secreto = totp.secret.base32
  const uri = totp.toString()

  await userRepository.update(userId, {
    two_factor_secret: encriptarSecreto(secreto),
  })

  const qr = await QRCode.toDataURL(uri)
  return { qr, secreto }
}

// ---------------------------------------------------------------------------
// CONFIRMAR 2FA (activar definitivamente)
// ---------------------------------------------------------------------------
export const confirmar2FAService = async (userId: number, codigo: string) => {
  if (!codigo) throw new ValidationError("Código requerido")

  const usuario = await userRepository.findById(userId)
  if (!usuario?.two_factor_secret) {
    throw new ValidationError("Primero debes generar el QR")
  }

  let secretoReal: string
  try {
    secretoReal = desencriptarSecreto(usuario.two_factor_secret)
  } catch {
    throw new ValidationError(
      "No se pudo leer tu configuracion 2FA. Reactivala desde ajustes."
    )
  }
  const totp = crearTOTP(secretoReal)
  const delta = totp.validate({ token: codigo, window: 1 })

  if (delta === null) throw new UnauthorizedError("Código incorrecto")

  await userRepository.update(userId, { two_factor_enabled: true })

  const recoveryCodes = await createAndStoreRecoveryCodes(userId)
  return { recoveryCodes }
}

// ---------------------------------------------------------------------------
// VERIFICAR 2FA (login paso 2)
// ---------------------------------------------------------------------------
export const verificar2FAService = async (
  codigo: string,
  tokenTemporal: string,
  rememberDevice?: boolean,
  userAgent?: string
) => {
  if (!codigo || !tokenTemporal) throw new ValidationError("Datos requeridos")

  const payload = jwt.verify(tokenTemporal, process.env.JWT_SECRET!) as {
    user_id: number
    two_factor_pending: boolean
  }

  if (!payload.two_factor_pending) throw new UnauthorizedError("Token inválido")

  const usuario = await userRepository.findById(payload.user_id)
  if (!usuario?.two_factor_secret) {
    throw new ValidationError("No se ha configurado 2FA")
  }

  let secretoReal: string
  try {
    secretoReal = desencriptarSecreto(usuario.two_factor_secret)
  } catch {
    throw new ValidationError(
      "No se pudo leer tu configuracion 2FA. Reactivala desde ajustes."
    )
  }
  const totp = crearTOTP(secretoReal)
  const delta = totp.validate({ token: codigo, window: 1 })
  let usedRecoveryCode = false
  let remainingRecoveryCodes: number | null = null

  if (delta === null) {
    const recoveryResult = await consumeRecoveryCodeIfValid(usuario.id, codigo)
    if (!recoveryResult.consumed) {
      throw new UnauthorizedError("Código incorrecto")
    }
    usedRecoveryCode = true
    remainingRecoveryCodes = recoveryResult.remaining
  }

  const tokenAcceso = crearTokenAcceso(
    usuario.id,
    usuario.role as string,
    usuario.is_verified
  )
  const { token: tokenRefresco } = await crearTokenRefresco(usuario.id)

  let trustedDeviceToken: string | undefined
  if (rememberDevice) {
    trustedDeviceToken = await registerTrustedDevice(usuario.id, userAgent || "")
  }

  return {
    tokenAcceso,
    tokenRefresco,
    trustedDeviceToken,
    usedRecoveryCode,
    remainingRecoveryCodes,
  }
}

// ---------------------------------------------------------------------------
// OLVIDAR CONTRASEÑA
// ---------------------------------------------------------------------------
export const olvidarContrasenaService = async (email: string) => {
  if (!email) throw new ValidationError("Email requerido")

  const usuario = await userRepository.findByEmail(email)

  // Respuesta genérica para no revelar si el email existe
  if (!usuario || usuario.google_id) return

  await authTokenRepository.deleteMany({
    user_id: usuario.id,
    type: "RESET_PASSWORD",
  })

  const token = jwt.sign(
    { user_id: usuario.id },
    process.env.VERIFY_EMAIL_SECRET!,
    { expiresIn: "15m" }
  )

  await authTokenRepository.create({
    id: crypto.randomUUID(),
    users: { connect: { id: usuario.id } },
    token,
    type: "RESET_PASSWORD",
    expires_at: new Date(Date.now() + 15 * 60 * 1000),
  })

  await enviarCorreoResetPassword(usuario.email, token)
}

// ---------------------------------------------------------------------------
// RESETEAR CONTRASEÑA
// ---------------------------------------------------------------------------
export const resetearContrasenaService = async (
  token: string,
  password: string
) => {
  if (!token || !password) throw new ValidationError("Datos requeridos")

  type PayloadReset = { user_id: number }
  const payload = jwt.verify(
    token,
    process.env.VERIFY_EMAIL_SECRET!
  ) as PayloadReset

  const tokenEnDb = await authTokenRepository.findFirst({
    token,
    user_id: payload.user_id,
    type: "RESET_PASSWORD",
  })

  if (!tokenEnDb || tokenEnDb.expires_at < new Date()) {
    throw new GoneError("El enlace ha expirado. Solicita uno nuevo.")
  }

  const contrasenaHasheada = await hashearContrasena(password)

  await userRepository.update(payload.user_id, { password: contrasenaHasheada })

  await authTokenRepository.deleteMany({
    user_id: payload.user_id,
    type: "RESET_PASSWORD",
  })
  await sessionRepository.deleteManyByUser(payload.user_id)
}

// ---------------------------------------------------------------------------
// DESACTIVAR 2FA
// ---------------------------------------------------------------------------
export const desactivar2FAService = async (userId: number, codigo: string) => {
  if (!codigo) throw new ValidationError("Código requerido")

  const usuario = await userRepository.findById(userId)

  if (!usuario?.two_factor_enabled) {
    throw new ValidationError("No tenés 2FA activado")
  }

  let secretoReal: string
  try {
    secretoReal = desencriptarSecreto(usuario.two_factor_secret!)
  } catch {
    throw new ValidationError(
      "No se pudo leer tu configuracion 2FA. Reactivala desde ajustes."
    )
  }
  const totp = crearTOTP(secretoReal)
  const delta = totp.validate({ token: codigo, window: 1 })

  if (delta === null) throw new UnauthorizedError("Código incorrecto")

  await userRepository.update(userId, {
    two_factor_enabled: false,
    two_factor_secret: null,
  })

  await redis.del(recoveryCodesKey(userId))
  await clearTrustedDevices(userId)
}

// ---------------------------------------------------------------------------
// RECOVERY CODES 2FA
// ---------------------------------------------------------------------------
export const recoveryCodesStatusService = async (userId: number) => {
  const remaining = await getRecoveryCodesRemaining(userId)
  return { remaining }
}

export const regenerarRecoveryCodesService = async (
  userId: number,
  codigo: string
) => {
  if (!codigo) throw new ValidationError("Código requerido")

  const usuario = await userRepository.findById(userId)
  if (!usuario?.two_factor_enabled || !usuario.two_factor_secret) {
    throw new ValidationError("2FA no está activado")
  }

  let secretoReal: string
  try {
    secretoReal = desencriptarSecreto(usuario.two_factor_secret)
  } catch {
    throw new ValidationError(
      "No se pudo leer tu configuracion 2FA. Reactivala desde ajustes."
    )
  }

  const totp = crearTOTP(secretoReal)
  const delta = totp.validate({ token: codigo, window: 1 })
  if (delta === null) throw new UnauthorizedError("Código incorrecto")

  const recoveryCodes = await createAndStoreRecoveryCodes(userId)
  return { recoveryCodes }
}

// ---------------------------------------------------------------------------
// CAMBIAR CONTRASEÑA
// ---------------------------------------------------------------------------
export const cambiarContrasenaService = async (
  userId: number,
  contrasenaActual: string,
  contrasenaNueva: string,
  refreshToken: string | undefined
) => {
  if (!contrasenaActual || !contrasenaNueva) {
    throw new ValidationError("Datos requeridos")
  }

  const usuario = await userRepository.findById(userId)
  if (!usuario) throw new NotFoundError("Usuario no encontrado")

  if (usuario.google_id) {
    throw new ValidationError("Las cuentas de Google no tienen contraseña")
  }

  const contrasenaValida = await compararContrasena(
    contrasenaActual,
    usuario.password
  )
  if (!contrasenaValida)
    throw new UnauthorizedError("La contraseña actual es incorrecta")

  const mismaContrasena = await compararContrasena(
    contrasenaNueva,
    usuario.password
  )
  if (mismaContrasena) {
    throw new ValidationError(
      "La nueva contraseña debe ser diferente a la actual"
    )
  }

  const contrasenaHasheada = await hashearContrasena(contrasenaNueva)

  await userRepository.update(userId, { password: contrasenaHasheada })

  // Cerrar todas las sesiones menos la actual
  if (refreshToken) {
    const payload = jwt.verify(
      refreshToken,
      process.env.REFRESH_SECRET!
    ) as PayloadRefresco
    await sessionRepository.deleteManyByUserExcept(userId, payload.id_session)
  }
}

// ---------------------------------------------------------------------------
// REVOCAR TODAS LAS SESIONES
// ---------------------------------------------------------------------------
export const revocarSesionesService = async (userId: number) => {
  await sessionRepository.deleteManyByUser(userId)
}

// ---------------------------------------------------------------------------
// LISTAR SESIONES DEL USUARIO
// ---------------------------------------------------------------------------
export const listarSesionesService = async (userId: number) => {
  return sessionRepository.findByUser(userId)
}

// ---------------------------------------------------------------------------
// REVOCAR UNA SESIÓN ESPECÍFICA
// ---------------------------------------------------------------------------
export const revocarSesionService = async (
  userId: number,
  sessionId: string
) => {
  if (!sessionId) throw new ValidationError("ID de sesión requerido")

  const sesion = await sessionRepository.findById(sessionId)

  if (!sesion || sesion.user_id !== userId) {
    throw new NotFoundError("Sesión no encontrada")
  }

  await sessionRepository.deleteById(sessionId)
}
