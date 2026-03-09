import {
  getReviews,
  addReview,
  removeReview,
  getReviewsByMovieId,
  removeLikeReview,
  likeReview,
  getReviewsByUserId,
  updateReview,
  reportReview,
} from "../controllers/ReviewsController.js"
import {
  getCommentsByReviewId,
  addComment,
  removeComment,
  updateComment,
} from "../controllers/ReviewCommentsController.js"
import { Router } from "express"
import { middlewareAutenticacion } from "../middlewares/auth.middlewares.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"
import { validarBody } from "../middlewares/validation.middleware.js"
import {
  crearResenaSchema,
  actualizarResenaSchema,
  reportarResenaSchema,
  crearComentarioSchema,
  actualizarComentarioSchema,
} from "../schemas/reviews.js"

/**
 * @swagger
 * tags:
 *   name: Reseñas
 *   description: Gestión de reseñas de películas
 */

const router = Router()

// Rutas públicas
/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: Obtener todas mis reseñas
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reseñas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Resena'
 *             example:
 *               - user_id: 1
 *                 movie_id: 1
 *                 content: "Una obra maestra del cine"
 *                 rating: 4.5
 *                 likes: 12
 *                 created_at: "2026-03-03T11:06:11.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", middlewareAutenticacion, manejadorAsincrono(getReviews)) // Obtener todas mis reseñas

/**
 * @swagger
 * /reviews/user/{userId}:
 *   get:
 *     summary: Obtener las reseñas de un usuario
 *     tags: [Reseñas]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de reseñas del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Resena'
 *             example:
 *               - user_id: 1
 *                 movie_id: 1
 *                 content: "Una obra maestra del cine"
 *                 rating: 4.5
 *                 likes: 12
 *                 created_at: "2026-03-03T11:06:11.000Z"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/user/:userId", manejadorAsincrono(getReviewsByUserId)) // Obtener las reseñas de un usuario

/**
 * @swagger
 * /reviews/movie/{movieId}:
 *   get:
 *     summary: Obtener las reseñas de una película
 *     tags: [Reseñas]
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 550
 *     responses:
 *       200:
 *         description: Lista de reseñas de la película
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Resena'
 *             example:
 *               - user_id: 1
 *                 movie_id: 550
 *                 content: "Una obra maestra del cine"
 *                 rating: 4.5
 *                 likes: 12
 *                 created_at: "2026-03-03T11:06:11.000Z"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/movie/:movieId", manejadorAsincrono(getReviewsByMovieId)) // Obtener las reseñas de una pelicula

// Reseñas (privadas)
/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Crear una review
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [movie_id, rating]
 *             properties:
 *               movie_id:
 *                 type: integer
 *               rating:
 *                 type: number
 *               content:
 *                 type: string
 *           example:
 *             movie_id: 1
 *             rating: 4.5
 *             content: "Una obra maestra del cine"
 *     responses:
 *       201:
 *         description: Reseña creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resena'
 *             example:
 *               id: 1
 *               user_id: 1
 *               movie_id: 1
 *               content: "Una obra maestra del cine"
 *               rating: 4.5
 *               likes: 0
 *               created_at: "2026-03-04T10:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/",
  middlewareAutenticacion,
  validarBody(crearResenaSchema),
  manejadorAsincrono(addReview)
) // Crear una review

/**
 * @swagger
 * /reviews/{reviewId}:
 *   patch:
 *     summary: Actualizar una review
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       content:
 *         application/json:
 *           example:
 *             rating: 5
 *             content: "Después de verla de nuevo, es perfecta"
 *     responses:
 *       200:
 *         description: Reseña actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resena'
 *             example:
 *               id: 1
 *               user_id: 1
 *               movie_id: 1
 *               content: "Después de verla de nuevo, es perfecta"
 *               rating: 5
 *               likes: 12
 *               created_at: "2026-03-04T10:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Eliminar una review
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Reseña eliminada
 *         content:
 *           application/json:
 *             example:
 *               id: 1
 *               user_id: 1
 *               movie_id: 1
 *               content: "Una obra maestra del cine"
 *               rating: 4.5
 *               likes: 12
 *               created_at: "2026-03-04T10:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:reviewId",
  middlewareAutenticacion,
  validarBody(actualizarResenaSchema),
  manejadorAsincrono(updateReview)
) // Actualizar una review
router.delete(
  "/:reviewId",
  middlewareAutenticacion,
  manejadorAsincrono(removeReview)
) // Eliminar una review

// Likes (privadas)
/**
 * @swagger
 * /reviews/{reviewId}/like:
 *   post:
 *     summary: Dar like a una review
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       201:
 *         description: Like añadido
 *         content:
 *           application/json:
 *             example:
 *               review:
 *                 id: 1
 *                 likes: 13
 *               like:
 *                 id: 1
 *                 user_id: 1
 *                 review_id: 1
 *                 created_at: "2026-03-04T10:00:00.000Z"
 *       400:
 *         description: Ya has dado like a esta reseña
 *         content:
 *           application/json:
 *             example:
 *               message: "Ya has dado like a esta reseña"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   delete:
 *     summary: Quitar like a una review
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Like eliminado
 *         content:
 *           application/json:
 *             example:
 *               review:
 *                 id: 1
 *                 likes: 12
 *               like:
 *                 id: 1
 *                 user_id: 1
 *                 review_id: 1
 *       400:
 *         description: No has dado like a esta reseña
 *         content:
 *           application/json:
 *             example:
 *               message: "No has dado like a esta reseña"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/:reviewId/like",
  middlewareAutenticacion,
  manejadorAsincrono(likeReview)
) // Dar like a una review
router.delete(
  "/:reviewId/like",
  middlewareAutenticacion,
  manejadorAsincrono(removeLikeReview)
) // Quitar like a una review

// Reportes (privadas)
/**
 * @swagger
 * /reviews/{reviewId}/report:
 *   post:
 *     summary: Reportar una review
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             reason: "Contenido inapropiado"
 *     responses:
 *       200:
 *         description: Reseña reportada
 *         content:
 *           application/json:
 *             example:
 *               id: 1
 *               reporter_id: 1
 *               review_id: 1
 *               reason: "Contenido inapropiado"
 *               status: "pending"
 *               created_at: "2026-03-04T10:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  "/:reviewId/report",
  middlewareAutenticacion,
  validarBody(reportarResenaSchema),
  manejadorAsincrono(reportReview)
) // Reportar una review

// Comentarios
/**
 * @swagger
 * /reviews/{reviewId}/comments:
 *   get:
 *     summary: Obtener comentarios de una reseña
 *     tags: [Reseñas]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de comentarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comentario'
 *             example:
 *               - id: 1
 *                 review_id: 1
 *                 content: "Totalmente de acuerdo con tu reseña"
 *                 created_at: "2026-03-04T10:00:00.000Z"
 *                 users:
 *                   id: 2
 *                   username: "maria"
 *                   avatar_url: null
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   post:
 *     summary: Añadir comentario a una reseña
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             content: "Totalmente de acuerdo con tu reseña"
 *     responses:
 *       201:
 *         description: Comentario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comentario'
 *             example:
 *               id: 1
 *               review_id: 1
 *               content: "Totalmente de acuerdo con tu reseña"
 *               created_at: "2026-03-04T10:00:00.000Z"
 *               users:
 *                 id: 1
 *                 username: "josue"
 *                 avatar_url: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:reviewId/comments", manejadorAsincrono(getCommentsByReviewId))
router.post(
  "/:reviewId/comments",
  middlewareAutenticacion,
  validarBody(crearComentarioSchema),
  manejadorAsincrono(addComment)
)

/**
 * @swagger
 * /reviews/{reviewId}/comments/{commentId}:
 *   patch:
 *     summary: Editar un comentario
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             content: "Editando mi comentario"
 *     responses:
 *       200:
 *         description: Comentario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comentario'
 *             example:
 *               id: 1
 *               review_id: 1
 *               content: "Editando mi comentario"
 *               created_at: "2026-03-04T10:00:00.000Z"
 *               users:
 *                 id: 1
 *                 username: "josue"
 *                 avatar_url: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Eliminar un comentario
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comentario eliminado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeResponse'
 *             example:
 *               message: "Comentario eliminado correctamente"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:reviewId/comments/:commentId",
  middlewareAutenticacion,
  validarBody(actualizarComentarioSchema),
  manejadorAsincrono(updateComment)
)
router.delete(
  "/:reviewId/comments/:commentId",
  middlewareAutenticacion,
  manejadorAsincrono(removeComment)
)

export default router
