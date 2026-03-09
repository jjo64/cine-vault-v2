import { describe, it, expect, vi, beforeEach } from "vitest"
import { ConflictError } from "../errors/AppErrors.js"

/* ==========================================================================
   UNIT TESTS — watchlist.services
   Se mockea el WatchlistRepository para aislar la lógica de negocio pura.
   ========================================================================== */

vi.mock("../repositories/WatchlistRepository.js", () => ({
  watchlistRepository: {
    findByUserId: vi.fn(),
    exists: vi.fn(),
    create: vi.fn(),
    deleteByMovieId: vi.fn(),
    buildRichResponse: vi.fn(),
  },
}))

const { watchlistRepository } =
  await import("../repositories/WatchlistRepository.js")
const {
  obtenerWatchlistService,
  agregarAWatchlistService,
  eliminarDeWatchlistService,
} = await import("../services/watchlist.services.js")

beforeEach(() => {
  vi.clearAllMocks()
})

describe("obtenerWatchlistService", () => {
  it("devuelve la watchlist enriquecida del usuario", async () => {
    const entradas = [{ id: 1, user_id: 1, movie_id: 10 }] as any
    const ricas = [{ id: 1, movie_info: { title: "Inception" } }] as any
    vi.mocked(watchlistRepository.findByUserId).mockResolvedValue(entradas)
    vi.mocked(watchlistRepository.buildRichResponse).mockResolvedValue(ricas)

    const resultado = await obtenerWatchlistService(1)
    expect(resultado).toEqual(ricas)
  })
})

describe("agregarAWatchlistService", () => {
  it("añade la película si no existe en la watchlist", async () => {
    const item = { id: 1, user_id: 1, movie_id: 10 } as any
    vi.mocked(watchlistRepository.exists).mockResolvedValue(false)
    vi.mocked(watchlistRepository.create).mockResolvedValue(item)

    const resultado = await agregarAWatchlistService(1, { movie_id: 10 })
    expect(resultado).toEqual(item)
    expect(watchlistRepository.create).toHaveBeenCalledWith(1, 10)
  })

  it("lanza ConflictError si la película ya está en la watchlist", async () => {
    vi.mocked(watchlistRepository.exists).mockResolvedValue(true)
    await expect(agregarAWatchlistService(1, { movie_id: 10 })).rejects.toThrow(
      ConflictError
    )
    expect(watchlistRepository.create).not.toHaveBeenCalled()
  })
})

describe("eliminarDeWatchlistService", () => {
  it("elimina la película de la watchlist del usuario", async () => {
    vi.mocked(watchlistRepository.deleteByMovieId).mockResolvedValue(undefined)
    await expect(
      eliminarDeWatchlistService(1, { movie_id: 10 })
    ).resolves.not.toThrow()
    expect(watchlistRepository.deleteByMovieId).toHaveBeenCalledWith(1, 10)
  })
})
