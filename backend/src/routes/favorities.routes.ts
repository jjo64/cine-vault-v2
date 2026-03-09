import { Router } from "express"
import {
  getFavorites,
  getFavoritesByUserId,
  addMovieToFavorites,
  removeMovieFromFavorites,
} from "../controllers/FavoritiesController.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"
import { middlewareAutenticacion } from "../middlewares/auth.middlewares.js"

/**
 * @swagger
 * tags:
 *   name: Favoritos
 *   description: Gestión de películas favoritas
 */

const router = Router()

/**
 * @swagger
 * /favorites:
 *   get:
 *     summary: Obtener mis favoritos
 *     tags: [Favoritos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de favoritos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorito'
 *             example:
 *               - movie_id: 1
 *                 rank_position: 1
 *               - movie_id: 102
 *                 rank_position: 2
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: No tienes favoritos
 *         content:
 *           application/json:
 *             example:
 *               error: "No tienes favoritos"
 */
router.get("/", middlewareAutenticacion, manejadorAsincrono(getFavorites)) // Obtener mis favoritos

/**
 * @swagger
 * /favorites/user/{userId}:
 *   get:
 *     summary: Obtener los favoritos de un usuario
 *     tags: [Favoritos]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Favoritos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorito'
 *             example:
 *               - movie_id: 1
 *                 rank_position: 1
 *               - movie_id: 102
 *                 rank_position: 2
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/user/:userId", manejadorAsincrono(getFavoritesByUserId)) // Obtener los favoritos de un usuario

/**
 * @swagger
 * /favorites/{movieId}:
 *   post:
 *     summary: Añadir una película a favoritos
 *     tags: [Favoritos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       content:
 *         application/json:
 *           example:
 *             rank_position: 1
 *     responses:
 *       201:
 *         description: Película añadida a favoritos
 *         content:
 *           application/json:
 *             example:
 *               id: 1
 *               user_id: 1
 *               movie_id: 1
 *               rank_position: 1
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   delete:
 *     summary: Eliminar una película de favoritos
 *     tags: [Favoritos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Película eliminada de favoritos
 *         content:
 *           application/json:
 *             example:
 *               message: "Eliminado de favoritos"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  "/:movieId",
  middlewareAutenticacion,
  manejadorAsincrono(addMovieToFavorites)
) // Añadir una película a favoritos
router.delete(
  "/:movieId",
  middlewareAutenticacion,
  manejadorAsincrono(removeMovieFromFavorites)
) // Eliminar una película de favoritos

export default router
