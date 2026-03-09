import { diary_entries } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import type { CrearEntradaDiarioDTO } from "../schemas/diary.js"
import { consultarTMDB } from "../helpers/fetchTMDB.js"

/* ==========================================================================
   DIARY REPOSITORY
   --------------------------------------------------------------------------
   Encapsula todas las queries de Prisma para el diario de visionado.
   También contiene la lógica de enriquecimiento con datos TMDB, que antes
   estaba en el helper DiaryHelper.ts con un try/catch silencioso.

   ¿Por qué consolidar aquí y no en el helper?
   El helper necesitaba importar tanto Prisma como TMDB; consolidar todo en
   el repositorio elimina un intermediario y centraliza la persistencia.
   ========================================================================== */

export interface IDiaryRepository {
  findByUserId(userId: number): Promise<diary_entries[]>
  findById(id: number): Promise<diary_entries | null>
  create(userId: number, data: CrearEntradaDiarioDTO): Promise<diary_entries>
  delete(id: number): Promise<void>
  findByUserMovieDate(
    userId: number,
    movieId: number,
    watchedDate: Date
  ): Promise<diary_entries | null>
  countByMovie(movieId: number): Promise<number>
  buildRichResponse(userId: number): Promise<RichDiaryEntry[] | null>
}

/** Tipo enriquecido con metadatos de TMDB y reseña del usuario */
export interface RichDiaryEntry {
  movie_id: number
  watched_date: Date | null
  tmdb_id: number | null
  movie_info: { title: string; poster_path: string | null } | null
  review: {
    movie_id: number
    rating: unknown
    content: string | null
    created_at: Date
  } | null
}

export class DiaryRepository implements IDiaryRepository {
  async findByUserId(userId: number) {
    return prisma.diary_entries.findMany({
      where: { user_id: userId },
      orderBy: { watched_date: "desc" },
    })
  }

  async findById(id: number) {
    return prisma.diary_entries.findUnique({ where: { id } })
  }

  async create(userId: number, data: CrearEntradaDiarioDTO) {
    return prisma.diary_entries.create({
      data: {
        user_id: userId,
        movie_id: data.movie_id,
        ...(data.watched_date && { watched_date: new Date(data.watched_date) }),
      },
    })
  }

  async findByUserMovieDate(
    userId: number,
    movieId: number,
    watchedDate: Date
  ) {
    return prisma.diary_entries.findFirst({
      where: {
        user_id: userId,
        movie_id: movieId,
        watched_date: watchedDate,
      },
    })
  }

  async delete(id: number) {
    await prisma.diary_entries.delete({ where: { id } })
  }

  async countByMovie(movieId: number) {
    return prisma.diary_entries.count({ where: { movie_id: movieId } })
  }

  /**
   * Construye la respuesta enriquecida del diario:
   * entradas + metadatos de película (TMDB) + reseña del usuario.
   * Usa Promise.allSettled para que un fallo de TMDB no derribe toda la respuesta.
   */
  async buildRichResponse(userId: number): Promise<RichDiaryEntry[] | null> {
    const entries = await prisma.diary_entries.findMany({
      where: { user_id: userId },
      select: { movie_id: true, watched_date: true },
      orderBy: { watched_date: "desc" },
    })

    if (entries.length === 0) return null

    const movieIds = entries.map((d) => d.movie_id)

    const [movies, reviews] = await Promise.all([
      prisma.movies_ref.findMany({
        where: { id: { in: movieIds } },
        select: { id: true, tmdb_id: true },
      }),
      prisma.reviews.findMany({
        where: { user_id: userId, movie_id: { in: movieIds } },
        orderBy: { created_at: "desc" },
        select: {
          movie_id: true,
          rating: true,
          content: true,
          created_at: true,
        },
      }),
    ])

    type TmdbMovie = { title: string; poster_path: string | null }
    const tmdbResults = await Promise.allSettled(
      movies.map((movie) =>
        movie.tmdb_id
          ? consultarTMDB(`movie/${movie.tmdb_id}`).then((data) => {
              const movieData = data as TmdbMovie
              return {
                title: movieData.title,
                poster_path: movieData.poster_path,
              }
            })
          : Promise.resolve(null)
      )
    )

    const tmdbMap = new Map(
      movies.map((movie, index) => {
        const result = tmdbResults[index]
        return [movie.id, result.status === "fulfilled" ? result.value : null]
      })
    )
    const movieMap = new Map(movies.map((m) => [m.id, m.tmdb_id]))
    // Keep only the latest review per movie.
    const reviewMap = new Map<number, (typeof reviews)[number]>()
    for (const review of reviews) {
      if (!reviewMap.has(review.movie_id)) {
        reviewMap.set(review.movie_id, review)
      }
    }

    return entries.map((entry) => ({
      movie_id: entry.movie_id,
      watched_date: entry.watched_date,
      tmdb_id: movieMap.get(entry.movie_id) ?? null,
      movie_info: tmdbMap.get(entry.movie_id) ?? null,
      review: reviewMap.get(entry.movie_id) ?? null,
    }))
  }
}

export const diaryRepository = new DiaryRepository()
