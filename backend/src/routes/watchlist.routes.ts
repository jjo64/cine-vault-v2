import { Router } from "express"
import { validarBody } from "../middlewares/validation.middleware.js"
import { agregarWatchlistSchema } from "../schemas/watchlist.js"
import {
  getWatchlistByUser,
  addMovieToWatchlist,
  removeMovieFromWatchlist,
  getMyWatchlist,
} from "../controllers/WatchlistController.js"
import { middlewareAutenticacion } from "../middlewares/auth.middlewares.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"

/**
 * @swagger
 * tags:
 *   name: Watchlist
 *   description: Lista de películas pendientes de ver
 */

const router = Router()

/**
 * Aplicamos manejadorAsincrono a cada ruta para que cualquier error en el controlador
 * sea capturado por el middleware global automáticamente.
 */

/**
 * @swagger
 * /watchlist:
 *   get:
 *     summary: Obtener la watchlist del usuario
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de películas en la watchlist
 *         content:
 *           application/json:
 *             example:
 *               - movie_id: 1
 *                 tmdb_id: 550
 *                 added_at: "2026-03-04T10:00:00.000Z"
 *                 movie_info:
 *                   title: "El club de la lucha"
 *                   poster_path: "/sgTAWJFaB2kBvdQxRGabYFiQqEK.jpg"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/", middlewareAutenticacion, manejadorAsincrono(getMyWatchlist)) // obtener la watchlist del usuario

/**
 * @swagger
 * /watchlist/{id_user}:
 *   get:
 *     summary: Obtener la watchlist de otro usuario
 *     tags: [Watchlist]
 *     parameters:
 *       - in: path
 *         name: id_user
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Watchlist del usuario
 *         content:
 *           application/json:
 *             example:
 *               - movie_id: 1
 *                 tmdb_id: 550
 *                 added_at: "2026-03-04T10:00:00.000Z"
 *                 movie_info:
 *                   title: "El club de la lucha"
 *                   poster_path: "/sgTAWJFaB2kBvdQxRGabYFiQqEK.jpg"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id_user", manejadorAsincrono(getWatchlistByUser)) // obtener la watchlist de otro usuario

/**
 * @swagger
 * /watchlist:
 *   post:
 *     summary: Añadir película a la watchlist
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [movie_id]
 *             properties:
 *               movie_id:
 *                 type: integer
 *           example:
 *             movie_id: 1
 *     responses:
 *       200:
 *         description: Película añadida
 *         content:
 *           application/json:
 *             example:
 *               id: 1
 *               user_id: 1
 *               movie_id: 1
 *               added_at: "2026-03-04T10:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/",
  middlewareAutenticacion,
  validarBody(agregarWatchlistSchema),
  manejadorAsincrono(addMovieToWatchlist)
) // añadir película a la watchlist

/**
 * @swagger
 * /watchlist/{movie_id}:
 *   delete:
 *     summary: Eliminar película de la watchlist
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movie_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Película eliminada
 *         content:
 *           application/json:
 *             example:
 *               count: 1
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  "/:movie_id",
  middlewareAutenticacion,
  manejadorAsincrono(removeMovieFromWatchlist)
) // eliminar película de la watchlist

export default router
