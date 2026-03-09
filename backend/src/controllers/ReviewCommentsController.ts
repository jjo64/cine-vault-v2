import { Request, Response } from "express"
import * as reviewsService from "../services/reviews.services.js"
import { emitirNotificacionService } from "../services/notifications.services.js"
import type { SolicitudAutenticada } from "../middlewares/auth.middlewares.js"
import { checkIPSpike } from "../services/security.services.js"
import { TooManyRequestsError } from "../errors/AppErrors.js"

/* ==========================================================================
   CONTROLADOR DE COMENTARIOS EN RESEÑAS
   --------------------------------------------------------------------------
   Responsabilidad ÚNICA: extraer datos del request, llamar al servicio,
   devolver res. Sin Prisma ni lógica de negocio directa.
   ========================================================================== */

export const getCommentsByReviewId = async (req: Request, res: Response) => {
  const comentarios = await reviewsService.obtenerComentariosService(
    Number(req.params.reviewId)
  )
  res.json(comentarios)
}

export const addComment = async (req: SolicitudAutenticada, res: Response) => {
  await assertNotRateLimited(req.ip!)
  const userId = req.user!.user_id
  const reviewId = Number(req.params.reviewId)

  const { comentario, review } = await reviewsService.crearComentarioService(
    userId,
    reviewId,
    req.body
  )

  if (review.user_id !== userId) {
    await emitirNotificacionService({
      user_id: review.user_id,
      sender_id: userId,
      type: "comment",
    })
  }

  res.status(201).json(comentario)
}

export const removeComment = async (
  req: SolicitudAutenticada,
  res: Response
) => {
  await assertNotRateLimited(req.ip!)
  await reviewsService.eliminarComentarioService(
    req.user!.user_id,
    Number(req.params.commentId)
  )
  res.json({ message: "Comentario eliminado correctamente" })
}

export const updateComment = async (
  req: SolicitudAutenticada,
  res: Response
) => {
  await assertNotRateLimited(req.ip!)
  const comentario = await reviewsService.actualizarComentarioService(
    req.user!.user_id,
    Number(req.params.commentId),
    req.body
  )
  res.json(comentario)
}

const assertNotRateLimited = async (ip: string) => {
  if (await checkIPSpike(ip)) {
    throw new TooManyRequestsError(
      "Demasiadas acciones, intenta en unos segundos"
    )
  }
}
