import { describe, it, expect, vi, beforeEach } from "vitest"

const invalidateKeys = vi.hoisted(() => vi.fn())
const getCache = vi.hoisted(() => vi.fn())
const setCache = vi.hoisted(() => vi.fn())

vi.mock("../../lib/cache.js", () => ({
  invalidateKeys,
  getCache,
  setCache,
}))

const reviewsRepositoryMock = vi.hoisted(() => ({
  findByUserAndMovie: vi.fn(),
  create: vi.fn(),
  aggregateByMovie: vi.fn(),
  findByMovieId: vi.fn(),
}))

vi.mock("../../repositories/ReviewsRepository.js", () => ({
  reviewsRepository: reviewsRepositoryMock,
}))

const diaryRepositoryMock = vi.hoisted(() => ({
  countByMovie: vi.fn(),
  findByUserMovieDate: vi.fn(),
  create: vi.fn(),
  buildRichResponse: vi.fn(),
  findById: vi.fn(),
  delete: vi.fn(),
}))

vi.mock("../../repositories/DiaryRepository.js", () => ({
  diaryRepository: diaryRepositoryMock,
}))

// Import después de mockear dependencias
import {
  crearResenaService,
  obtenerAgregadoPeliculaService,
} from "../../services/reviews.services.js"
import { crearEntradaDiarioService } from "../../services/diary.services.js"

const movieId = 42
const userId = 7

describe("Cache de agregados de película", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCache.mockResolvedValue(null)
    reviewsRepositoryMock.aggregateByMovie.mockResolvedValue({
      movie_id: movieId,
      review_count: 2,
      avg_rating: 4.5,
      likes_total: 3,
    })
    diaryRepositoryMock.countByMovie.mockResolvedValue(1)
  })

  it("setea movie:agg en la primera consulta y reutiliza caché en la siguiente", async () => {
    setCache.mockResolvedValue(undefined)
    getCache.mockResolvedValueOnce(null).mockResolvedValueOnce({
      movie_id: movieId,
      reviews_count: 2,
      avg_rating: 4.5,
      likes_total: 3,
      diary_entries: 1,
    })

    const aggregate = await obtenerAgregadoPeliculaService(movieId)
    expect(aggregate).toEqual({
      movie_id: movieId,
      reviews_count: 2,
      avg_rating: 4.5,
      likes_total: 3,
      diary_entries: 1,
    })
    expect(setCache).toHaveBeenCalledWith(`movie:agg:${movieId}`, aggregate)

    await obtenerAgregadoPeliculaService(movieId)
    expect(reviewsRepositoryMock.aggregateByMovie).toHaveBeenCalledTimes(1)
  })
})

describe("Invalidación de caché en mutaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCache.mockResolvedValue(null)
  })

  it("invalidates reviews y agregados al crear reseña", async () => {
    reviewsRepositoryMock.findByUserAndMovie.mockResolvedValue(null)
    reviewsRepositoryMock.create.mockResolvedValue({ id: 1, movie_id: movieId })

    await crearResenaService(userId, {
      movie_id: movieId,
      content: "Excelente",
      rating: 4.5,
    })

    expect(invalidateKeys).toHaveBeenCalledWith([
      `reviews:movie:${movieId}`,
      `movie:agg:${movieId}`,
    ])
  })

  it("invalidates diario y agregados al crear entrada", async () => {
    diaryRepositoryMock.findByUserMovieDate.mockResolvedValue(null)
    diaryRepositoryMock.create.mockResolvedValue({
      id: 99,
      user_id: userId,
      movie_id: movieId,
      watched_date: new Date("2024-01-01"),
    })

    await crearEntradaDiarioService(userId, {
      movie_id: movieId,
      watched_date: "2024-01-01",
    })

    expect(invalidateKeys).toHaveBeenCalledWith([
      `diary:feed:${userId}`,
      `movie:agg:${movieId}`,
    ])
  })
})
