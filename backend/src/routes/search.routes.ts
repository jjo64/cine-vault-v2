import { Router } from "express"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"
import {
  getSearch,
  getMultiSearch,
  getMovieSearch,
  getMovieGenres,
  getPersonSearch,
  getTVSearch,
} from "../controllers/SearchController.js"

/**
 * @swagger
 * tags:
 *   name: Búsqueda
 *   description: Búsqueda de contenido en TMDB con caché Redis
 */

const router = Router()

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Búsqueda general de películas con director y títulos alternativos
 *     tags: [Búsqueda]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         example: "Fight Club"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Resultados de búsqueda
 *         content:
 *           application/json:
 *             example:
 *               results:
 *                 - id: 550
 *                   title: "Fight Club"
 *                   poster_path: "/sgTAWJFaB2kBvdQxRGabYFiQqEK.jpg"
 *                   overview: "Un hombre consumido por el insomnio..."
 *                   release_date: "1999-10-15"
 *                   vote_average: 8.4
 *                   director: "David Fincher"
 *                   alternative_titles:
 *                     - title: "El club de la lucha"
 *                       iso_3166_1: "ES"
 *               total_pages: 1
 *               total_results: 1
 *               page: 1
 *       400:
 *         description: Término de búsqueda requerido
 *         content:
 *           application/json:
 *             example:
 *               error: "Debe proporcionar un término de búsqueda."
 */
router.get("/", manejadorAsincrono(getSearch)) // busqueda general

/**
 * @swagger
 * /search/multi:
 *   get:
 *     summary: Búsqueda múltiple (películas, series, personas)
 *     tags: [Búsqueda]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         example: "Inception"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Resultados combinados de películas, series y personas
 *         content:
 *           application/json:
 *             example:
 *               results:
 *                 - id: 27205
 *                   media_type: "movie"
 *                   title: "Inception"
 *                   poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"
 *               total_pages: 1
 *               total_results: 1
 */
router.get("/multi", manejadorAsincrono(getMultiSearch)) // busqueda general

/**
 * @swagger
 * /search/movie:
 *   get:
 *     summary: Búsqueda solo de películas
 *     tags: [Búsqueda]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         example: "The Godfather"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Películas encontradas
 *         content:
 *           application/json:
 *             example:
 *               results:
 *                 - id: 238
 *                   title: "The Godfather"
 *                   poster_path: "/3bhkrj58Vtu7enYsLegHnDmni3b.jpg"
 *                   release_date: "1972-03-14"
 *                   vote_average: 8.7
 *               total_pages: 1
 *               total_results: 1
 */
router.get("/movie", manejadorAsincrono(getMovieSearch)) // busqueda películas

router.get("/genres/movie", manejadorAsincrono(getMovieGenres))

/**
 * @swagger
 * /search/person:
 *   get:
 *     summary: Búsqueda solo de personas
 *     tags: [Búsqueda]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         example: "Christopher Nolan"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Personas encontradas
 *         content:
 *           application/json:
 *             example:
 *               results:
 *                 - id: 525
 *                   name: "Christopher Nolan"
 *                   profile_path: "/xuAIuYSmsUzKlUMBFGVZaWsY3DZ.jpg"
 *                   known_for_department: "Directing"
 *               total_pages: 1
 *               total_results: 1
 */
router.get("/person", manejadorAsincrono(getPersonSearch)) // busqueda personas

/**
 * @swagger
 * /search/tv:
 *   get:
 *     summary: Búsqueda solo de series
 *     tags: [Búsqueda]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         example: "Breaking Bad"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Series encontradas
 *         content:
 *           application/json:
 *             example:
 *               results:
 *                 - id: 1396
 *                   name: "Breaking Bad"
 *                   poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg"
 *                   first_air_date: "2008-01-20"
 *                   vote_average: 8.9
 *               total_pages: 1
 *               total_results: 1
 */
router.get("/tv", manejadorAsincrono(getTVSearch)) // busqueda series

export default router
