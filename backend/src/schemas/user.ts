import { z } from "zod"

// Esquema de validación para registro de usuario
const esquemaUsuario = z.object({
  username: z
    .string()
    .trim()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  email: z.email("El correo debe tener un formato válido").trim(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .refine(
      (val) => val.trim().length > 0,
      "La contraseña no puede ser solo espacios en blanco"
    ),
})

/**
 * Valida los datos del usuario usando el esquema Zod.
 * Devuelve los datos parseados si son válidos, o los mensajes de error si no.
 */
function validarUsuario(data: unknown) {
  const resultado = esquemaUsuario.safeParse(data)

  if (!resultado.success) {
    return {
      success: false,
      errorMessages: resultado.error.issues.map((err) => err.message),
    }
  }

  return { success: true, data: resultado.data }
}

export { validarUsuario }
