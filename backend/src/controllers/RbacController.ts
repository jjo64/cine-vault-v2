/* ==========================================================================
   RBAC CONTROLLER
   --------------------------------------------------------------------------
   Capa HTTP del panel de administración.
   Única responsabilidad: extraer datos del request, llamar al servicio
   y devolver la respuesta HTTP. Sin lógica de negocio. Sin Prisma.
   ========================================================================== */

import { Request, Response } from "express"
import { rbacService } from "../services/rbac.services.js"

/* --------------------------------------------------------------------------
   ESTADÍSTICAS GENERALES
   No necesita datos del request — devuelve estadísticas globales
   -------------------------------------------------------------------------- */
export const obtenerEstadisticas = async (req: Request, res: Response) => {
  const stats = await rbacService.obtenerEstadisticasService()
  res.json(stats)
}

/* --------------------------------------------------------------------------
   ESTADÍSTICAS DE SESIONES — navegadores y dispositivos
   Llama al servicio que parsea los user_agents y devuelve las estadísticas
   -------------------------------------------------------------------------- */

export const obtenerEstadisticasSesiones = async (req: Request, res: Response) => {
  const stats = await rbacService.obtenerEstadisticasSessionsService()
  res.json(stats)
}

/* --------------------------------------------------------------------------
   BORRAR COMENTARIO AJENO
   Extrae el id del comentario del request y llama al servicio
   -------------------------------------------------------------------------- */
export const borrarComentario = async (req: Request, res: Response) => {
  await rbacService.borrarComentarioService(Number(req.params.id))
  res.json({ message: "Comentario eliminado correctamente" })
}

/* --------------------------------------------------------------------------
   BANEAR USUARIO
   Bloquea al usuario permanentemente e invalida sus sesiones
   -------------------------------------------------------------------------- */
export const banearUsuario = async (req: Request, res: Response) => {
  const { locked_until } = req.body
  const fechaBloqueo = locked_until ? new Date(locked_until) : undefined
  await rbacService.banearUsuarioService(
    Number(req.params.id),
    req.user!.user_id,
    fechaBloqueo           // undefined = permanente, Date = temporal
  )
  res.json({ message: "Usuario baneado correctamente" })
}

/* --------------------------------------------------------------------------
   ENVIAR WARNING
   Envía una advertencia al usuario con el contenido ofensivo
   -------------------------------------------------------------------------- */
export const enviarWarning = async (req: Request, res: Response) => {
  const { contenidoOfensivo } = req.body
  await rbacService.enviarWarningService(
    Number(req.params.id),
    contenidoOfensivo,
    req.user!.user_id  // ← ID del admin que ejecuta la acción
  )
  res.json({ message: "Warning enviado correctamente" })
}

/* --------------------------------------------------------------------------
   HISTORIAL DE MODERACIÓN
   Devuelve las últimas acciones de moderación tomadas por los admins
   -------------------------------------------------------------------------- */
export const obtenerHistorialModeracion = async (req: Request, res: Response) => {
  const historial = await rbacService.obtenerHistorialModeracionService()
  res.json(historial)
}

/* --------------------------------------------------------------------------
   OBTENER COMENTARIOS DE UN USUARIO
   El admin puede revisar el historial de comentarios de un usuario
   -------------------------------------------------------------------------- */
export const obtenerComentariosPorUsuario = async (req: Request, res: Response) => {
  const comentarios = await rbacService.obtenerComentariosPorUsuarioService(
    Number(req.params.id)
  )
  res.json(comentarios)
}

/* --------------------------------------------------------------------------
   OBTENER USUARIOS BANEADOS
   -------------------------------------------------------------------------- */
export const obtenerUsuariosBaneados = async (req: Request, res: Response) => {
  const usuarios = await rbacService.obtenerUsuariosBaneadosService()
  res.json(usuarios)
}

/* --------------------------------------------------------------------------
   BUSCAR USUARIO
   -------------------------------------------------------------------------- */
export const buscarUsuario = async (req: Request, res: Response) => {
  const { query } = req.query
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query de búsqueda requerida" })
  }
  const usuarios = await rbacService.buscarUsuarioService(query)
  res.json(usuarios)
}

/* --------------------------------------------------------------------------
   DESBANEAR USUARIO
   -------------------------------------------------------------------------- */
export const desbanearUsuario = async (req: Request, res: Response) => {
  await rbacService.desbanearUsuarioService(
    Number(req.params.id),
    req.user!.user_id
  )
  res.json({ message: "Usuario desbaneado correctamente" })
}

/* --------------------------------------------------------------------------
   AÑADIR STRIKE
   -------------------------------------------------------------------------- */
export const añadirStrike = async (req: Request, res: Response) => {
  const { tipo } = req.body
  const totalStrikes = await rbacService.añadirStrikeService(
    Number(req.params.id),
    tipo,
    req.user!.user_id
  )
  res.json({ 
    message: "Strike añadido correctamente",
    total_strikes: totalStrikes,
    bloqueado: totalStrikes >= 3
  })
}

/* --------------------------------------------------------------------------
   OBTENER STRIKES DE UN USUARIO
   -------------------------------------------------------------------------- */
export const obtenerStrikesUsuario = async (req: Request, res: Response) => {
  const strikes = await rbacService.obtenerStrikesUsuarioService(
    Number(req.params.id)
  )
  res.json(strikes)
}

/* --------------------------------------------------------------------------
   OBTENER REPORTES
   -------------------------------------------------------------------------- */
export const obtenerReportes = async (req: Request, res: Response) => {
  const reportes = await rbacService.obtenerReportesService()
  res.json(reportes)
}

/* --------------------------------------------------------------------------
   ACTUALIZAR REPORTE — resolver o rechazar con nota de moderación
   -------------------------------------------------------------------------- */
export const actualizarReporte = async (req: Request, res: Response) => {
  const { status, resolution_note, mensaje_personalizado } = req.body
  const reporte = await rbacService.actualizarReporteService(
    Number(req.params.id),
    status,
    resolution_note ?? "",
    req.user!.user_id,
    mensaje_personalizado   // ← nuevo
  )
  res.json(reporte)
}

/* --------------------------------------------------------------------------
   ACTIVIDAD DE USUARIOS
   Acepta userId y limit como query params opcionales
   Ejemplos:
     GET /api/rbac/users/activity/feed
     GET /api/rbac/users/activity/feed?userId=7
     GET /api/rbac/users/activity/feed?userId=7&limit=20
   -------------------------------------------------------------------------- */
export const obtenerActividadUsuariosFeed = async (req: Request, res: Response) => {
  const userId = req.query.userId ? Number(req.query.userId) : undefined
  const limit  = req.query.limit  ? Number(req.query.limit)  : 50
  const feed   = await rbacService.obtenerActividadUsuariosService(userId, limit)
  res.json(feed)
}

/* --------------------------------------------------------------------------
   PERFIL COMPLETO DE USUARIO
   GET /api/rbac/users/:id/profile
   -------------------------------------------------------------------------- */
export const obtenerPerfilUsuario = async (req: Request, res: Response) => {
  const perfil = await rbacService.obtenerPerfilUsuarioService(
    Number(req.params.id)
  )
  if (!perfil) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Usuario no encontrado" } })
  }
  res.json(perfil)
}

/* --------------------------------------------------------------------------
   SESIONES DE UN USUARIO
   -------------------------------------------------------------------------- */
export const obtenerSesionesUsuario = async (req: Request, res: Response) => {
  const sesiones = await rbacService.obtenerSesionesUsuarioService(
    Number(req.params.id)
  )
  res.json(sesiones)
}

/* --------------------------------------------------------------------------
   INVALIDAR SESIÓN
   -------------------------------------------------------------------------- */
export const invalidarSesion = async (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId)
  await rbacService.invalidarSesionService(
    sessionId,
    req.user!.user_id,
    Number(req.params.id)
  )
  res.json({ message: "Sesión invalidada correctamente" })
}