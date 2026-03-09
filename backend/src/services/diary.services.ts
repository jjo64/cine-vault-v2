import { diaryRepository } from "../repositories/DiaryRepository.js"
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../errors/AppErrors.js"
import type { CrearEntradaDiarioDTO } from "../schemas/diary.js"
import { getCache, invalidateKeys, setCache } from "../lib/cache.js"
import { ensureMovieRefId } from "./movieRef.services.js"

/* ==========================================================================
   DIARY SERVICE
   --------------------------------------------------------------------------
   Lógica de negocio del diario de visionado.
   ========================================================================== */

export const obtenerDiarioService = async (userId: number) => {
  const cacheKey = diarioCacheKey(userId)
  const cached =
    await getCache<
      Awaited<ReturnType<typeof diaryRepository.buildRichResponse>>
    >(cacheKey)
  if (cached) return cached

  const diario = await diaryRepository.buildRichResponse(userId)
  if (!diario) throw new NotFoundError("No se encontraron entradas de diario")

  await setCache(cacheKey, diario)
  return diario
}

export const crearEntradaDiarioService = (
  userId: number,
  data: CrearEntradaDiarioDTO
) => crearDiarioUnicoPorDia(userId, data)

const normalizarFecha = (iso?: string) => {
  if (!iso) return new Date(new Date().toDateString())
  return new Date(iso)
}

const crearDiarioUnicoPorDia = async (
  userId: number,
  data: CrearEntradaDiarioDTO
) => {
  const movieId = await ensureMovieRefId(data.movie_id)
  const watchedDate = normalizarFecha(data.watched_date)
  const existente = await diaryRepository.findByUserMovieDate(
    userId,
    movieId,
    watchedDate
  )
  if (existente)
    throw new ConflictError("Ya registraste esta película en ese día")

  const entry = await diaryRepository.create(userId, {
    ...data,
    movie_id: movieId,
    watched_date: watchedDate.toISOString().slice(0, 10),
  })
  await invalidateCacheForDiary(userId, movieId)
  return entry
}

export const eliminarEntradaDiarioService = async (
  userId: number,
  entradaId: number
) => {
  const entrada = await diaryRepository.findById(entradaId)
  if (!entrada) throw new NotFoundError("Entrada no encontrada")
  if (entrada.user_id !== userId)
    throw new ForbiddenError("No tienes permiso para eliminar esta entrada")
  await invalidateCacheForDiary(userId, entrada.movie_id)
  await diaryRepository.delete(entradaId)
}

const diarioCacheKey = (userId: number) => `diary:feed:${userId}`
const movieAggregateKey = (movieId: number) => `movie:agg:${movieId}`

const invalidateCacheForDiary = async (userId: number, movieId: number) => {
  await invalidateKeys([diarioCacheKey(userId), movieAggregateKey(movieId)])
}
