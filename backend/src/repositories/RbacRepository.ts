/* ==========================================================================
   RBAC REPOSITORY
   --------------------------------------------------------------------------
   Capa de acceso a datos para el panel de administración.
   Única responsabilidad: ejecutar queries con Prisma.
   No contiene lógica de negocio ni construye respuestas HTTP.
   ========================================================================== */

import { prisma } from "../lib/prisma.js"

export const rbacRepository = {

  /* ------------------------------------------------------------------------
     ESTADÍSTICAS GENERALES
     Recibe las fechas de referencia calculadas por el servicio.
     Solo ejecuta las queries y devuelve los datos en bruto.
     ---------------------------------------------------------------------- */
  obtenerEstadisticas: async (inicioMes: Date, inicioSemana: Date) => {
    const [
      totalUsuarios,
      usuariosAdmin,
      usuariosEditor,
      usuariosUser,
      usuariosNuevosMes,
      totalResenas,
      resenasSemana,
      reportesPendientes,
      reportesResueltos,
      reportesRechazados,
      totalComentarios,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.users.count({ where: { role: "admin" } }),
      prisma.users.count({ where: { role: "editor" } }),
      prisma.users.count({ where: { role: "user" } }),
      prisma.users.count({ where: { created_at: { gte: inicioMes } } }),
      prisma.reviews.count(),
      prisma.reviews.count({ where: { created_at: { gte: inicioSemana } } }),
      prisma.reports.count({ where: { status: "pending" } }),
      prisma.reports.count({ where: { status: "resolved" } }),
      prisma.reports.count({ where: { status: "rejected" } }),
      prisma.review_comments.count(),
    ])

    return {
      totalUsuarios,
      usuariosAdmin,
      usuariosEditor,
      usuariosUser,
      usuariosNuevosMes,
      totalResenas,
      resenasSemana,
      reportesPendientes,
      reportesResueltos,
      reportesRechazados,
      totalComentarios,
    }
  },

  /* ------------------------------------------------------------------------
   COMENTARIOS
   ---------------------------------------------------------------------- */
borrarComentario: async (commentId: number) => {
  return prisma.review_comments.delete({
    where: { id: commentId },
  })
},

obtenerPropietarioComentario: async (commentId: number) => {
  const comentario = await prisma.review_comments.findUnique({
    where: { id: commentId },
    select: { user_id: true },
  })
  return comentario?.user_id ?? null
},

}