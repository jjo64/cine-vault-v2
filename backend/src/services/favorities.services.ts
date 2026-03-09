import { favoritiesRepository } from "../repositories/FavoritiesRepository.js"
import { NotFoundError } from "../errors/AppErrors.js"
import type { AgregarFavoritoDTO } from "../schemas/favorites.js"
import { ensureMovieRefId, findMovieRefIdByCandidate } from "./movieRef.services.js"

/* ==========================================================================
   FAVORITIES SERVICE
   --------------------------------------------------------------------------
   Lógica de negocio de favoritos.
   ========================================================================== */

export const obtenerFavoritosService = async (userId: number) => {
  const favoritos = await favoritiesRepository.findByUserId(userId)
  if (favoritos.length === 0) throw new NotFoundError("No tienes favoritos")
  return favoritos
}

export const obtenerFavoritosPorUsuarioService = async (userId: number) => {
  const favoritos = await favoritiesRepository.findByUserId(userId)
  if (favoritos.length === 0)
    throw new NotFoundError("Favoritos no encontrados")
  return favoritos
}

export const agregarFavoritoService = (
  userId: number,
  data: AgregarFavoritoDTO
) =>
  ensureMovieRefId(data.movieId).then((movieId) =>
    favoritiesRepository.create(userId, { ...data, movieId })
  )

export const eliminarFavoritoService = async (
  userId: number,
  movieId: number
) => {
  const resolvedMovieId = await findMovieRefIdByCandidate(movieId)
  if (!resolvedMovieId) throw new NotFoundError("Favorito no encontrado")

  const favorito = await favoritiesRepository.findFirst(userId, resolvedMovieId)
  if (!favorito) throw new NotFoundError("Favorito no encontrado")
  await favoritiesRepository.delete(favorito.id)
}
