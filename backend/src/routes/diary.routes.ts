import { Router } from "express"
import {
  createDiary,
  getDiaryUser,
  removeDiary,
  getMyDiary,
} from "../controllers/DiaryController.js"
import { middlewareAutenticacion } from "../middlewares/auth.middlewares.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"
import { validarBody } from "../middlewares/validation.middleware.js"
import { crearEntradaDiarioSchema } from "../schemas/diary.js"

/**
 * @swagger
 * tags:
 *   name: Diario
 *   description: Gestión del diario de visionado
 */

const router = Router()

/**
 * Rutas del Diario protegidas con autenticación y centralizadas con manejadorAsincrono.
 */

/**
 * @swagger
 * /diary:
 *   get:
 *     summary: Obtener mi diario
 *     tags: [Diario]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de entradas del diario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 diary:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EntradaDiario'
 *             example:
 *               diary:
 *                 - movie_id: 1
 *                   watched_date: "2026-01-28"
 *                   tmdb_id: 550
 *                   movie_info:
 *                     title: "El club de la lucha"
 *                     poster_path: "/sgTAWJFaB2kBvdQxRGabYFiQqEK.jpg"
 *                   review:
 *                     movie_id: 1
 *                     rating: 4.5
 *                     content: "Una obra maestra"
 *                     created_at: "2026-03-03T11:06:11.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/", middlewareAutenticacion, manejadorAsincrono(getMyDiary)) // obtener diario del usuario

/**
 * @swagger
 * /diary/{id_user}:
 *   get:
 *     summary: Obtener el diario de otro usuario
 *     tags: [Diario]
 *     parameters:
 *       - in: path
 *         name: id_user
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Diario del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 diary:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EntradaDiario'
 *             example:
 *               diary:
 *                 - movie_id: 1
 *                   watched_date: "2026-01-28"
 *                   tmdb_id: 550
 *                   movie_info:
 *                     title: "El club de la lucha"
 *                     poster_path: "/sgTAWJFaB2kBvdQxRGabYFiQqEK.jpg"
 *                   review: null
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id_user", manejadorAsincrono(getDiaryUser)) // obtener diario de otro usuario

/**
 * @swagger
 * /diary:
 *   post:
 *     summary: Crear entrada en el diario
 *     tags: [Diario]
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
 *               watched_date:
 *                 type: string
 *                 format: date
 *           example:
 *             movie_id: 1
 *             watched_date: "2026-03-04"
 *     responses:
 *       200:
 *         description: Entrada creada
 *         content:
 *           application/json:
 *             example:
 *               id: 1
 *               user_id: 1
 *               movie_id: 1
 *               watched_date: "2026-03-04"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/",
  middlewareAutenticacion,
  validarBody(crearEntradaDiarioSchema),
  manejadorAsincrono(createDiary)
) // crear diario

router.delete(
  "/:id",
  middlewareAutenticacion,
  manejadorAsincrono(removeDiary)
) // eliminar entrada por id

export default router
