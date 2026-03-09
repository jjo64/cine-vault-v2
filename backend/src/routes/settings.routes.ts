import { Router } from "express"
import { middlewareAutenticacion } from "../middlewares/auth.middlewares.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"
import {
  actualizarPerfil,
  actualizarAuth,
  actualizarAvatar,
  eliminarCuenta,
} from "../controllers/SettingsController.js"
import { validarBody } from "../middlewares/validation.middleware.js"
import {
  actualizarPerfilSchema,
  actualizarAuthSchema,
  actualizarAvatarSchema,
} from "../schemas/settings.js"

/**
 * @swagger
 * tags:
 *   name: Ajustes
 *   description: Configuración de cuenta del usuario
 */

const router = Router()

//Rutas privadas
/**
 * @swagger
 * /settings:
 *   patch:
 *     summary: Panel principal del settings donde se podrá actualizar todos los campos del user
 *     tags: [Ajustes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               bio:
 *                 type: string
 *           example:
 *             username: "josue_nuevo"
 *             email: "nuevo@cinevault.com"
 *             bio: "Cinéfilo empedernido"
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
 *         content:
 *           application/json:
 *             example:
 *               message: "Perfil actualizado correctamente"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario no encontrado"
 *       409:
 *         description: Username o email ya en uso
 *         content:
 *           application/json:
 *             example:
 *               message: "El username o email ya está en uso"
 *   delete:
 *     summary: Eliminar cuenta
 *     tags: [Ajustes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuenta eliminada correctamente
 *         content:
 *           application/json:
 *             example:
 *               message: "Cuenta eliminada correctamente"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/",
  middlewareAutenticacion,
  validarBody(actualizarPerfilSchema),
  manejadorAsincrono(actualizarPerfil)
) // Panel principal del settings donde se podra actualizar todos los campos del user
router.delete("/", middlewareAutenticacion, manejadorAsincrono(eliminarCuenta))

/**
 * @swagger
 * /settings/auth:
 *   patch:
 *     summary: Cambiar contraseña
 *     tags: [Ajustes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password_actual, password_nueva, password_confirmacion]
 *             properties:
 *               password_actual:
 *                 type: string
 *               password_nueva:
 *                 type: string
 *               password_confirmacion:
 *                 type: string
 *           example:
 *             password_actual: "miContraseña123"
 *             password_nueva: "nuevaContraseña456"
 *             password_confirmacion: "nuevaContraseña456"
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente
 *         content:
 *           application/json:
 *             example:
 *               message: "Contraseña actualizada correctamente"
 *       400:
 *         description: Campos requeridos o contraseñas no coinciden
 *         content:
 *           application/json:
 *             example:
 *               message: "Las contraseñas no coinciden"
 *       401:
 *         description: Contraseña actual incorrecta
 *         content:
 *           application/json:
 *             example:
 *               message: "Contraseña actual incorrecta"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/auth",
  middlewareAutenticacion,
  validarBody(actualizarAuthSchema),
  manejadorAsincrono(actualizarAuth)
)

/**
 * @swagger
 * /settings/avatar:
 *   patch:
 *     summary: Actualizar avatar
 *     tags: [Ajustes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 description: Imagen en base64 (JPG, PNG o WEBP, máx 5MB)
 *           example:
 *             avatar: "data:image/jpeg;base64,/9j/4AAQSkZJRgAB..."
 *     responses:
 *       200:
 *         description: Avatar actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioPublico'
 *             example:
 *               id: 1
 *               username: "josue"
 *               email: "josue@cinevault.com"
 *               bio: null
 *               avatar_url: "https://res.cloudinary.com/doznr2qm4/image/upload/v1772616373/cinevault/avatars/user_1.webp"
 *       400:
 *         description: Formato inválido o imagen demasiado grande
 *         content:
 *           application/json:
 *             example:
 *               message: "La imagen no puede superar los 5MB"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/avatar",
  middlewareAutenticacion,
  validarBody(actualizarAvatarSchema),
  manejadorAsincrono(actualizarAvatar)
)

export default router
