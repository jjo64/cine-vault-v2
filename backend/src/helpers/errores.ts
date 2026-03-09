import { Prisma } from "@prisma/client"

export function obtenerMensajeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Error interno del servidor"
}
export function obtenerCodigoPrisma(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code
  }
  return null
}
