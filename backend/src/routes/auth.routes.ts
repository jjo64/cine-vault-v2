import { Router } from "express"
import { middlewareAutenticacion } from "../middlewares/auth.middlewares.js"
import {
  iniciarSesion,
  registrar,
  renovarToken,
  cerrarSesion,
  verificarToken,
  verificarEmail,
  verificarEmailDesdeQuery,
  reenviarVerificacion,
  controladorCallback,
  activar2FA,
  confirmar2FA,
  verificar2FA,
  olvidarContrasena,
  resetearContrasena,
  desactivar2FA,
  cambiarContrasena,
  revocarSesiones,
  listarSesiones,
  revocarSesion,
  recoveryCodesStatus,
  regenerarRecoveryCodes,
} from "../controllers/AuthController.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"
import {
  limitadorAuth,
  limitadorEmail,
} from "../middlewares/rateLimit.middleware.js"
import passport from "passport"
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  twoFAConfirmSchema,
  twoFAVerifySchema,
  revokeSessionParamsSchema,
} from "../schemas/auth.js"
import {
  validarBody,
  validarParams,
} from "../middlewares/validation.middleware.js"

const router = Router()

// ---------------------------------------------------------------------------
// RUTAS PÚBLICAS CON RATE LIMIT ESTRICTO (brute force protection)
// ---------------------------------------------------------------------------
// Login → máximo 5 intentos por IP cada 15 minutos
router.post(
  "/login",
  limitadorAuth,
  validarBody(loginSchema),
  manejadorAsincrono(iniciarSesion)
)
// Registro → mismo límite para evitar creación masiva de cuentas
router.post("/register", limitadorAuth, manejadorAsincrono(registrar))
// 2FA paso 2 → límite estricto igual que login
router.post(
  "/2fa/verificar",
  limitadorAuth,
  validarBody(twoFAVerifySchema),
  manejadorAsincrono(verificar2FA)
)

// Emails → máximo 3 por hora para evitar spam
router.post(
  "/resend-verification",
  limitadorEmail,
  validarBody(forgotPasswordSchema),
  manejadorAsincrono(reenviarVerificacion)
)
router.post(
  "/forgot-password",
  limitadorEmail,
  validarBody(forgotPasswordSchema),
  manejadorAsincrono(olvidarContrasena)
)

// ---------------------------------------------------------------------------
// RUTAS PÚBLICAS SIN LIMIT ESTRICTO
// ---------------------------------------------------------------------------
router.post("/verify-email/:token", manejadorAsincrono(verificarEmail))
router.get("/verify-email", manejadorAsincrono(verificarEmailDesdeQuery))
router.post(
  "/reset-password",
  validarBody(resetPasswordSchema),
  manejadorAsincrono(resetearContrasena)
)
router.post("/refresh", manejadorAsincrono(renovarToken))

// ---------------------------------------------------------------------------
// GOOGLE OAuth
// ---------------------------------------------------------------------------
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
)
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/api/auth/google" }),
  controladorCallback
)

// ---------------------------------------------------------------------------
// RUTAS PROTEGIDAS (requieren token)
// ---------------------------------------------------------------------------
router.post("/logout", manejadorAsincrono(cerrarSesion))
router.get(
  "/verify",
  middlewareAutenticacion,
  manejadorAsincrono(verificarToken)
)
router.post(
  "/cambiar-contrasena",
  middlewareAutenticacion,
  validarBody(changePasswordSchema),
  manejadorAsincrono(cambiarContrasena)
)
router.post(
  "/revocar-sesiones",
  middlewareAutenticacion,
  manejadorAsincrono(revocarSesiones)
)
router.get(
  "/sessions",
  middlewareAutenticacion,
  manejadorAsincrono(listarSesiones)
)
router.delete(
  "/sessions/:id",
  middlewareAutenticacion,
  validarParams(revokeSessionParamsSchema),
  manejadorAsincrono(revocarSesion)
)
router.post(
  "/2fa/activar",
  middlewareAutenticacion,
  manejadorAsincrono(activar2FA)
)
router.post(
  "/2fa/desactivar",
  middlewareAutenticacion,
  manejadorAsincrono(desactivar2FA)
)
router.post(
  "/2fa/confirmar",
  middlewareAutenticacion,
  validarBody(twoFAConfirmSchema),
  manejadorAsincrono(confirmar2FA)
)
router.get(
  "/2fa/recovery-codes/status",
  middlewareAutenticacion,
  manejadorAsincrono(recoveryCodesStatus)
)
router.post(
  "/2fa/recovery-codes/regenerar",
  middlewareAutenticacion,
  validarBody(twoFAConfirmSchema),
  manejadorAsincrono(regenerarRecoveryCodes)
)

export default router
