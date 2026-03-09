import { Response, NextFunction, Request } from "express"
import { tienePermiso, Permiso } from "../config/permisos.js"
import { ForbiddenError } from "../errors/AppErrors.js"
import { prisma } from "../lib/prisma.js"
import { redis } from "../config/redis.js"

/* ==========================================================================
   MIDDLEWARES DE AUTORIZACIÓN (RBAC)
   --------------------------------------------------------------------------
   Tanto el rol como la membresía se leen desde Redis (TTL 2 min) para que
   cambios de plan o rol se reflejen casi instantáneamente sin query a DB
   en cada request.

   Cuando cambia el rol o membresía de un usuario, invalidar:
     await invalidarCacheRol(userId)
     await invalidarCacheMembresia(userId)
   ========================================================================== */

// ---------------------------------------------------------------------------
// HELPERS — obtener rol y membresía con caché Redis
// ---------------------------------------------------------------------------

const obtenerRolYMembresia = async (
  userId: number
): Promise<{ role: string; membresia: string }> => {
  const rolKey = `rol:${userId}`
  const membresiaKey = `membresia:${userId}`

  try {
    // Intentar leer ambos de Redis en paralelo
    const [cachedRol, cachedMembresia] = await Promise.all([
      redis.get(rolKey),
      redis.get(membresiaKey),
    ])

    if (cachedRol && cachedMembresia) {
      return { role: cachedRol, membresia: cachedMembresia }
    }

    // Cache miss en alguno — consultar DB
    const usuario = await prisma.users.findUnique({
      where: { id: userId },
      select: { role: true, membership: true },
    })

    const role = usuario?.role ?? "user"
    const membresia = usuario?.membership ?? "free"

    // Cachear ambos por 2 minutos en paralelo
    await Promise.all([
      redis.setex(rolKey, 120, role),
      redis.setex(membresiaKey, 120, membresia),
    ])

    return { role, membresia }
  } catch {
    // Si Redis falla, ir directo a DB sin romper la app
    const usuario = await prisma.users.findUnique({
      where: { id: userId },
      select: { role: true, membership: true },
    })
    return {
      role: usuario?.role ?? "user",
      membresia: usuario?.membership ?? "free",
    }
  }
}

// ---------------------------------------------------------------------------
// EXPORTS — invalidar caché de rol y membresía
// ---------------------------------------------------------------------------

/**
 * Llamar cuando el admin cambia el rol de un usuario.
 * El próximo request ya verá el nuevo rol sin necesidad de cerrar sesión.
 */
export const invalidarCacheRol = async (userId: number) => {
  await redis.del(`rol:${userId}`)
}

/**
 * Llamar cuando cambia el plan de un usuario:
 *   - Se activa una suscripción nueva
 *   - Se cancela o expira una suscripción
 *   - El admin cambia la membresía manualmente
 */
export const invalidarCacheMembresia = async (userId: number) => {
  await redis.del(`membresia:${userId}`)
}

/**
 * Invalidar tanto rol como membresía de una vez.
 * Útil cuando se hace un cambio completo del usuario.
 */
export const invalidarCacheUsuario = async (userId: number) => {
  await Promise.all([
    redis.del(`rol:${userId}`),
    redis.del(`membresia:${userId}`),
  ])
}

// ---------------------------------------------------------------------------
// MIDDLEWARE 1 — verificar permiso específico
// ---------------------------------------------------------------------------

/**
 * Verifica que el usuario tenga un permiso específico.
 * Lee rol y membresía desde Redis — cambios se reflejan en ~2 minutos máximo,
 * o inmediatamente si se invalida el caché al hacer el cambio.
 */
export const verificarPermiso = (permiso: Permiso) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.user!
      const { role, membresia } = await obtenerRolYMembresia(user_id)

      if (!tienePermiso(role, permiso, membresia)) {
        throw new ForbiddenError(
          "No tenés permisos suficientes para realizar esta acción"
        )
      }

      // Inyectar en req.user para que estén disponibles en el controller
      req.user!.role = role as "admin" | "editor" | "user"
      req.user!.membership = membresia

      next()
    } catch (error) {
      next(error)
    }
  }
}

// ---------------------------------------------------------------------------
// MIDDLEWARE 2 — verificar rol directamente
// ---------------------------------------------------------------------------

/**
 * Verifica que el usuario tenga uno de los roles especificados.
 * También lee el rol desde Redis para que cambios sean inmediatos.
 */
export const verificarRol = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.user!
      const { role } = await obtenerRolYMembresia(user_id)

      if (!roles.includes(role)) {
        return next(
          new ForbiddenError("No tenés el rol necesario para esta acción")
        )
      }

      req.user!.role = role as "admin" | "editor" | "user"
      next()
    } catch (error) {
      next(error)
    }
  }
}

// ---------------------------------------------------------------------------
// MIDDLEWARE 3 — propietario del recurso O permiso especial
// ---------------------------------------------------------------------------

/**
 * El dueño puede actuar sobre su propio recurso.
 * Alguien con el permiso especial puede actuar sobre cualquiera.
 */
export const verificarPropietarioOPermiso = (
  permiso: Permiso,
  obtenerOwnerIdFn: (req: Request) => Promise<number | null>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.user!

      const ownerId = await obtenerOwnerIdFn(req)
      if (ownerId === user_id) return next()

      const { role, membresia } = await obtenerRolYMembresia(user_id)

      if (!tienePermiso(role, permiso, membresia)) {
        throw new ForbiddenError(
          "No tenés permisos para actuar sobre este recurso"
        )
      }

      req.user!.role = role as "admin" | "editor" | "user"
      req.user!.membership = membresia
      next()
    } catch (error) {
      next(error)
    }
  }
}
