import { Router } from "express"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"
import {
  personInformation,
  personInformationCombined,
} from "../controllers/InformationController.js"

/**
 * @swagger
 * tags:
 *   name: Información
 *   description: Información de personas desde TMDB
 */

const router = Router()

/**
 * @swagger
 * /information/person/{id}:
 *   get:
 *     summary: Información de una persona
 *     tags: [Información]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la persona en TMDB
 *     responses:
 *       200:
 *         description: Datos de la persona
 */
router.get("/person/:id", manejadorAsincrono(personInformation)) // informacion de una persona

/**
 * @swagger
 * /information/person/{id}/combined_credits:
 *   get:
 *     summary: Créditos combinados de una persona
 *     tags: [Información]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la persona en TMDB
 *     responses:
 *       200:
 *         description: Créditos combinados (películas y series)
 */
router.get(
  "/person/:id/combined_credits",
  manejadorAsincrono(personInformationCombined)
)

export default router
