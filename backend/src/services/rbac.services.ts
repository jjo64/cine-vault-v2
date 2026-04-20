/* ==========================================================================
   RBAC SERVICE
   --------------------------------------------------------------------------
   Capa de lógica de negocio para el panel de administración.
   Única responsabilidad: aplicar reglas de negocio y construir respuestas.
   No conoce ni HTTP ni Prisma — solo llama al repositorio.
   ========================================================================== */

import { rbacRepository } from "../repositories/RbacRepository.js"
import { UAParser } from "ua-parser-js"
import { io, usuariosConectados } from "../config/socketio.config.js"
import { invalidarCacheUsuario } from "../middlewares/rbac.middleware.js"


export const rbacService = {

  /* ------------------------------------------------------------------------
     ESTADÍSTICAS GENERALES
     ---------------------------------------------------------------------- */
  obtenerEstadisticasService: async () => {
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const inicioSemana = new Date(ahora)
    inicioSemana.setDate(ahora.getDate() - 7)

    const stats = await rbacRepository.obtenerEstadisticas(inicioMes, inicioSemana)

    return {
      usuarios: {
        total: stats.totalUsuarios,
        por_rol: {
          admin: stats.usuariosAdmin,
          editor: stats.usuariosEditor,
          user: stats.usuariosUser,
        },
        nuevos_este_mes: stats.usuariosNuevosMes,
      },
      resenas: {
        total: stats.totalResenas,
        esta_semana: stats.resenasSemana,
      },
      reportes: {
        pendientes: stats.reportesPendientes,
        resueltos: stats.reportesResueltos,
        rechazados: stats.reportesRechazados,
      },
      comentarios: {
        total: stats.totalComentarios,
      },
    }
  },

  /* ------------------------------------------------------------------------
     ESTADÍSTICAS DE SESIONES
     ---------------------------------------------------------------------- */
  obtenerEstadisticasSessionsService: async () => {
    const sesiones = await rbacRepository.obtenerSesiones()
    const parser = new UAParser()
    const navegadores: Record<string, number> = {}
    const dispositivos: Record<string, number> = {}

    for (const sesion of sesiones) {
      if (!sesion.user_agent) continue
      parser.setUA(sesion.user_agent)
      const resultado = parser.getResult()
      const navegador = resultado.browser.name ?? "Desconocido"
      navegadores[navegador] = (navegadores[navegador] ?? 0) + 1
      const dispositivo = resultado.device.type ?? "desktop"
      dispositivos[dispositivo] = (dispositivos[dispositivo] ?? 0) + 1
    }

    return {
      sesiones_activas: sesiones.length,
      navegadores,
      dispositivos,
    }
  },

  /* ------------------------------------------------------------------------
     BORRAR COMENTARIO
     ---------------------------------------------------------------------- */
  borrarComentarioService: async (commentId: number) => {
    await rbacRepository.borrarComentario(commentId)
  },

  /* ------------------------------------------------------------------------
     BANEAR USUARIO
     ---------------------------------------------------------------------- */
banearUsuarioService: async (
  userId: number,
  adminId: number,
  fechaBloqueo?: Date          // ← nuevo parámetro opcional
) => {
  await rbacRepository.banearUsuario(userId, fechaBloqueo)
  await invalidarCacheUsuario(userId)
  const esTemporalLabel = fechaBloqueo
    ? `Ban temporal hasta ${fechaBloqueo.toISOString().split("T")[0]}`
    : "Ban permanente"
  await rbacRepository.registrarAccionModeracion(
    adminId,
    "user_banned",
    userId,
    `${esTemporalLabel} — usuario ${userId}`
  )
},

  /* ------------------------------------------------------------------------
     DESBANEAR USUARIO
     ---------------------------------------------------------------------- */
desbanearUsuarioService: async (userId: number, adminId: number) => {
  await rbacRepository.desbanearUsuario(userId)
  await rbacRepository.limpiarStrikesUsuario(userId)  // ← limpia los strikes
  await invalidarCacheUsuario(userId)
  await rbacRepository.registrarAccionModeracion(
    adminId,
    "user_unbanned",
    userId,
    `Usuario ${userId} desbaneado y strikes eliminados`
  )
},

  /* ------------------------------------------------------------------------
     ENVIAR WARNING
     ---------------------------------------------------------------------- */
enviarWarningService: async (userId: number, contenidoOfensivo: string, adminId: number) => {
  const texto = contenidoOfensivo ?? "sin detalle"

  // Detectar tipo de infracción por palabras clave del contenido
  const mensajesPorTipo: Record<string, string> = {
    spoiler:
      "Has recibido un aviso por publicar spoilers sin marcar. " +
      "Recuerda usar la opción de spoiler al escribir reseñas para no arruinar la experiencia de otros usuarios. " +
      "Un comportamiento reiterado puede acarrear desde un strike hasta un baneo permanente de tu cuenta.",
    spam:
      "Has recibido un aviso por publicar contenido promocional o spam. " +
      "Este tipo de contenido no está permitido en CineVault. " +
      "Un comportamiento reiterado puede acarrear desde un strike hasta un baneo permanente de tu cuenta.",
    acoso:
      "Has recibido un aviso por comportamiento inapropiado hacia otros usuarios. " +
      "CineVault es un espacio de respeto y diversidad. " +
      "Un comportamiento reiterado puede acarrear desde un strike hasta un baneo permanente de tu cuenta.",
    inapropiado:
      "Has recibido un aviso por publicar contenido que viola las normas de CineVault. " +
      "El contenido ha sido revisado y eliminado por nuestro equipo de moderación. " +
      "Un comportamiento reiterado puede acarrear desde un strike hasta un baneo permanente de tu cuenta.",
  }

  // Detectar tipo según el contenido del reporte
  const tipoDetectado = texto.toLowerCase().includes("spoiler")
    ? "spoiler"
    : texto.toLowerCase().includes("spam") || texto.toLowerCase().includes("publicidad")
    ? "spam"
    : texto.toLowerCase().includes("acoso") || texto.toLowerCase().includes("ofensivo")
    ? "acoso"
    : "inapropiado"

  const mensajeWarning =
    mensajesPorTipo[tipoDetectado] ??
    "Has recibido un aviso de nuestro equipo de moderación. " +
    "Por favor revisa las normas de la comunidad de CineVault. " +
    "Un comportamiento reiterado puede acarrear desde un strike hasta un baneo permanente de tu cuenta."

  await rbacRepository.crearWarning(userId, texto)

  // Notificar al usuario en tiempo real si está conectado
  const socketId = usuariosConectados.get(userId)
  if (socketId) {
    io.to(socketId).emit("warning_recibido", {
      mensaje: mensajeWarning,
      contenido: texto,
      timestamp: new Date().toISOString(),
    })
  }

  await rbacRepository.registrarAccionModeracion(
    adminId,
    "warning_sent",
    userId,
    `Contenido ofensivo: ${texto.substring(0, 100)}`
  )
},
  /* ------------------------------------------------------------------------
     HISTORIAL DE MODERACIÓN
     ---------------------------------------------------------------------- */
  obtenerHistorialModeracionService: async () => {
    return rbacRepository.obtenerHistorialModeracion()
  },

  /* ------------------------------------------------------------------------
     OBTENER COMENTARIOS DE UN USUARIO
     ---------------------------------------------------------------------- */
  obtenerComentariosPorUsuarioService: async (userId: number) => {
    return rbacRepository.obtenerComentariosPorUsuario(userId)
  },

  /* ------------------------------------------------------------------------
     OBTENER USUARIOS BANEADOS
     ---------------------------------------------------------------------- */
  obtenerUsuariosBaneadosService: async () => {
    return rbacRepository.obtenerUsuariosBaneados()
  },

  /* ------------------------------------------------------------------------
     BUSCAR USUARIO
     ---------------------------------------------------------------------- */
  buscarUsuarioService: async (query: string) => {
    return rbacRepository.buscarUsuario(query)
  },

/* ------------------------------------------------------------------------
   SISTEMA DE STRIKES
   ---------------------------------------------------------------------- */
añadirStrikeService: async (userId: number, tipo: string, adminId: number) => {
  // 1. Añadir el strike
  await rbacRepository.añadirStrike(userId, tipo, adminId)

  // 2. Contar strikes activos DESPUÉS de añadir
  const totalStrikes = await rbacRepository.contarStrikesActivos(userId, tipo)

  // 3. Registrar en historial
  await rbacRepository.registrarAccionModeracion(
    adminId,
    "strike_added",
    userId,
    `Strike de tipo "${tipo}" añadido (total activos: ${totalStrikes})`
  )

  // 4. Bloqueo automático al llegar a 3
  if (totalStrikes >= 3) {
    const fechaBloqueo = new Date()
    switch (tipo) {
      case "spoiler":
        fechaBloqueo.setDate(fechaBloqueo.getDate() + 7)
        break
      case "spam":
        fechaBloqueo.setDate(fechaBloqueo.getDate() + 14)
        break
      case "acoso":
        fechaBloqueo.setDate(fechaBloqueo.getDate() + 30)
        break
    }
    await rbacRepository.banearUsuario(userId, fechaBloqueo)
    await invalidarCacheUsuario(userId)
    await rbacRepository.registrarAccionModeracion(
      adminId,
      "user_banned",
      userId,
      `Bloqueo automático por 3 strikes de tipo: ${tipo}`
    )
  }

  return totalStrikes
},

obtenerStrikesUsuarioService: async (userId: number) => {
  return rbacRepository.obtenerStrikesUsuario(userId)
},

/* ------------------------------------------------------------------------
   OBTENER REPORTES
   ---------------------------------------------------------------------- */
obtenerReportesService: async () => {
  return rbacRepository.obtenerReportes()
},

/* ------------------------------------------------------------------------
   ACTUALIZAR REPORTE
   Cambia el estado, registra la acción de moderación y notifica
   al reporter si el reporte se marca como resuelto.
   ---------------------------------------------------------------------- */
actualizarReporteService: async (
  reporteId: number,
  status: "resolved" | "rejected",
  resolutionNote: string,
  adminId: number
) => {
  const reporte = await rbacRepository.actualizarReporte(reporteId, status, resolutionNote)

  // Notificar al reporter si el reporte fue resuelto
  if (status === "resolved" && reporte.reporter_id) {
    const socketId = usuariosConectados.get(reporte.reporter_id)
    if (socketId) {
      io.to(socketId).emit("nueva_notificacion", {
        type: "report_resolved",
        mensaje: "Tu reporte ha sido revisado y resuelto por un administrador.",
      })
    }
  }

  await rbacRepository.registrarAccionModeracion(
    adminId,
    status === "resolved" ? "report_resolved" : "report_rejected",
    undefined,
    `Reporte #${reporteId} marcado como ${status}: ${resolutionNote}`
  )

  return reporte
},

/* ------------------------------------------------------------------------
   ACTIVIDAD DE USUARIOS
   Normaliza los datos en bruto del repositorio en un feed unificado
   ordenado por fecha descendente.
   ---------------------------------------------------------------------- */
obtenerActividadUsuariosService: async (userId?: number, limit = 50) => {
  const datos = await rbacRepository.obtenerActividadUsuarios(userId, limit)

  type ActivityItem = {
    user: { id: number; username: string }
    action: string
    detail: string
    created_at: Date
  }

  const feed: ActivityItem[] = []

  // Reseñas creadas
  for (const r of datos.resenas) {
    feed.push({
      user: r.users,
      action: "review_created",
      detail: `Valoró la película ${r.movie_id} con ${r.rating}★ (modo: ${r.mode})`,
      created_at: r.created_at,
    })
  }

  // Likes dados
  for (const l of datos.likes) {
    feed.push({
      user: l.users,
      action: "review_liked",
      detail: `Dio like a la reseña #${l.review_id}`,
      created_at: l.created_at!,
    })
  }

  // Comentarios
  for (const c of datos.comentarios) {
    feed.push({
      user: c.users,
      action: "comment_created",
      detail: `Comentó en la reseña #${c.review_id}: "${c.content.substring(0, 60)}..."`,
      created_at: c.created_at,
    })
  }

  // Follows
  for (const f of datos.follows) {
    feed.push({
      user: f.users_follows_follower_idTousers,
      action: "user_followed",
      detail: `Siguió a @${f.users_follows_following_idTousers.username}`,
      created_at: new Date(0), // follows no tiene created_at en el schema
    })
  }

  // Watchlist
  for (const w of datos.watchlist) {
    feed.push({
      user: w.users,
      action: "watchlist_added",
      detail: `Añadió la película #${w.movie_id} a su watchlist`,
      created_at: w.added_at,
    })
  }

  // Favoritos — no tienen created_at en el schema, los ponemos al final
  for (const f of datos.favoritos) {
    feed.push({
      user: f.users,
      action: "favorite_added",
      detail: `Añadió la película #${f.movie_id} a favoritos`,
      created_at: new Date(0),
    })
  }

  // Vault
  for (const v of datos.vault) {
    feed.push({
      user: v.users,
      action: "vault_created",
      detail: `Publicó en el Vault: "${v.title}" (${v.entry_type})`,
      created_at: v.created_at,
    })
  }

  // Pagos
  for (const p of datos.pagos) {
    feed.push({
      user: p.users,
      action: "payment_completed",
      detail: `Realizó un pago de ${p.amount}€ — plan ${p.subscriptions?.plan ?? "desconocido"}`,
      created_at: p.created_at,
    })
  }

  // Ordenar por fecha descendente y aplicar límite final
  return feed
    .filter(item => item.created_at > new Date(0)) // excluir los sin fecha
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, limit)
},

}