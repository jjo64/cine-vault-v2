import { users } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import type {
  ActualizarPerfilDTO,
  ActualizarAuthDTO,
} from "../schemas/settings.js"

/* ==========================================================================
   SETTINGS REPOSITORY
   --------------------------------------------------------------------------
   Encapsula las queries de Prisma para operaciones de configuración de cuenta:
   actualizar perfil, contraseña y avatar. SettingsController tenía estas
   queries inline junto con la lógica de negocio (bcrypt, validaciones).
   ========================================================================== */

export interface ISettingsRepository {
  findById(id: number): Promise<users | null>
  updateProfile(id: number, data: Partial<ActualizarPerfilDTO>): Promise<users>
  updatePassword(id: number, hashedPassword: string): Promise<void>
  updateAvatar(id: number, avatarUrl: string): Promise<void>
}

export class SettingsRepository implements ISettingsRepository {
  async findById(id: number) {
    return prisma.users.findUnique({ where: { id } })
  }

  async updateProfile(id: number, data: Partial<ActualizarPerfilDTO>) {
    return prisma.users.update({
      where: { id },
      data: {
        ...(data.username && { username: data.username }),
        ...(data.email && { email: data.email }),
        ...(data.bio !== undefined && { bio: data.bio }),
      },
    })
  }

  async updatePassword(id: number, hashedPassword: string) {
    await prisma.users.update({
      where: { id },
      data: { password: hashedPassword },
    })
  }

  async updateAvatar(id: number, avatarUrl: string) {
    await prisma.users.update({
      where: { id },
      data: { avatar_url: avatarUrl },
    })
  }
}

export const settingsRepository = new SettingsRepository()
