import { Router } from "express"
import { middlewareAutenticacion } from "../middlewares/auth.middlewares.js"
import {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  obtenerUsuarioPorUsername,
  obtenerSeguidores,
  obtenerSiguiendo,
  dejarDeSeguirUsuario,
  seguirUsuario,
} from "../controllers/UserController.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Gestión de usuarios y relaciones sociales
 */

const router = Router()

/**
 * Rutas de Usuarios:
 * Todas envueltas en manejadorAsincrono para centralizar errores.
 */

// Rutas publicas
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Listar usuarios
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UsuarioPublico'
 *             example:
 *               - id: 1
 *                 username: "josue"
 *                 email: "josue@cinevault.com"
 *                 role: "user"
 *                 avatar_url: "https://res.cloudinary.com/doznr2qm4/image/upload/cinevault/avatars/user_1.webp"
 *                 bio: "Amante del cine"
 *                 is_verified: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", middlewareAutenticacion, manejadorAsincrono(obtenerUsuarios))

router.get(
  "/username/:username",
  manejadorAsincrono(obtenerUsuarioPorUsername)
)

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Datos del perfil (nombre, bio, avatar, stats)
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioPublico'
 *             example:
 *               id: 1
 *               username: "josue"
 *               email: "josue@cinevault.com"
 *               role: "user"
 *               avatar_url: "https://res.cloudinary.com/doznr2qm4/image/upload/cinevault/avatars/user_1.webp"
 *               bio: "Amante del cine"
 *               is_verified: true
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", manejadorAsincrono(obtenerUsuarioPorId)) // Datos del pefil (nombre, bio, avatar, stats)

// Rutas privadas
/**
 * @swagger
 * /users/follow/{id}:
 *   post:
 *     summary: Seguir usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: Usuario seguido correctamente
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario seguido correctamente"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  "/follow/:id",
  middlewareAutenticacion,
  manejadorAsincrono(seguirUsuario)
) //seguir usuario

/**
 * @swagger
 * /users/unfollow/{id}:
 *   delete:
 *     summary: Dejar de seguir usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: Dejado de seguir correctamente
 *         content:
 *           application/json:
 *             example:
 *               message: "Has dejado de seguir al usuario correctamente"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  "/unfollow/:id",
  middlewareAutenticacion,
  manejadorAsincrono(dejarDeSeguirUsuario)
) // dejar de seguir usuario

/**
 * @swagger
 * /users/{id}/followers:
 *   get:
 *     summary: Obtener seguidores de un usuario
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de seguidores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UsuarioPublico'
 *             example:
 *               - id: 2
 *                 username: "maria"
 *                 avatar_url: "https://res.cloudinary.com/doznr2qm4/image/upload/cinevault/avatars/user_2.webp"
 *                 bio: null
 *                 is_verified: true
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id/followers", manejadorAsincrono(obtenerSeguidores)) // seguidores

/**
 * @swagger
 * /users/{id}/following:
 *   get:
 *     summary: Obtener usuarios que sigue
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de usuarios seguidos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UsuarioPublico'
 *             example:
 *               - id: 3
 *                 username: "carlos"
 *                 avatar_url: null
 *                 bio: "Director de cine aficionado"
 *                 is_verified: false
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id/following", manejadorAsincrono(obtenerSiguiendo)) // siguiendo

//router.post('/block/:id', middlewareAutenticacion, manejadorAsincrono(blockUser))
//router.delete('/unblock/:id', middlewareAutenticacion, manejadorAsincrono(unblockUser))

export default router
