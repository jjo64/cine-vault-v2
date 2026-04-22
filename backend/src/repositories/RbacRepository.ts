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
   Bloquea al usuario estableciendo locked_until a una fecha específica.
   Si no se pasa fecha, el bloqueo es permanente (año 2099).
   Si se pasa fecha, el bloqueo es temporal (usado por el sistema de strikes).
   También invalida todas las sesiones activas del usuario.
   ---------------------------------------------------------------------- */
banearUsuario: async (userId: number, fechaBloqueo?: Date) => {
  await Promise.all([
    prisma.users.update({
      where: { id: userId },
      data: { locked_until: fechaBloqueo ?? new Date("2099-12-31") },
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
        in: ["content_blocked", "user_banned", "warning_sent", "user_unbanned", "strike_added"]
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
        gt: new Date() // cualquier fecha futura
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

/* ------------------------------------------------------------------------
   SISTEMA DE STRIKES
   ---------------------------------------------------------------------- */

// Añadir un strike a un usuario
añadirStrike: async (userId: number, tipo: string, adminId?: number) => {
  return prisma.user_strikes.create({
    data: {
      user_id: userId,
      tipo,
      admin_id: adminId || null,
    }
  })
},

// Contar strikes activos de un usuario (últimos 90 días)
contarStrikesActivos: async (userId: number, tipo: string) => {
  const fechaLimite = new Date()
  fechaLimite.setDate(fechaLimite.getDate() - 90)

  return prisma.user_strikes.count({
    where: {
      user_id: userId,
      tipo,
      created_at: { gte: fechaLimite }
    }
  })
},

// Obtener todos los strikes de un usuario
obtenerStrikesUsuario: async (userId: number) => {
  return prisma.user_strikes.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  })
},

/* ------------------------------------------------------------------------
   LIMPIAR STRIKES DE UN USUARIO
   Elimina todos los strikes activos al desbanear manualmente
   ---------------------------------------------------------------------- */
limpiarStrikesUsuario: async (userId: number) => {
  return prisma.user_strikes.deleteMany({
    where: { user_id: userId }
  })
},

/* ------------------------------------------------------------------------
   OBTENER REPORTES
   Incluye el reporter (users), la reseña y el autor de la reseña
   (reviews.users) para que el modal de gestión tenga todos los datos.
   ---------------------------------------------------------------------- */
obtenerReportes: async () => {
  return prisma.reports.findMany({
    include: {
      users: true,          // quien reporta
      reviews: {
        include: {
          users: true,      // autor de la reseña = usuario reportado
        },
      },
    },
    orderBy: { created_at: "desc" },
  })
},

/* ------------------------------------------------------------------------
   ACTUALIZAR REPORTE
   Cambia el estado y guarda la nota de resolución.
   ---------------------------------------------------------------------- */
actualizarReporte: async (
  id: number,
  status: "resolved" | "rejected",
  resolutionNote?: string
) => {
  return prisma.reports.update({
    where: { id },
    data: {
      status,
      resolution_note: resolutionNote ?? null,
    },
    include: { users: true },
  })
},

/* ------------------------------------------------------------------------
   ACTIVIDAD DE USUARIOS
   Cruza múltiples tablas para construir un feed de actividad real.
   No contiene lógica de negocio — devuelve datos en bruto.
   El servicio se encarga de normalizar y ordenar.
   ---------------------------------------------------------------------- */
obtenerActividadUsuarios: async (userId?: number, limit = 50) => {
  const filtroUsuario = userId ? { user_id: userId } : {}
  const filtroFollower = userId ? { follower_id: userId } : {}

  const [
    resenas,
    likes,
    comentarios,
    follows,
    watchlist,
    favoritos,
    vault,
    pagos,
  ] = await Promise.all([
    prisma.reviews.findMany({
      where: filtroUsuario,
      select: {
        user_id: true,
        movie_id: true,
        rating: true,
        mode: true,
        created_at: true,
        users: { select: { id: true, username: true } },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    }),

    prisma.review_likes.findMany({
      where: filtroUsuario,
      select: {
        user_id: true,
        review_id: true,
        created_at: true,
        users: { select: { id: true, username: true } },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    }),

    prisma.review_comments.findMany({
      where: filtroUsuario,
      select: {
        user_id: true,
        review_id: true,
        content: true,
        created_at: true,
        users: { select: { id: true, username: true } },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    }),

    prisma.follows.findMany({
      where: filtroFollower,
      select: {
        follower_id: true,
        following_id: true,
        users_follows_follower_idTousers: {
          select: { id: true, username: true },
        },
        users_follows_following_idTousers: {
          select: { id: true, username: true },
        },
      },
      take: limit,
    }),

    prisma.watchlist.findMany({
      where: filtroUsuario,
      select: {
        user_id: true,
        movie_id: true,
        added_at: true,
        users: { select: { id: true, username: true } },
      },
      orderBy: { added_at: "desc" },
      take: limit,
    }),

    prisma.favorites.findMany({
      where: filtroUsuario,
      select: {
        user_id: true,
        movie_id: true,
        users: { select: { id: true, username: true } },
      },
      take: limit,
    }),

    prisma.vault_social_entries.findMany({
      where: filtroUsuario,
      select: {
        user_id: true,
        entry_type: true,
        title: true,
        created_at: true,
        users: { select: { id: true, username: true } },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    }),

    prisma.payments.findMany({
      where: { ...filtroUsuario, payment_status: "paid" },
      select: {
        user_id: true,
        amount: true,
        payment_status: true,
        created_at: true,
        users: { select: { id: true, username: true } },
        subscriptions: { select: { plan: true } },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    }),
  ])

  return { resenas, likes, comentarios, follows, watchlist, favoritos, vault, pagos }
},

/* ------------------------------------------------------------------------
   PERFIL COMPLETO DE USUARIO PARA EL ADMIN
   Devuelve en paralelo todos los datos del usuario:
   datos básicos, reseñas, comentarios, likes, pagos, suscripción y strikes.
   El servicio se encarga de normalizar — aquí solo queries en bruto.
   ---------------------------------------------------------------------- */
obtenerPerfilUsuario: async (userId: number) => {
  const [
    usuario,
    resenas,
    comentarios,
    likes,
    pagos,
    suscripcion,
    strikes,
    reportesRecibidos,
  ] = await Promise.all([
    prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        membership: true,
        is_verified: true,
        is_public: true,
        two_factor_enabled: true,
        locked_until: true,
        created_at: true,
        updated_at: true,
      },
    }),

    prisma.reviews.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        movie_id: true,
        rating: true,
        mode: true,
        likes: true,
        contiene_spoilers: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 10,
    }),

    prisma.review_comments.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        content: true,
        review_id: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 10,
    }),

    prisma.review_likes.findMany({
      where: { user_id: userId },
      select: {
        review_id: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 10,
    }),

    prisma.payments.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        amount: true,
        currency: true,
        payment_status: true,
        provider: true,
        created_at: true,
        subscriptions: {
          select: { plan: true, status: true },
        },
      },
      orderBy: { created_at: "desc" },
      take: 20,
    }),

    prisma.subscriptions.findFirst({
      where: { user_id: userId, status: "active" },
      select: {
        id: true,
        plan: true,
        status: true,
        start_date: true,
        end_date: true,
        provider: true,
      },
    }),

    prisma.user_strikes.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        tipo: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    }),

      prisma.reports.count({
        where: { reviews: { user_id: userId } },
      }),
  ])

  return {
    usuario,
    resenas,
    comentarios,
    likes,
    pagos,
    suscripcion,
    strikes,
    reportesRecibidos,
  }
},

/* ------------------------------------------------------------------------
   SESIONES DE UN USUARIO
   Devuelve las sesiones activas de un usuario con su info de dispositivo.
   ---------------------------------------------------------------------- */
obtenerSesionesUsuario: async (userId: number) => {
  return prisma.sessions.findMany({
    where: {
      user_id: userId,
      expires_at: { gt: new Date() },
    },
    select: {
      id: true,
      user_agent: true,
      ip_address: true,
      created_at: true,
      expires_at: true,
    },
    orderBy: { created_at: "desc" },
  })
},

/* ------------------------------------------------------------------------
   INVALIDAR SESIÓN
   Elimina una sesión específica — fuerza el cierre de sesión en ese dispositivo.
   ---------------------------------------------------------------------- */
invalidarSesion: async (sessionId: string) => {
  return prisma.sessions.delete({
    where: { id: sessionId },
  })
},

obtenerUsuariosPorRol: async (role?: string, createdAfter?: Date) => {
  return prisma.users.findMany({
    where: {
      ...(role ? { role: role as any } : {}),
      ...(createdAfter ? { created_at: { gte: createdAfter } } : {}),
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
    orderBy: { created_at: "desc" },
  })
},

}