import { Response } from "express"
import type { SolicitudAutenticada } from "../middlewares/auth.middlewares.js"
import * as settingsService from "../services/settings.services.js"

/* ==========================================================================
   CONTROLADOR DE CONFIGURACIÓN
   --------------------------------------------------------------------------
   Responsabilidad ÚNICA: extraer datos del request, llamar al servicio y
   devolver res. Sin Prisma, bcrypt, Cloudinary ni interfaces inline.
   ========================================================================== */

export const actualizarPerfil = async (
  req: SolicitudAutenticada,
  res: Response
) => {
  await settingsService.actualizarPerfilService(req.user!.user_id, req.body)
  res.json({ message: "Perfil actualizado correctamente" })
}

export const actualizarAuth = async (
  req: SolicitudAutenticada,
  res: Response
) => {
  await settingsService.actualizarAuthService(req.user!.user_id, req.body)
  res.json({ message: "Contraseña actualizada correctamente" })
}

export const actualizarAvatar = async (
  req: SolicitudAutenticada,
  res: Response
) => {
  const avatarUrl = await settingsService.actualizarAvatarService(
    req.user!.user_id,
    req.body
  )
  res.json({
    message: "Avatar actualizado correctamente",
    avatar_url: avatarUrl,
  })
}

export const eliminarCuenta = async (
  req: SolicitudAutenticada,
  res: Response
) => {
  await settingsService.eliminarCuentaService(req.user!.user_id)
  res.json({ message: "Cuenta eliminada correctamente" })
}
