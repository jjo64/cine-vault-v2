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
  await rbacService.banearUsuarioService(
    Number(req.params.id),
    req.user!.user_id  // ← ID del admin que ejecuta la acción
  )
  res.json({ message: "Usuario baneado permanentemente" })
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