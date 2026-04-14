/* ==========================================================================
   RBAC SERVICE
   --------------------------------------------------------------------------
   Capa de lógica de negocio para el panel de administración.
   Única responsabilidad: aplicar reglas de negocio y construir respuestas.
   No conoce ni HTTP ni Prisma — solo llama al repositorio.
   ========================================================================== */

import { rbacRepository } from "../repositories/RbacRepository.js"
import { UAParser } from "ua-parser-js"

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

}