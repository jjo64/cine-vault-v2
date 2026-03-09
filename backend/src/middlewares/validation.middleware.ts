import { Request, Response, NextFunction } from "express"
import { ZodSchema, ZodIssue } from "zod"
import { ValidationError } from "../errors/AppErrors.js"

/* ==========================================================================
   MIDDLEWARE DE VALIDACIÓN ZOD
   --------------------------------------------------------------------------
   Fábrica de middlewares que recibe un schema Zod y devuelve un middleware
   Express. Si el body/query/params no cumplen el schema, se lanza un
   ValidationError que el manejadorErrores global captura y devuelve JSON
   con código 400 y descripción de los campos inválidos.

   Uso en routes:
     router.post("/", validarBody(crearResenaSchema), controlador)

   ¿Por qué safeParse y no parse?
     safeParse no lanza excepciones: nos da control explícito del error
     antes de delegarlo al globalmiddleware.
   ========================================================================== */

/**
 * Valida `req.body` contra el schema Zod recibido.
 * Reemplaza `req.body` con el valor parseado (tipos correctos + defaults aplicados).
 */
export const validarBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const mensaje = result.error.issues
        .map((e: ZodIssue) => `${e.path.join(".")}: ${e.message}`)
        .join(" | ")
      throw new ValidationError(mensaje)
    }
    req.body = result.data as typeof req.body
    next()
  }

/**
 * Valida `req.query` contra el schema Zod recibido.
 * Útil para endpoints con paginación, filtros o búsquedas.
 */
export const validarQuery =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      const mensaje = result.error.issues
        .map((e: ZodIssue) => `${e.path.join(".")}: ${e.message}`)
        .join(" | ")
      throw new ValidationError(mensaje)
    }
    req.query = result.data as typeof req.query
    next()
  }

/**
 * Valida `req.params` contra el schema Zod recibido.
 * Útil para validar que IDs en la URL sean números enteros positivos.
 */
export const validarParams =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      const mensaje = result.error.issues
        .map((e: ZodIssue) => `${e.path.join(".")}: ${e.message}`)
        .join(" | ")
      throw new ValidationError(mensaje)
    }
    req.params = result.data as typeof req.params
    next()
  }
