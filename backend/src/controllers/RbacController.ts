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
   BORRAR COMENTARIO AJENO
   Extrae el id del comentario del request y llama al servicio
   -------------------------------------------------------------------------- */
export const borrarComentario = async (req: Request, res: Response) => {
  await rbacService.borrarComentarioService(Number(req.params.id))
  res.json({ message: "Comentario eliminado correctamente" })
}