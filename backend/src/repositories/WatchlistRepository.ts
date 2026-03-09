import { watchlist } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { consultarTMDB } from "../helpers/fetchTMDB.js"

/* ==========================================================================
   WATCHLIST REPOSITORY
   --------------------------------------------------------------------------
   Encapsula queries de Prisma para la lista de seguimiento.
   Igual que DiaryRepository, consolida el enriquecimiento con TMDB
   (antes en WatchlistHelper.ts con try/catch silencioso).
   ========================================================================== */

/** Tipo enriquecido con metadatos de TMDB */
export interface RichWatchlistEntry {
  movie_id: number
  tmdb_id: number | null
  movie_info: { title: string; poster_path: string } | null
  added_at: Date | null
}

export interface IWatchlistRepository {
  findByUserId(userId: number): Promise<watchlist[]>
  exists(userId: number, movieId: number): Promise<boolean>
  create(userId: number, movieId: number): Promise<watchlist>
  deleteByMovieId(userId: number, movieId: number): Promise<void>
  buildRichResponse(userId: number): Promise<RichWatchlistEntry[]>
}

export class WatchlistRepository implements IWatchlistRepository {
  async findByUserId(userId: number) {
    return prisma.watchlist.findMany({
      where: { user_id: userId },
      orderBy: { id: "desc" },
    })
  }

  async exists(userId: number, movieId: number) {
    const item = await prisma.watchlist.findFirst({
      where: { user_id: userId, movie_id: movieId },
    })
    return item !== null
  }

  async create(userId: number, movieId: number) {
    return prisma.watchlist.create({
      data: { user_id: userId, movie_id: movieId },
    })
  }

  async deleteByMovieId(userId: number, movieId: number) {
    await prisma.watchlist.deleteMany({
      where: { user_id: userId, movie_id: movieId },
    })
  }

  /**
   * Construye la respuesta enriquecida de watchlist con datos de TMDB.
   * Mismo patrón que DiaryRepository.buildRichResponse.
   */
  async buildRichResponse(userId: number): Promise<RichWatchlistEntry[]> {
    const entries = await prisma.watchlist.findMany({
      where: { user_id: userId },
      select: { movie_id: true, added_at: true },
      orderBy: { added_at: 'desc' },
    })

    if (entries.length === 0) return []

    const movieIds = entries.map((e) => e.movie_id)

    const movies = await prisma.movies_ref.findMany({
      where: { id: { in: movieIds } },
      select: { id: true, tmdb_id: true },
    })

    const tmdbResults = await Promise.allSettled(
      movies.map((movie) =>
        consultarTMDB(`movie/${movie.tmdb_id}`).then((data: any) => ({
          title: data.title as string,
          poster_path: data.poster_path as string,
        }))
      )
    )

    const tmdbMap = new Map(
      movies.map((movie, index) => {
        const result = tmdbResults[index]
        return [movie.id, result.status === "fulfilled" ? result.value : null]
      })
    )
    const movieMap = new Map(movies.map((m) => [m.id, m.tmdb_id]))

    return entries.map((entry) => ({
      movie_id: entry.movie_id,
      tmdb_id: movieMap.get(entry.movie_id) ?? null,
      movie_info: tmdbMap.get(entry.movie_id) ?? null,
      added_at: entry.added_at,
    }))
  }
}

export const watchlistRepository = new WatchlistRepository()
