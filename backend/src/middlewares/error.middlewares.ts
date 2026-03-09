import { Request, Response, NextFunction } from "express"
import { ApplicationError } from "../errors/AppErrors.js"

/* ==========================================================================
   MANEJADOR DE ERRORES GLOBAL
   --------------------------------------------------------------------------
   Debe registrarse ÚLTIMO en Express (después de todas las rutas).
   Intercepta cualquier error lanzado desde los servicios y devuelve
   un JSON limpio con el statusCode correcto.

   Uso en server.ts:
     app.use(manejadorErrores)
   ========================================================================== */
export const manejadorErrores = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Errores personalizados de la app → usar su statusCode y code
  if (err instanceof ApplicationError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    })
  }

  // Errores de JWT (token inválido/expirado)
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: {
        code: "TOKEN_INVALIDO",
        message: "Token inválido o expirado",
      },
    })
  }

  // Error genérico no controlado
  console.error("[ERROR NO CONTROLADO]", err)
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Error interno del servidor",
    },
  })
}

/* ==========================================================================
   MANEJADOR ASÍNCRONO
   --------------------------------------------------------------------------
   Envuelve los controladores async para que los errores lleguen al
   manejadorErrores global sin necesidad de try/catch en cada ruta.

   Uso en routes:
     router.post("/login", manejadorAsincrono(iniciarSesion))
   ========================================================================== */
export const manejadorAsincrono =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
