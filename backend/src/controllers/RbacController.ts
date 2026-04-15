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
  await rbacService.banearUsuarioService(Number(req.params.id))
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
    contenidoOfensivo
  )
  res.json({ message: "Warning enviado correctamente" })
}