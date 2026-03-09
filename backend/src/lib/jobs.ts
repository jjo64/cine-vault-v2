import { prisma } from "../lib/prisma.js"
/* ==========================================================================
   6. LIMPIEZA (CRON)
   ========================================================================== */

/**
 * Elimina usuarios no verificados con más de 24 horas de antigüedad.
 * Ejecutado por el cron en server.ts cada hora.
 */
export const limpiarUsuariosNoVerificados = async () => {
  try {
    const eliminados = await prisma.users.deleteMany({
      where: {
        is_verified: false,
        created_at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })
    if (eliminados.count > 0) {
      console.log(
        `Limpieza: ${eliminados.count} usuarios no verificados eliminados`
      )
    }
  } catch (error) {
    console.error("Error en limpieza de usuarios no verificados:", error)
    // No relanzamos — si falla, el próximo ciclo lo intentará
  }
}
