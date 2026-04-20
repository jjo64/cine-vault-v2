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
  banearUsuarioService: async (userId: number, adminId: number) => {
    await rbacRepository.banearUsuario(userId)
    await invalidarCacheUsuario(userId)
    await rbacRepository.registrarAccionModeracion(
      adminId,
      "user_banned",
      userId,
      `Usuario ${userId} baneado permanentemente`
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
    await rbacRepository.crearWarning(userId, contenidoOfensivo)
    const socketId = usuariosConectados.get(userId)
    if (socketId) {
      io.to(socketId).emit("warning_recibido", {
        mensaje: "Has recibido un aviso por contenido inapropiado. En la siguiente infracción podrás ser baneado permanentemente.",
        contenido: contenidoOfensivo,
        timestamp: new Date().toISOString(),
      })
    }
    await rbacRepository.registrarAccionModeracion(
      adminId,
      "warning_sent",
      userId,
      `Contenido ofensivo: ${contenidoOfensivo.substring(0, 100)}`
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
  // Añadir el strike
  await rbacRepository.añadirStrike(userId, tipo, adminId)

  // Contar strikes activos del mismo tipo en los últimos 90 días
  const totalStrikes = await rbacRepository.contarStrikesActivos(userId, tipo)

  // Lógica de bloqueo automático al llegar a 3 strikes
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

}