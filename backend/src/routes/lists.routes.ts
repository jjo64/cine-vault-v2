import { Router } from "express"
import { middlewareAutenticacion } from "../middlewares/auth.middlewares.js"
import { manejadorAsincrono } from "../middlewares/error.middlewares.js"
import { validarBody, validarParams } from "../middlewares/validation.middleware.js"
import {
  addMovieToListSchema,
  createListSchema,
  listIdParamsSchema,
  listItemParamsSchema,
  updateListSchema,
} from "../schemas/lists.js"
import {
  addMovieToList,
  createList,
  deleteList,
  getMyListDetail,
  getMyLists,
  removeMovieFromList,
  updateList,
} from "../controllers/ListsController.js"

const router = Router()

router.get("/", middlewareAutenticacion, manejadorAsincrono(getMyLists))
router.post(
  "/",
  middlewareAutenticacion,
  validarBody(createListSchema),
  manejadorAsincrono(createList)
)
router.get(
  "/:id",
  middlewareAutenticacion,
  validarParams(listIdParamsSchema),
  manejadorAsincrono(getMyListDetail)
)
router.patch(
  "/:id",
  middlewareAutenticacion,
  validarParams(listIdParamsSchema),
  validarBody(updateListSchema),
  manejadorAsincrono(updateList)
)
router.delete(
  "/:id",
  middlewareAutenticacion,
  validarParams(listIdParamsSchema),
  manejadorAsincrono(deleteList)
)
router.post(
  "/:id/movies",
  middlewareAutenticacion,
  validarParams(listIdParamsSchema),
  validarBody(addMovieToListSchema),
  manejadorAsincrono(addMovieToList)
)
router.delete(
  "/:id/movies/:movie_id",
  middlewareAutenticacion,
  validarParams(listItemParamsSchema),
  manejadorAsincrono(removeMovieFromList)
)

export default router
