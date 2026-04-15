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
   ESTADÍSTICAS DE SESIONES — navegadores y dispositivos
   ------------------------------------------------------------------------
   Obtiene todas las sesiones activas con su user_agent.
   El servicio se encargará de parsear y agrupar los datos.
   No procesamos el user_agent aquí — el repositorio solo devuelve
   datos en bruto, sin lógica de negocio.
   ---------------------------------------------------------------------- */
obtenerSesiones: async () => {
  return prisma.sessions.findMany({
    select: {
      user_agent: true,  // el string del navegador/dispositivo
      ip_address: true,  // la IP de conexión
      created_at: true,  // cuándo se creó la sesión
    },
  })
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

/* ------------------------------------------------------------------------
   BANEAR USUARIO
   Bloquea al usuario permanentemente estableciendo locked_until
   a una fecha muy lejana e invalida todas sus sesiones activas.
   ---------------------------------------------------------------------- */
banearUsuario: async (userId: number) => {
  // Fecha muy lejana — equivale a baneo permanente
  const fechaBaneo = new Date("2099-12-31")

  // Bloqueamos al usuario y eliminamos todas sus sesiones activas
  await Promise.all([
    prisma.users.update({
      where: { id: userId },
      data: { locked_until: fechaBaneo },
    }),
    prisma.sessions.deleteMany({
      where: { user_id: userId },
    }),
  ])
},

/* ------------------------------------------------------------------------
   ENVIAR WARNING
   Crea una notificación de tipo warning al usuario con el texto
   del contenido ofensivo para que sepa por qué fue advertido.
   ---------------------------------------------------------------------- */
crearWarning: async (userId: number, contenidoOfensivo: string) => {
  return prisma.notifications.create({
    data: {
      user_id: userId,
      sender_id: null,
      type: "warning" as any, // pendiente añadir al enum con el equipo
      read: false,
    },
  })
},

}