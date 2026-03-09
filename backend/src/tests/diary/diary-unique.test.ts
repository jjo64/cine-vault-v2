import { describe, it, expect, vi, beforeEach } from "vitest"
import { crearEntradaDiarioService } from "../../services/diary.services.js"
import { diaryRepository } from "../../repositories/DiaryRepository.js"

vi.mock("../../repositories/DiaryRepository.js", () => ({
  diaryRepository: {
    findByUserMovieDate: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: 1 }),
  },
}))

describe("diary unique per day", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("crea cuando no hay duplicado", async () => {
    diaryRepository.findByUserMovieDate.mockResolvedValue(null)
    const result = await crearEntradaDiarioService(1, { movie_id: 10 })
    expect(result).toEqual({ id: 1 })
    expect(diaryRepository.create).toHaveBeenCalled()
  })

  it("lanza conflicto si ya existe mismo día", async () => {
    diaryRepository.findByUserMovieDate.mockResolvedValue({ id: 99 })
    await expect(
      crearEntradaDiarioService(1, { movie_id: 10, watched_date: "2026-03-05" })
    ).rejects.toThrow("Ya registraste esta película en ese día")
  })
})
