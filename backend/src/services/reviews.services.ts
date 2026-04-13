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

const verificarYCrearResenaUnica = async (userId: number, data: CrearResenaDTO) => {
  const movieId = await ensureMovieRefId(data.movie_id)
  const existente = await reviewsRepository.findByUserAndMovie(userId,movieId)
  if (existente)
    throw new ConflictError("Ya tienes una reseña para esta película")

    // Moderación automática — analiza el contenido antes de guardarlo
  if (data.content) await verificarContenido(data.content)

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

/*export — hace que esta función esté disponible para otros archivos. Sin esto, solo existiría dentro de este archivo.
  const eliminarResenaService — el nombre de la función
  async — tiene operaciones lentas dentro, usará await
  (userId: number, reviewId: number) — recibe dos datos: el ID del usuario y el ID de la reseña. El : number es TypeScript diciéndole que ambos tienen que ser números.
  => { — aquí empieza el cuerpo de la función*/
export const eliminarResenaService = async (
  userId: number,
  reviewId: number
) => {
  //Llama a una función auxiliar que comprueba que reviewId es un número válido. Si no lo es, lanza un error antes de consultar la BD.
  const id = asegurarId(reviewId)
  //Le pregunta a la base de datos: "¿existe una reseña con este ID?". El await espera la respuesta antes de continuar.
  const resena = await reviewsRepository.findById(id)
  //Si la reseña no existe — !resena significa "si resena está vacío" — lanza un error 404. El throw para la ejecución ahí mismo.
  if (!resena) throw new NotFoundError("Reseña no encontrada")
  //Compara quién es el dueño de la reseña con quién está intentando borrarla. Si no coinciden, lanza un error 403.  
  if (resena.user_id !== userId) throw new ForbiddenError("No tienes permiso para eliminar esta reseña")
  //Si ha pasado todos los controles, borra la reseña de la BD. 
  await reviewsRepository.delete(id)
  //Limpia la caché de Redis para esa película. Si no lo hiciera, alguien podría seguir viendo la reseña borrada durante 2 minutos hasta que la caché expire sola.
  await invalidateResenaCache(resena.movie_id)
}

export const reportarResenaService = async (
  userId: number,
  reviewId: number,
  data: ReportarResenaDTO
) => {
  const id = asegurarId(reviewId)
  const resena = await reviewsRepository.findById(id)
  if (!resena) throw new NotFoundError("Reseña no encontrada")
  return reviewsRepository.createReport(userId, id, data.reason)
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
  await verificarContenido(data.content)

  const comentario = await reviewsRepository.createComment(id,userId,data.content)
  // Devolvemos la review (para que el caller pueda emitir notificación)
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
