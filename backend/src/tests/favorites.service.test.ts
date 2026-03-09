import { describe, it, expect, vi, beforeEach } from "vitest"
import { NotFoundError } from "../errors/AppErrors.js"

/* ==========================================================================
   UNIT TESTS — favorities.services
   Se mockea el FavoritiesRepository para aislar la lógica de negocio pura.
   ========================================================================== */

vi.mock("../repositories/FavoritiesRepository.js", () => ({
  favoritiesRepository: {
    findByUserId: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}))

const { favoritiesRepository } =
  await import("../repositories/FavoritiesRepository.js")
const {
  obtenerFavoritosService,
  agregarFavoritoService,
  eliminarFavoritoService,
} = await import("../services/favorities.services.js")

beforeEach(() => {
  vi.clearAllMocks()
})

describe("obtenerFavoritosService", () => {
  it("lanza NotFoundError si el usuario no tiene favoritos", async () => {
    vi.mocked(favoritiesRepository.findByUserId).mockResolvedValue([])
    await expect(obtenerFavoritosService(1)).rejects.toThrow(NotFoundError)
  })

  it("devuelve la lista de favoritos si existen", async () => {
    const favoritos = [{ id: 1, user_id: 1, movie_id: 10 }] as any
    vi.mocked(favoritiesRepository.findByUserId).mockResolvedValue(favoritos)
    const resultado = await obtenerFavoritosService(1)
    expect(resultado).toEqual(favoritos)
  })
})

describe("agregarFavoritoService", () => {
  it("crea y devuelve el favorito", async () => {
    const favorito = { id: 1, user_id: 1, movie_id: 10 } as any
    vi.mocked(favoritiesRepository.create).mockResolvedValue(favorito)

    const resultado = await agregarFavoritoService(1, { movieId: 10 })
    expect(resultado).toEqual(favorito)
    expect(favoritiesRepository.create).toHaveBeenCalledWith(1, { movieId: 10 })
  })
})

describe("eliminarFavoritoService", () => {
  it("elimina el favorito si existe", async () => {
    vi.mocked(favoritiesRepository.findFirst).mockResolvedValue({
      id: 5,
    } as any)
    vi.mocked(favoritiesRepository.delete).mockResolvedValue(undefined as any)

    await expect(eliminarFavoritoService(1, 10)).resolves.not.toThrow()
    expect(favoritiesRepository.delete).toHaveBeenCalledWith(5)
  })

  it("lanza NotFoundError si el favorito no existe", async () => {
    vi.mocked(favoritiesRepository.findFirst).mockResolvedValue(null)
    await expect(eliminarFavoritoService(1, 99)).rejects.toThrow(NotFoundError)
  })
})
