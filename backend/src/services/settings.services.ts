import cloudinary from "../config/claudinary.config.js"
import { settingsRepository } from "../repositories/SettingsRepository.js"
import { userRepository } from "../repositories/UserRepository.js"
import { hashearContrasena, compararContrasena } from "../lib/crypto.js"
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../errors/AppErrors.js"
import type {
  ActualizarPerfilDTO,
  ActualizarAuthDTO,
  ActualizarAvatarDTO,
} from "../schemas/settings.js"

/* ==========================================================================
   SETTINGS SERVICE
   --------------------------------------------------------------------------
   Lógica de negocio para configuración de cuenta: perfil, contraseña, avatar
   y eliminación de cuenta. Antes esta lógica estaba mezclada en el Controller
   con inline interfaces, bcrypt directo y queries de Prisma sin servicio.

   Decisiones:
   - hashearContrasena / compararContrasena: reutiliza las mismas funciones de
     crypto.ts que usa auth.services.ts (sin duplicar lógica de bcrypt).
   - Cloudinary se invoca aquí (capa de servicio) porque es I/O externo con
     lógica de negocio (validación de formato/tamaño).
   ========================================================================== */

const FORMATOS_AVATAR_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"]
const TAMANIO_MAXIMO_BYTES = 5 * 1024 * 1024 // 5 MB

export const actualizarPerfilService = async (
  userId: number,
  data: ActualizarPerfilDTO
) => {
  await settingsRepository.updateProfile(userId, data)
}

export const actualizarAuthService = async (
  userId: number,
  data: ActualizarAuthDTO
) => {
  const usuario = await userRepository.findById(userId)
  if (!usuario) throw new NotFoundError("Usuario no encontrado")

  const passwordValida = await compararContrasena(
    data.password_actual,
    usuario.password
  )
  if (!passwordValida)
    throw new UnauthorizedError("Contraseña actual incorrecta")

  const hashedPassword = await hashearContrasena(data.password_nueva)
  await settingsRepository.updatePassword(userId, hashedPassword)
}

export const actualizarAvatarService = async (
  userId: number,
  data: ActualizarAvatarDTO
) => {
  // Validar formato MIME embebido en el base64
  const match = data.avatar.match(/^data:(.+);base64,/)
  if (!match || !FORMATOS_AVATAR_PERMITIDOS.includes(match[1])) {
    throw new ValidationError("Formato no permitido. Usa JPG, PNG o WEBP")
  }

  // Validar tamaño: las cadenas base64 tienen ~4/3 del tamaño original
  const tamanoBytes = (data.avatar.length * 3) / 4
  if (tamanoBytes > TAMANIO_MAXIMO_BYTES) {
    throw new ValidationError("La imagen no puede superar los 5MB")
  }

  const resultado = await cloudinary.uploader.upload(data.avatar, {
    folder: "cinevault/avatars",
    public_id: `user_${userId}`,
    overwrite: true,
  })

  await settingsRepository.updateAvatar(userId, resultado.secure_url)

  return resultado.secure_url
}

export const eliminarCuentaService = async (userId: number) => {
  const usuario = await userRepository.findById(userId)
  if (!usuario) throw new NotFoundError("Usuario no encontrado")
  // La eliminación en cascada de Prisma (onDelete: Cascade) limpia el resto
  await userRepository.update(userId, {})
  // Prisma no tiene un método delete en IUserRepository, lo extendemos aquí
  // a través del repositorio base usando la instancia de la clase
  const { prisma } = await import("../lib/prisma.js")
  await prisma.users.delete({ where: { id: userId } })
}
