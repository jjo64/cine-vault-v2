import rateLimit from "express-rate-limit"
import { RateLimiterRedis } from "rate-limiter-flexible"
import { redis } from "../config/redis.js"

const isProduction = process.env.NODE_ENV === "production"

/* ==========================================================================
   RATE LIMITING
   --------------------------------------------------------------------------
   Dos niveles de protección:

   1. GLOBAL → aplica a toda la app (evita abuso general)
   2. ESTRICTO → solo en rutas de auth (evita brute force de contraseñas)

   Instalación requerida:
     npm install express-rate-limit rate-limiter-flexible
   ========================================================================== */

// ---------------------------------------------------------------------------
// 1. LIMITADOR GLOBAL
// Aplica a todos los endpoints. Límite generoso para no molestar usuarios normales.
// ---------------------------------------------------------------------------
export const limitadorGlobal = rateLimit({
  windowMs: 15 * 60 * 1000, // ventana de 15 minutos
  max: 200, // máximo 200 requests por IP en esa ventana
  standardHeaders: true, // devuelve info en headers RateLimit-*
  legacyHeaders: false,
  skip: (req) =>
    !isProduction || ["GET", "HEAD", "OPTIONS"].includes(req.method),
  message: {
    error: {
      code: "RATE_LIMIT",
      message: "Demasiadas peticiones. Intentá de nuevo en 15 minutos.",
    },
  },
})

// ---------------------------------------------------------------------------
// 2. LIMITADOR ESTRICTO — Rutas de autenticación
// Protege /login, /register, /2fa/verificar contra brute force.
// Usa Redis para que los contadores persistan aunque el servidor se reinicie.
// ---------------------------------------------------------------------------
const limiterRedis = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:auth", // prefijo en Redis para identificar estas keys
  points: 5, // 5 intentos permitidos
  duration: 15 * 60, // por cada 15 minutos
  blockDuration: 15 * 60, // si supera el límite, bloquear 15 minutos
})

export const limitadorAuth = async (
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
) => {
  if (!isProduction) return next()

  try {
    // La key combina IP + ruta para que /login y /2fa/verificar tengan contadores separados
    const key = `${req.ip}:${req.path}`
    await limiterRedis.consume(key)
    next()
  } catch {
    // RateLimiterRedis lanza cuando se supera el límite
    res.status(429).json({
      error: {
        code: "BRUTE_FORCE_BLOCKED",
        message:
          "Demasiados intentos fallidos. Tu IP fue bloqueada por 15 minutos.",
      },
    })
  }
}

// ---------------------------------------------------------------------------
// 3. LIMITADOR PARA EMAILS
// Evita spam de correos de verificación o reset de contraseña.
// ---------------------------------------------------------------------------
const limiterEmail = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:email",
  points: 3, // 3 emails permitidos
  duration: 60 * 60, // por hora
  blockDuration: 60 * 60,
})

export const limitadorEmail = async (
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
) => {
  if (!isProduction) return next()

  try {
    await limiterEmail.consume(req.ip!)
    next()
  } catch {
    res.status(429).json({
      error: {
        code: "EMAIL_LIMIT",
        message: "Demasiadas solicitudes de email. Intentá de nuevo en 1 hora.",
      },
    })
  }
}
