import { Response, NextFunction } from "express"
import { redis } from "../config/redis.js"
import { SolicitudAutenticada } from "./auth.middlewares.js"

/* ==========================================================================
   MIDDLEWARE DE CACHÉ HTTP
   --------------------------------------------------------------------------
   Intercepta requests GET y devuelve la respuesta desde Redis si existe.
   Si no existe, deja pasar el request y cachea la respuesta al final.

   Uso en rutas:
     router.get("/perfil", middlewareAutenticacion, cachear(CACHE_TTL.perfil, (req) =>
       CACHE_KEYS.perfil(req.user!.user_id)
     ), manejadorAsincrono(obtenerPerfil))
   ========================================================================== */

/**
 * Middleware que cachea respuestas JSON de Express en Redis.
 * @param ttl     Tiempo de vida en segundos
 * @param keyFn   Función que genera la clave Redis a partir del request
 */
export const cachear = (
  ttl: number,
  keyFn: (req: SolicitudAutenticada) => string
) => {
  return async (
    req: SolicitudAutenticada,
    res: Response,
    next: NextFunction
  ) => {
    const key = keyFn(req)

    try {
      const cached = await redis.get(key)
      if (cached) {
        return res.json(JSON.parse(cached))
      }

      // Interceptar res.json para guardar la respuesta en caché
      const jsonOriginal = res.json.bind(res)
      res.json = (body) => {
        // Solo cachear respuestas exitosas
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis
            .setex(key, ttl, JSON.stringify(body))
            .catch((err) =>
              console.error("[Redis] Error al cachear respuesta:", err)
            )
        }
        return jsonOriginal(body)
      }

      next()
    } catch (err) {
      // Si Redis falla, simplemente seguimos sin caché (no rompemos la app)
      console.error("[Redis] Error en middleware de caché:", err)
      next()
    }
  }
}
