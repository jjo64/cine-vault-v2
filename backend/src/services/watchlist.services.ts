import { watchlistRepository } from "../repositories/WatchlistRepository.js"
import { ConflictError } from "../errors/AppErrors.js"
import { ensureMovieRefId, findMovieRefIdByCandidate } from "./movieRef.services.js"
import type {
  AgregarWatchlistDTO,
  EliminarWatchlistDTO,
} from "../schemas/watchlist.js"

/* ==========================================================================
   WATCHLIST SERVICE
   --------------------------------------------------------------------------
   Lógica de negocio de la lista de seguimiento.
   ========================================================================== */

export const obtenerWatchlistService = (userId: number) =>
  watchlistRepository.buildRichResponse(userId)

export const agregarAWatchlistService = async (
  userId: number,
  data: AgregarWatchlistDTO
) => {
  const movieId = await ensureMovieRefId(data.movie_id)
  const yaExiste = await watchlistRepository.exists(userId, movieId)
  if (yaExiste)
    throw new ConflictError(
      `La película ${data.movie_id} ya está en tu watchlist`
    )
  return watchlistRepository.create(userId, movieId)
}

export const eliminarDeWatchlistService = (
  userId: number,
  data: EliminarWatchlistDTO
) =>
  findMovieRefIdByCandidate(data.movie_id).then((resolvedMovieId) => {
    if (!resolvedMovieId) return
    return watchlistRepository.deleteByMovieId(userId, resolvedMovieId)
  })
