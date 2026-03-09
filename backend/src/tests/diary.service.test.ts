import { describe, it, expect, vi, beforeEach } from "vitest"
import { NotFoundError } from "../errors/AppErrors.js"

/* ==========================================================================
   UNIT TESTS — diary.services
   Se mockea el DiaryRepository para aislar la lógica de negocio pura.
   ========================================================================== */

vi.mock("../repositories/DiaryRepository.js", () => ({
  diaryRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
    buildRichResponse: vi.fn(),
    findByUserMovieDate: vi.fn(),
  },
}))

// Importar DESPUÉS del mock
const { diaryRepository } = await import("../repositories/DiaryRepository.js")
const {
  obtenerDiarioService,
  crearEntradaDiarioService,
  eliminarEntradaDiarioService,
} = await import("../services/diary.services.js")

beforeEach(() => {
  vi.clearAllMocks()
})

describe("obtenerDiarioService", () => {
  it("lanza NotFoundError si el diario está vacío", async () => {
    vi.mocked(diaryRepository.buildRichResponse).mockResolvedValue(null as any)
    await expect(obtenerDiarioService(1)).rejects.toThrow(NotFoundError)
  })

  it("devuelve el diario enriquecido si hay entradas", async () => {
    const ricas = [
      { id: 1, movie_info: { title: "El club de la lucha" } },
    ] as any
    vi.mocked(diaryRepository.buildRichResponse).mockResolvedValue(ricas)

    const resultado = await obtenerDiarioService(1)
    expect(resultado).toEqual(ricas)
    expect(diaryRepository.buildRichResponse).toHaveBeenCalledWith(1)
  })
})

describe("crearEntradaDiarioService", () => {
  it("crea y devuelve la entrada del diario", async () => {
    const entrada = {
      id: 1,
      user_id: 1,
      movie_id: 2,
      watched_date: new Date(),
    } as any
    vi.mocked(diaryRepository.create).mockResolvedValue(entrada)

    const resultado = await crearEntradaDiarioService(1, {
      movie_id: 2,
      watched_date: "2026-01-01",
    })
    expect(resultado).toEqual(entrada)
  })
})

describe("eliminarEntradaDiarioService", () => {
  it("elimina la entrada si el usuario es el propietario", async () => {
    const entrada = { id: 5, user_id: 1 } as any
    vi.mocked(diaryRepository.findById).mockResolvedValue(entrada)
    vi.mocked(diaryRepository.delete).mockResolvedValue(entrada)

    await expect(eliminarEntradaDiarioService(1, 5)).resolves.not.toThrow()
    expect(diaryRepository.delete).toHaveBeenCalledWith(5)
  })

  it("lanza NotFoundError si la entrada no existe", async () => {
    vi.mocked(diaryRepository.findById).mockResolvedValue(null)
    await expect(eliminarEntradaDiarioService(1, 99)).rejects.toThrow(
      NotFoundError
    )
  })

  it("lanza ForbiddenError si el usuario no es el propietario", async () => {
    const { ForbiddenError } = await import("../errors/AppErrors.js")
    vi.mocked(diaryRepository.findById).mockResolvedValue({
      id: 5,
      user_id: 99,
    } as any)
    await expect(eliminarEntradaDiarioService(1, 5)).rejects.toThrow(
      ForbiddenError
    )
  })
})
