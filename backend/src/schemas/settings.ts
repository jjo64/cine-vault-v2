import { z } from "zod"

/* ==========================================================================
   SCHEMAS DE CONFIGURACIÓN — Validación de entrada con Zod
   ========================================================================== */

/** Actualizar datos del perfil (username, email, bio) */
export const actualizarPerfilSchema = z
  .object({
    username: z
      .string()
      .min(3, "El username debe tener al menos 3 caracteres")
      .max(30, "El username no puede superar 30 caracteres")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "El username solo puede contener letras, números y guiones bajos"
      )
      .optional(),
    email: z.string().email("El email no tiene un formato válido").optional(),
    bio: z
      .string()
      .max(280, "La bio no puede superar 280 caracteres")
      .optional(),
  })
  .refine(
    (data) =>
      data.username !== undefined ||
      data.email !== undefined ||
      data.bio !== undefined,
    { message: "Debes proporcionar al menos un campo para actualizar" }
  )

/** Cambiar contraseña */
export const actualizarAuthSchema = z
  .object({
    password_actual: z.string().min(1, "La contraseña actual es requerida"),
    password_nueva: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
      .refine((val) => val.trim().length > 0, {
        message: "La contraseña no puede ser solo espacios",
      }),
    password_confirmacion: z
      .string()
      .min(1, "La confirmación de contraseña es requerida"),
  })
  .refine((data) => data.password_nueva === data.password_confirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirmacion"],
  })

/** Actualizar avatar (base64) */
export const actualizarAvatarSchema = z.object({
  avatar: z.string().min(1, "No se ha proporcionado imagen"),
})

export type ActualizarPerfilDTO = z.infer<typeof actualizarPerfilSchema>
export type ActualizarAuthDTO = z.infer<typeof actualizarAuthSchema>
export type ActualizarAvatarDTO = z.infer<typeof actualizarAvatarSchema>
