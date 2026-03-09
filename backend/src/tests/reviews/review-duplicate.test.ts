import { describe, it, expect, vi, beforeEach } from "vitest"
import { crearResenaService } from "../../services/reviews.services.js"
import { ConflictError } from "../../errors/AppErrors.js"
import { reviewsRepository } from "../../repositories/ReviewsRepository.js"

vi.mock("../../repositories/ReviewsRepository.js", () => ({
  reviewsRepository: {
    findByUserAndMovie: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: 1 }),
  },
}))

describe("crearResenaService unicidad user+movie", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("crea si no existe previa", async () => {
    reviewsRepository.findByUserAndMovie.mockResolvedValue(null)
    const res = await crearResenaService(1, {
      movie_id: 10,
      content: "ok",
      rating: 4,
    })
    expect(res).toEqual({ id: 1 })
    expect(reviewsRepository.create).toHaveBeenCalled()
  })

  it("lanza ConflictError si ya existe", async () => {
    reviewsRepository.findByUserAndMovie.mockResolvedValue({ id: 99 })
    await expect(
      crearResenaService(1, { movie_id: 10, content: "dup", rating: 4 })
    ).rejects.toThrow(ConflictError)
  })
})
