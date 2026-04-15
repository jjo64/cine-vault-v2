/* ==========================================================================
   EJEMPLOS DE USO DEL RBAC EN RUTAS
   --------------------------------------------------------------------------
   Este archivo muestra cómo integrar los middlewares de autorización
   en tus rutas existentes. Adaptá cada ejemplo a tu código real.
   ========================================================================== */

import { Router, Request } from "express"
import { middlewareAutenticacion } from "../middlewares/auth.middlewares.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"
import {
  verificarPermiso,
  verificarRol,
  verificarPropietarioOPermiso,
} from "../middlewares/rbac.middleware.js"
import { PERMISOS } from "../config/permisos.js"
import { prisma } from "../lib/prisma.js"
import { emitirNotificacion } from "../controllers/NotificationsController.js"

import { rbacRepository } from "../repositories/RbacRepository.js"
import { obtenerEstadisticas, borrarComentario, obtenerEstadisticasSesiones, banearUsuario, enviarWarning } from "../controllers/RbacController.js"


/**
 * @swagger
 * tags:
 *   name: RBAC
 *   description: Rutas de administración con control de acceso por roles
 */

const router = Router()

/* ==========================================================================
   REVIEWS — el dueño puede borrar la suya, el admin cualquiera
   ========================================================================== */

/**
 * @swagger
 * /rbac/reviews/{id}:
 *   delete:
 *     summary: Eliminar review (propietario o admin)
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Review eliminada correctamente
 *       403:
 *         description: Sin permisos suficientes
 */
router.delete(
  "/reviews/:id",
  middlewareAutenticacion,
  verificarPropietarioOPermiso(
    PERMISOS.BORRAR_REVIEWS_AJENAS,
    async (req: Request) => {
      const review = await prisma.reviews.findUnique({
        where: { id: Number(req.params.id) },
        select: { user_id: true },
      })
      return review?.user_id ?? null
    }
  ),
  manejadorAsincrono(async (req, res) => {
    await prisma.reviews.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: "Review eliminada correctamente" })
  })
)

// El dueño del comentario puede borrarlo
// Un admin puede borrar cualquier comentario
// Un usuario normal NO puede borrar comentarios ajenos

/* ==========================================================================
   COMENTARIOS — el dueño puede borrar el suyo, el admin cualquiera
   --------------------------------------------------------------------------
   La lógica de negocio y las queries están en:
   - services/rbac.services.ts
   - repositories/RbacRepository.ts
   ========================================================================== */
router.delete(
  "/comments/:id",
  middlewareAutenticacion,
  verificarPropietarioOPermiso(
    PERMISOS.BORRAR_COMENTARIOS_AJENOS,
    async (req: Request) => rbacRepository.obtenerPropietarioComentario(Number(req.params.id))
  ),
  manejadorAsincrono(borrarComentario)
)

/* ==========================================================================
   NOTICIAS — solo admin y editor pueden crear/editar/borrar
   ========================================================================== */

/**
 * @swagger
 * /rbac/news:
 *   post:
 *     summary: Crear noticia (admin y editor)
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, category]
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [estrenos, premios, actores, directores, streaming]
 *     responses:
 *       201:
 *         description: Noticia creada
 *       403:
 *         description: Sin permisos suficientes
 */
// Crear noticia — admin y editor
router.post(
  "/news",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.GESTIONAR_NOTICIAS),
  manejadorAsincrono(async (req, res) => {
    const { title, content, category } = req.body
    const noticia = await prisma.news.create({
      data: { title, content, category },
    })
    res.status(201).json(noticia)
  })
)

/**
 * @swagger
 * /rbac/news/{id}:
 *   patch:
 *     summary: Editar noticia (admin y editor)
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Noticia actualizada
 *       403:
 *         description: Sin permisos suficientes
 *   delete:
 *     summary: Borrar noticia (admin y editor)
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Noticia eliminada correctamente
 *       403:
 *         description: Sin permisos suficientes
 */
// Editar noticia — admin y editor
router.patch(
  "/news/:id",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.GESTIONAR_NOTICIAS),
  manejadorAsincrono(async (req, res) => {
    const noticia = await prisma.news.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    })
    res.json(noticia)
  })
)

// Borrar noticia — admin y editor
router.delete(
  "/news/:id",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.GESTIONAR_NOTICIAS),
  manejadorAsincrono(async (req, res) => {
    await prisma.news.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: "Noticia eliminada correctamente" })
  })
)

/* ==========================================================================
   REPORTES — admin gestiona, editor solo ve
   ========================================================================== */

/**
 * @swagger
 * /rbac/reports:
 *   get:
 *     summary: Ver reportes (admin y editor)
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reportes
 *       403:
 *         description: Sin permisos suficientes
 */
// Ver reportes — admin y editor
router.get(
  "/reports",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.VER_REPORTES),
  manejadorAsincrono(async (req, res) => {
    const reportes = await prisma.reports.findMany({
      include: { users: true, reviews: true },
      orderBy: { created_at: "desc" },
    })
    res.json(reportes)
  })
)

/**
 * @swagger
 * /rbac/reports/{id}:
 *   patch:
 *     summary: Resolver o rechazar reporte (solo admin)
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [resolved, rejected]
 *     responses:
 *       200:
 *         description: Reporte actualizado
 *       403:
 *         description: Sin permisos suficientes
 */
// Resolver/rechazar reporte — solo admin
router.patch(
  "/reports/:id",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.GESTIONAR_REPORTES),
  manejadorAsincrono(async (req, res) => {
    const { status } = req.body
    const reporte = await prisma.reports.update({
      where: { id: Number(req.params.id) },
      data: { status },
      include: { users: true },
    })

    // Notificar al reportador si el reporte fue resuelto
    if (status === "resolved" && reporte.reporter_id) {
      await emitirNotificacion({
        user_id: reporte.reporter_id,
        sender_id: req.user!.user_id,
        type: "report_resolved",
      })
    }

    res.json(reporte)
  })
)

/* ==========================================================================
   USUARIOS — solo admin puede cambiar roles y ver actividad
   ========================================================================== */

/**
 * @swagger
 * /rbac/users/{id}/role:
 *   patch:
 *     summary: Cambiar rol de un usuario (solo admin)
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, editor, user]
 *     responses:
 *       200:
 *         description: Rol actualizado
 *       403:
 *         description: Sin permisos suficientes
 */
// Cambiar rol de un usuario — solo admin
router.patch(
  "/users/:id/role",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.CAMBIAR_ROL_USUARIOS),
  manejadorAsincrono(async (req, res) => {
    const { role } = req.body
    const usuario = await prisma.users.update({
      where: { id: Number(req.params.id) },
      data: { role },
      select: { id: true, username: true, role: true },
    })
    res.json(usuario)
  })
)

/* ------------------------------------------------------------------------
   BANEAR USUARIO — solo admin
   Bloquea al usuario permanentemente e invalida todas sus sesiones
   ---------------------------------------------------------------------- */
router.patch(
  "/users/:id/ban",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.CAMBIAR_ROL_USUARIOS),
  manejadorAsincrono(banearUsuario)
)

/* ------------------------------------------------------------------------
   ENVIAR WARNING — solo admin
   Envía una advertencia al usuario con el contenido ofensivo
   ---------------------------------------------------------------------- */
router.post(
  "/users/:id/warning",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.CAMBIAR_ROL_USUARIOS),
  manejadorAsincrono(enviarWarning)
)

/**
 * @swagger
 * /rbac/users/activity:
 *   get:
 *     summary: Ver actividad de todos los usuarios (solo admin)
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de actividad de usuarios
 *       403:
 *         description: Sin permisos suficientes
 */
// Ver actividad de todos los usuarios — solo admin
router.get(
  "/users/activity",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.VER_ACTIVIDAD_USUARIOS),
  manejadorAsincrono(async (req, res) => {
    const actividad = await prisma.user_activity.findMany({
      include: { users: { select: { id: true, username: true } } },
      orderBy: { created_at: "desc" },
      take: 100,
    })
    res.json(actividad)
  })
)

/* ==========================================================================
   ESTADÍSTICAS GENERALES — solo admin
   --------------------------------------------------------------------------
   La lógica de negocio y las queries están en:
   - services/rbac.services.ts
   - repositories/RbacRepository.ts
   ========================================================================== */
router.get(
  "/stats",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.VER_ACTIVIDAD_USUARIOS),
  manejadorAsincrono(obtenerEstadisticas)
)

router.get(
  "/stats/sessions",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.VER_ACTIVIDAD_USUARIOS),
  manejadorAsincrono(obtenerEstadisticasSesiones)
)

/**
 * @swagger
 * /rbac/payments:
 *   get:
 *     summary: Ver todos los pagos (solo admin)
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pagos
 *       403:
 *         description: Sin permisos suficientes
 */
// Ver todos los pagos — solo admin
router.get(
  "/payments",
  middlewareAutenticacion,
  verificarPermiso(PERMISOS.VER_PAGOS),
  manejadorAsincrono(async (req, res) => {
    const pagos = await prisma.payments.findMany({
      include: { users: { select: { id: true, username: true, email: true } } },
      orderBy: { created_at: "desc" },
    })
    res.json(pagos)
  })
)

/* ==========================================================================
   MEMBRESÍA — ejemplo de límite de exhibición (para el futuro)
   ========================================================================== */

// Subir película para exhibición — solo vip y pro
// Cuando lo implementes, importá LIMITES_MEMBRESIA para verificar el límite
// import { LIMITES_MEMBRESIA } from "../config/permisos.js"
//
// router.post(
//   "/exhibicion",
//   middlewareAutenticacion,
//   verificarPermiso(PERMISOS.EXHIBIR_PELICULAS),
//   manejadorAsincrono(async (req, res) => {
//     const membresia = usuario.membership
//     const limite = LIMITES_MEMBRESIA[membresia].peliculas_exhibicion
//     const total = await prisma.exhibicion.count({ where: { user_id } })
//     if (total >= limite) throw new ForbiddenError(`Tu plan ${membresia} permite hasta ${limite} películas`)
//     // ... crear exhibición
//   })
// )

export default router
