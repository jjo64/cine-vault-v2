import { z } from "zod"

const ratingPasswordMsg = "La contraseña debe tener al menos 8 caracteres"

export const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z.string().min(8, ratingPasswordMsg),
})

export const changePasswordSchema = z.object({
  contrasenaActual: z.string().min(1, "Contraseña actual requerida"),
  contrasenaNueva: z.string().min(8, ratingPasswordMsg),
})

export const twoFAConfirmSchema = z.object({
  codigo: z.string().min(4, "Código requerido"),
})

export const twoFAVerifySchema = z.object({
  codigo: z.string().min(4, "Código requerido"),
  tokenTemporal: z.string().min(1, "Token temporal requerido"),
  rememberDevice: z.boolean().optional(),
})

export const revokeSessionParamsSchema = z.object({
  id: z.string().min(1, "ID de sesión requerido"),
})

export type LoginDTO = z.infer<typeof loginSchema>
