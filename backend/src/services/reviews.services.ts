import { reviewsRepository } from "../repositories/ReviewsRepository.js"
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "../errors/AppErrors.js"
import { invalidateKeys, getCache, setCache } from "../lib/cache.js"
import { diaryRepository } from "../repositories/DiaryRepository.js"
import type {
  CrearResenaDTO,
  ActualizarResenaDTO,
  ReportarResenaDTO,
  CrearComentarioDTO,
  ActualizarComentarioDTO,
} from "../schemas/reviews.js"
import { ensureMovieRefId, findMovieRefIdByCandidate } from "./movieRef.services.js"
import { verificarContenido } from "./content.services.js"
import { rbacService } from "./rbac.services.js"
import { ContentModerationError } from "../errors/AppErrors.js"

/* ==========================================================================
   REVIEWS SERVICE
   --------------------------------------------------------------------------
   Contiene TODA la lógica de negocio de reseñas, likes, comentarios y
   reportes. Los controladores solo llaman estas funciones y devuelven res.
   Si algo falla, se lanza un AppError que el manejadorErrores captura.
   ========================================================================== */

// ---------------------------------------------------------------------------
// RESEÑAS
// ---------------------------------------------------------------------------

export const obtenerResenasPorUsuarioService = async (userId: number) => {
  const rows = await reviewsRepository.findByUserId(userId)
  return rows.map((row) => ({
    ...row,
    tmdb_id: row.movies_ref?.tmdb_id ?? null,
  }))
}

export const obtenerResenasPorPeliculaService = async (movieId: number) => {
  const resolvedMovieId = await findMovieRefIdByCandidate(movieId)
  if (!resolvedMovieId) return []

  const cacheKey = movieReviewsKey(resolvedMovieId)
  const cached =
    await getCache<Awaited<ReturnType<typeof reviewsRepository.findByMovieId>>>(
      cacheKey
    )
  if (cached) return cached

  const resenas = await reviewsRepository.findByMovieId(resolvedMovieId)
  await setCache(cacheKey, resenas)
  return resenas
}

export const crearResenaService = (userId: number, data: CrearResenaDTO) =>
  verificarYCrearResenaUnica(userId, data)

const verificarYCrearResenaUnica = async (
  userId: number,
  data: CrearResenaDTO
) => {
  const movieId = await ensureMovieRefId(data.movie_id)
  const existente = await reviewsRepository.findByUserAndMovie(userId, movieId)
  if (existente)
    throw new ConflictError("Ya tienes una reseña para esta película")

  // Moderación automática — analiza el contenido antes de guardarlo
  if (data.content) {
    try {
      await verificarContenido(data.content, userId)
    } catch (error) {
      if (error instanceof ContentModerationError) {
        const esGrave = error.categorias.some(c =>
          ["harassment", "sexual", "violence", "hate", "self-harm"].includes(c)
        )
        if (esGrave && userId) {
          await rbacService.banearUsuarioService(userId, 0)
          console.log(`[Moderación] Usuario ${userId} baneado automáticamente`)
        }
      }
      throw error
    }
  }

  const resena = await reviewsRepository.create(userId, {
    ...data,
    movie_id: movieId,
  })
  await invalidateResenaCache(movieId)
  return resena
}

export const actualizarResenaService = async (
  userId: number,
  reviewId: number,
  data: ActualizarResenaDTO
) => {
  const id = asegurarId(reviewId)
  const resena = await reviewsRepository.findById(reviewId)
  if (!resena) throw new NotFoundError("Reseña no encontrada")
  if (resena.user_id !== userId)
    throw new ForbiddenError("No tienes permiso para editar esta reseña")
  const updated = await reviewsRepository.update(id, data)
  await invalidateResenaCache(resena.movie_id)
  return updated
}

export const eliminarResenaService = async (
  userId: number,
  reviewId: number
) => {
  const id = asegurarId(reviewId)
  const resena = await reviewsRepository.findById(id)
  if (!resena) throw new NotFoundError("Reseña no encontrada")
  if (resena.user_id !== userId)
    throw new ForbiddenError("No tienes permiso para eliminar esta reseña")
  await reviewsRepository.delete(id)
  await invalidateResenaCache(resena.movie_id)
}

import { alertarAdmins } from "./socket.services.js"
import { rbacRepository } from "../repositories/RbacRepository.js"

export const reportarResenaService = async (
  userId: number,
  reviewId: number,
  data: ReportarResenaDTO
) => {
  const id = asegurarId(reviewId)
  const resena = await reviewsRepository.findById(id)
  if (!resena) throw new NotFoundError("Reseña no encontrada")

  const reporte = await reviewsRepository.createReport(userId, id, data.reason, data.reason_detail)

  // Obtener datos del usuario que reporta para enriquecer la alerta
  const reporter = await rbacRepository.obtenerDatosUsuarioModeracion(userId)

  // Determinar prioridad según el motivo
  const prioridad = ["acoso", "lenguaje_ofensivo", "contenido_inapropiado"].includes(data.reason)
    ? "alto"
    : "medio"

  // Emitir alerta en tiempo real a los admins
  alertarAdmins("nuevo_reporte", {
    reporteId: reporte.id,
    motivo: data.reason,
    motivoDetalle: data.reason_detail ?? null,
    reviewId: id,
    prioridad,
    timestamp: new Date().toISOString(),
    reporter: reporter ? {
      id: reporter.id,
      username: reporter.username,
      email: reporter.email,
      role: reporter.role,
      membership: reporter.membership,
    } : null,
  })

  return reporte
}

// ---------------------------------------------------------------------------
// AGREGADOS
// ---------------------------------------------------------------------------

export const obtenerAgregadoPeliculaService = async (movieId: number) => {
  const cacheKey = movieAggregateKey(movieId)
  const cached = await getCache<MovieAggregate>(cacheKey)
  if (cached) return cached

  const aggregate = await buildMovieAggregate(movieId)
  await setCache(cacheKey, aggregate)
  return aggregate
}

// ---------------------------------------------------------------------------
// LIKES
// ---------------------------------------------------------------------------

export const darLikeResenaService = async (
  userId: number,
  reviewId: number
) => {
  const id = asegurarId(reviewId)
  const likeExistente = await reviewsRepository.findLike(userId, id)
  if (likeExistente) throw new ConflictError("Ya has dado like a esta reseña")

  const { like, review } = await reviewsRepository.addLikeTransaction(
    userId,
    id
  )
  await invalidateResenaCache(review.movie_id)
  return { like, review }
}

export const quitarLikeResenaService = async (
  userId: number,
  reviewId: number
) => {
  const id = asegurarId(reviewId)
  const likeExistente = await reviewsRepository.findLike(userId, id)
  if (!likeExistente) throw new NotFoundError("No has dado like a esta reseña")
  const result = await reviewsRepository.removeLikeTransaction(userId, id)
  await invalidateResenaCache(result.review.movie_id)
  return result
}

// ---------------------------------------------------------------------------
// COMENTARIOS
// ---------------------------------------------------------------------------

export const obtenerComentariosService = (reviewId: number) =>
  reviewsRepository.findCommentsByReviewId(asegurarId(reviewId))

export const crearComentarioService = async (
  userId: number,
  reviewId: number,
  data: CrearComentarioDTO
) => {
  const id = asegurarId(reviewId)
  const resena = await reviewsRepository.findById(id)
  if (!resena) throw new NotFoundError("Reseña no encontrada")

  // Moderación automática — analiza el comentario antes de guardarlo
  try {
    await verificarContenido(data.content, userId)
  } catch (error) {
    if (error instanceof ContentModerationError) {
      const esGrave = error.categorias.some(c =>
        ["harassment", "sexual", "violence", "hate", "self-harm"].includes(c)
      )
      if (esGrave && userId) {
        await rbacService.banearUsuarioService(userId, 0)
        console.log(`[Moderación] Usuario ${userId} baneado automáticamente`)
      }
    }
    throw error
  }

  const comentario = await reviewsRepository.createComment(
    id,
    userId,
    data.content
  )
  return { comentario, review: resena }
}

export const actualizarComentarioService = async (
  userId: number,
  commentId: number,
  data: ActualizarComentarioDTO
) => {
  const comentario = await reviewsRepository.findCommentById(commentId)
  if (!comentario) throw new NotFoundError("Comentario no encontrado")
  if (comentario.user_id !== userId)
    throw new ForbiddenError("No tienes permiso para editar este comentario")
  return reviewsRepository.updateComment(commentId, data.content)
}

export const eliminarComentarioService = async (
  userId: number,
  commentId: number
) => {
  const comentario = await reviewsRepository.findCommentById(commentId)
  if (!comentario) throw new NotFoundError("Comentario no encontrado")
  if (comentario.user_id !== userId)
    throw new ForbiddenError("No tienes permiso para eliminar este comentario")
  await reviewsRepository.deleteComment(commentId)
}

const asegurarId = (id: number) => {
  if (!Number.isFinite(id)) throw new ValidationError("Id de reseña inválido")
  return id
}

const movieReviewsKey = (movieId: number) => `reviews:movie:${movieId}`
const movieAggregateKey = (movieId: number) => `movie:agg:${movieId}`

const invalidateResenaCache = async (movieId: number) => {
  await invalidateKeys([movieReviewsKey(movieId), movieAggregateKey(movieId)])
}

const buildMovieAggregate = async (
  movieId: number
): Promise<MovieAggregate> => {
  const [reviewsAggregate, diaryCount] = await Promise.all([
    reviewsRepository.aggregateByMovie(movieId),
    diaryRepository.countByMovie(movieId),
  ])

  return {
    movie_id: movieId,
    reviews_count: reviewsAggregate.review_count,
    avg_rating: reviewsAggregate.avg_rating,
    likes_total: reviewsAggregate.likes_total,
    diary_entries: diaryCount,
  }
}

type MovieAggregate = {
  movie_id: number
  reviews_count: number
  avg_rating: number | null
  likes_total: number
  diary_entries: number
}


