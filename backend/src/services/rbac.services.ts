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
     Responsabilidades:
     - Calcular las fechas de referencia (lógica de negocio)
     - Pedir los datos al repositorio
     - Construir la respuesta con la estructura que necesita el frontend
     ---------------------------------------------------------------------- */
  obtenerEstadisticasService: async () => {
    // Calculamos las fechas de referencia — esto es lógica de negocio
    // porque decidimos qué significa "este mes" y "esta semana"
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const inicioSemana = new Date(ahora)
    inicioSemana.setDate(ahora.getDate() - 7)

    // Pedimos los datos en bruto al repositorio
    const stats = await rbacRepository.obtenerEstadisticas(inicioMes, inicioSemana)

    // Construimos la respuesta con la estructura que queremos devolver
    // Esta decisión es de negocio — cómo agrupamos y nombramos los datos
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

  obtenerEstadisticasSessionsService: async () => {
  // Pedimos los datos en bruto al repositorio
  const sesiones = await rbacRepository.obtenerSesiones()

  // Parseamos cada user_agent con ua-parser-js
  const parser = new UAParser()
  const navegadores: Record<string, number> = {}
  const dispositivos: Record<string, number> = {}

  for (const sesion of sesiones) {
    if (!sesion.user_agent) continue

    // Parseamos el string feo en datos legibles
    parser.setUA(sesion.user_agent)
    const resultado = parser.getResult()

    // Contamos navegadores
    const navegador = resultado.browser.name ?? "Desconocido"
    navegadores[navegador] = (navegadores[navegador] ?? 0) + 1

    // Contamos dispositivos — si no tiene tipo es desktop
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
 COMENTARIOS
 Responsabilidades:
- Verificar que el comentario existe
- Delegar el borrado al repositorio
---------------------------------------------------------------------- */
    borrarComentarioService: async (commentId: number) => {
    await rbacRepository.borrarComentario(commentId)
    },

/* ------------------------------------------------------------------------
   BANEAR USUARIO
   Bloquea al usuario permanentemente e invalida su caché de rol
   para que el cambio sea inmediato sin necesidad de cerrar sesión.
   ---------------------------------------------------------------------- */
banearUsuarioService: async (userId: number, adminId: number) => {
  await rbacRepository.banearUsuario(userId)
  await invalidarCacheUsuario(userId)
  // Registrar acción en el historial
  await rbacRepository.registrarAccionModeracion(adminId, "user_banned", userId)
},

/* ------------------------------------------------------------------------
   ENVIAR WARNING
   Crea una notificación de warning al usuario con el contenido
   ofensivo y la avisa en tiempo real si está conectado.
   ---------------------------------------------------------------------- */
enviarWarningService: async (userId: number, contenidoOfensivo: string, adminId: number) => {
  await rbacRepository.crearWarning(userId, contenidoOfensivo)
  // Notificamos al usuario en tiempo real si está conectado
  const socketId = usuariosConectados.get(userId)
  if (socketId) {
    io.to(socketId).emit("warning_recibido", {
      mensaje: "Has recibido un aviso por contenido inapropiado. En la siguiente infracción podrás ser baneado permanentemente.",
      contenido: contenidoOfensivo,
      timestamp: new Date().toISOString(),
    })
  }
  // Registrar acción en el historial
  await rbacRepository.registrarAccionModeracion(adminId, "warning_sent", userId)
},

/* ------------------------------------------------------------------------
   HISTORIAL DE MODERACIÓN
   Devuelve las últimas acciones de moderación para el panel de admin
   ---------------------------------------------------------------------- */
obtenerHistorialModeracionService: async () => {
  return rbacRepository.obtenerHistorialModeracion()
},

/* ------------------------------------------------------------------------
   OBTENER COMENTARIOS DE UN USUARIO
   Para revisión del admin tras un baneo o warning.
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
   DESBANEAR USUARIO
   ---------------------------------------------------------------------- */
desbanearUsuarioService: async (userId: number, adminId: number) => {
  await rbacRepository.desbanearUsuario(userId)
  await invalidarCacheUsuario(userId)
  await rbacRepository.registrarAccionModeracion(adminId, "user_unbanned", userId)
},

}