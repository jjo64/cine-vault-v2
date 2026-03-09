import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { UnauthorizedError } from "../errors/AppErrors.js"

/* ==========================================================================
   INTERFACES DE AUTENTICACIÓN
   ========================================================================== */

export interface PayloadAcceso {
  user_id: number
  role: "admin" | "editor" | "user"
  is_verified: boolean
  membership?: string // inyectado por verificarPermiso del RBAC
}

export interface PayloadRefresco {
  id_session: string
  user_id: number
}

// Extiende Request globalmente — req.user disponible en toda la app
declare module "express-serve-static-core" {
  interface Request {
    user?: PayloadAcceso
  }
}

// Alias semántico — úsalo en controllers que SIEMPRE tienen middlewareAutenticacion antes
export type SolicitudAutenticada = Request

/* ==========================================================================
   MIDDLEWARE DE AUTENTICACIÓN
   ========================================================================== */

export const middlewareAutenticacion = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"]
  const bearerToken = authHeader && authHeader.split(" ")[1]
  const cookieToken = req.cookies?.access_token
  const token = bearerToken || cookieToken

  if (!token) {
    throw new UnauthorizedError("No se proporcionó token de acceso")
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as PayloadAcceso
    req.user = payload
    next()
  } catch {
    next(new UnauthorizedError("Token inválido o expirado"))
  }
}
