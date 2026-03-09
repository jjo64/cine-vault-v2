import { Router, Request, Response } from "express"
import { consultarTMDB } from "../helpers/fetchTMDB.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"
import { getOSet } from "../config/redis.js"

/**
 * @swagger
 * tags:
 *   name: Películas
 *   description: Consulta de películas desde TMDB con caché Redis
 */

const router = Router()

// TTLs específicos para datos de TMDB
const TTL = {
  listas: 60 * 60, // 1 hora — upcoming, top-rated, popular
  detalle: 60 * 60 * 6, // 6 horas — detalle de película (datos estáticos)
}

/**
 * @swagger
 * /movies/upcoming:
 *   get:
 *     summary: Próximos estrenos
 *     tags: [Películas]
 *     responses:
 *       200:
 *         description: Lista de próximos estrenos
 */
router.get(
  "/upcoming",
  manejadorAsincrono(async (req: Request, res: Response) => {
    const data = await getOSet(
      "tmdb:movies:upcoming",
      () => consultarTMDB("movie/upcoming", { region: "es" }),
      TTL.listas
    )
    res.status(200).json(data)
  })
)

/**
 * @swagger
 * /movies/top-rated:
 *   get:
 *     summary: Películas más valoradas
 *     tags: [Películas]
 *     responses:
 *       200:
 *         description: Lista de películas más valoradas
 */
router.get(
  "/top-rated",
  manejadorAsincrono(async (req: Request, res: Response) => {
    const data = await getOSet(
      "tmdb:movies:top-rated",
      () => consultarTMDB("movie/top_rated", { region: "es" }),
      TTL.listas
    )
    res.status(200).json(data)
  })
)

/**
 * @swagger
 * /movies/popular:
 *   get:
 *     summary: Películas populares
 *     tags: [Películas]
 *     responses:
 *       200:
 *         description: Lista de películas populares
 */
router.get(
  "/popular",
  manejadorAsincrono(async (req: Request, res: Response) => {
    const data = await getOSet(
      "tmdb:movies:popular",
      () => consultarTMDB("movie/popular", { region: "es" }),
      TTL.listas
    )
    res.status(200).json(data)
  })
)

/**
 * @swagger
 * /movies/{idOrSlug}:
 *   get:
 *     summary: Detalle completo de una película
 *     tags: [Películas]
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: ID numérico o slug de la película
 *     responses:
 *       200:
 *         description: Detalle de la película con créditos, proveedores e imágenes
 *       404:
 *         description: Película no encontrada
 */
router.get(
  "/:idOrSlug",
  manejadorAsincrono(async (req: Request, res: Response) => {
    const idOSlug = req.params.idOrSlug as string

    let idPelicula: number = parseInt(idOSlug)

    // Si no es número, resolver el slug a un ID primero
    if (isNaN(idPelicula)) {
      const nombreLimpio = idOSlug.replace(/-/g, " ")

      // Cachear también la resolución slug → id
      const datosBusqueda = (await getOSet(
        `tmdb:slug:${idOSlug}`,
        () => consultarTMDB("search/movie", { query: nombreLimpio }),
        TTL.detalle
      )) as { results: { id: number }[] }

      if (!datosBusqueda.results || datosBusqueda.results.length === 0) {
        return res
          .status(404)
          .json({ message: "Película no encontrada por slug" })
      }

      idPelicula = datosBusqueda.results[0].id
    }

    // Cachear el detalle completo (incluye credits, providers, etc.)
    const detalle = await getOSet(
      `tmdb:movie:${idPelicula}`,
      async () => {
        const [detalles, creditos, proveedores, titulos, imagenes] =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (await Promise.all([
            consultarTMDB(`movie/${idPelicula}`),
            consultarTMDB(`movie/${idPelicula}/credits`),
            consultarTMDB(`movie/${idPelicula}/watch/providers`, {
              language: "",
            }),
            consultarTMDB(`movie/${idPelicula}/alternative_titles`, {
              language: "",
            }),
            consultarTMDB(`movie/${idPelicula}/images`, {
              include_image_language: "en,null",
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ])) as [any, any, any, any, any]

        return {
          ...detalles,
          credits: {
            cast: creditos.cast || [],
            crew: creditos.crew || [],
          },
          watch_providers: proveedores.results || {},
          alternative_titles: titulos.titles || [],
          images: {
            backdrops: imagenes.backdrops || [],
            logos: imagenes.logos || [],
            posters: imagenes.posters || [],
          },
        }
      },
      TTL.detalle
    )

    res.status(200).json(detalle)
  })
)

export default router
