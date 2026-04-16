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
      type: "warning",
      read: false,
    },
  })
},

/* ------------------------------------------------------------------------
   OBTENER DATOS DE USUARIO PARA MODERACIÓN
   Devuelve los datos básicos del usuario y su historial de reportes.
   Se usa para enriquecer las alertas de moderación en tiempo real.
   ---------------------------------------------------------------------- */
obtenerDatosUsuarioModeracion: async (userId: number) => {
  return prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      membership: true,
      _count: {
        select: { reports: true }
      }
    }
  })
},

/* ------------------------------------------------------------------------
   REGISTRAR ACCIÓN DE MODERACIÓN
   Guarda en user_activity las acciones tomadas por el admin:
   content_blocked, user_banned, warning_sent
   ---------------------------------------------------------------------- */
registrarAccionModeracion: async (
  adminId: number | null,
  action: string,
  targetUserId?: number,
  metadata?: string
) => {
  return prisma.user_activity.create({
    data: {
      user_id: adminId || null,
      action,
      target_user_id: targetUserId || null,
      metadata: metadata || null,
    }
  })
},

/* ------------------------------------------------------------------------
   OBTENER HISTORIAL DE MODERACIÓN
   Devuelve las últimas 100 acciones de moderación ordenadas por fecha
   ---------------------------------------------------------------------- */
obtenerHistorialModeracion: async () => {
  const historial = await prisma.user_activity.findMany({
    where: {
      action: {
        in: ["content_blocked", "user_banned", "warning_sent", "user_unbanned"]
      }
    },
    include: {
      users: {
        select: { id: true, username: true, role: true }
      }
    },
    orderBy: { created_at: "desc" },
    take: 100,
  })

  // Para cada acción que tenga target_user_id, buscamos los datos del usuario afectado
  const historialConUsuario = await Promise.all(
    historial.map(async (item) => {
      let usuarioAfectado = null
      if (item.target_user_id) {
        usuarioAfectado = await prisma.users.findUnique({
          where: { id: item.target_user_id },
          select: { id: true, username: true, email: true, role: true }
        })
      }
      return { ...item, usuarioAfectado }
    })
  )

  return historialConUsuario
},

/* ------------------------------------------------------------------------
   OBTENER COMENTARIOS DE UN USUARIO
   Devuelve todos los comentarios de un usuario para revisión del admin.
   Útil para revisar el historial tras un baneo o warning.
   ---------------------------------------------------------------------- */
obtenerComentariosPorUsuario: async (userId: number) => {
  return prisma.review_comments.findMany({
    where: { user_id: userId },
    include: {
      users: {
        select: { id: true, username: true }
      },
      reviews: {
        select: { id: true, movie_id: true }
      }
    },
    orderBy: { created_at: "desc" },
  })
},

/* ------------------------------------------------------------------------
   OBTENER USUARIOS BANEADOS
   Devuelve usuarios con locked_until en año 2099 o superior
   ---------------------------------------------------------------------- */
obtenerUsuariosBaneados: async () => {
  return prisma.users.findMany({
    where: {
      locked_until: {
        gte: new Date("2099-01-01")
      }
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      membership: true,
      locked_until: true,
      created_at: true,
    },
    orderBy: { locked_until: "desc" }
  })
},

/* ------------------------------------------------------------------------
   BUSCAR USUARIO POR USERNAME O EMAIL
   Para que el admin pueda encontrar un usuario específico
   ---------------------------------------------------------------------- */
buscarUsuario: async (query: string) => {
  return prisma.users.findMany({
    where: {
      OR: [
        { username: { contains: query } },
        { email: { contains: query } },
      ]
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      membership: true,
      is_verified: true,
      locked_until: true,
      created_at: true,
    },
    take: 10,
  })
},

/* ------------------------------------------------------------------------
   DESBANEAR USUARIO
   ---------------------------------------------------------------------- */
desbanearUsuario: async (userId: number) => {
  return prisma.users.update({
    where: { id: userId },
    data: { locked_until: null },
  })
},

}