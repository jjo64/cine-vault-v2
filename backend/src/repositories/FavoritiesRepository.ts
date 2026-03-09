import { favorites } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import type { AgregarFavoritoDTO } from "../schemas/favorites.js"

/* ==========================================================================
   FAVORITIES REPOSITORY
   --------------------------------------------------------------------------
   Encapsula queries de Prisma para la tabla favorites.
   Nota: el nombre del módulo mantiene la convención de la carpeta existente
   ("favorities") para consistencia con el resto del proyecto.
   ========================================================================== */

export interface IFavoritiesRepository {
  findByUserId(
    userId: number
  ): Promise<
    Array<{ movie_id: number; rank_position: number | null; tmdb_id: number | null }>
  >
  findFirst(userId: number, movieId: number): Promise<favorites | null>
  create(userId: number, data: AgregarFavoritoDTO): Promise<favorites>
  delete(id: number): Promise<void>
}

export class FavoritiesRepository implements IFavoritiesRepository {
  async findByUserId(userId: number) {
    const rows = await prisma.favorites.findMany({
      where: { user_id: userId },
      select: {
        movie_id: true,
        rank_position: true,
        movies_ref: {
          select: { tmdb_id: true },
        },
      },
    })

    return rows.map((row) => ({
      movie_id: row.movie_id,
      rank_position: row.rank_position,
      tmdb_id: row.movies_ref?.tmdb_id ?? null,
    }))
  }

  async findFirst(userId: number, movieId: number) {
    return prisma.favorites.findFirst({
      where: { user_id: userId, movie_id: movieId },
    })
  }

  async create(userId: number, data: AgregarFavoritoDTO) {
    return prisma.favorites.create({
      data: {
        user_id: userId,
        movie_id: data.movieId,
        rank_position: data.rank_position ?? null,
      },
    })
  }

  async delete(id: number) {
    await prisma.favorites.delete({ where: { id } })
  }
}

export const favoritiesRepository = new FavoritiesRepository()
