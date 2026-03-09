import { redis } from "../lib/redis.js"

/* ==========================================================================
   CLIENTE REDIS (compartido)
   --------------------------------------------------------------------------
   Reutilizamos el mismo cliente de ../lib/redis para evitar conexiones dobles
   y manteniendo compatibilidad con el mock en memoria en test.
   ========================================================================== */

export const conectarRedis = async () => {
  // Solo los clientes ioredis reales tienen .status/.connect.
  const client = redis as unknown as {
    status?: string
    connect?: () => Promise<void>
  }
  if (client?.status === "wait" || client?.status === "close") {
    await client.connect?.()
  }
}

/* ==========================================================================
   HELPERS DE CACHÉ
   ========================================================================== */

const TTL_DEFAULT = 60 * 5

export const getOSet = async <T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = TTL_DEFAULT
): Promise<T> => {
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached) as T
  }

  const resultado = await fn()
  await redis.setex(key, ttl, JSON.stringify(resultado)) // ioredis usa setex (minúscula)
  return resultado
}

export const invalidarCache = async (...keys: string[]) => {
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

export const invalidarPatron = async (patron: string) => {
  const keys = await redis.keys(patron)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

/* ==========================================================================
   CLAVES Y TTLs CENTRALIZADOS
   ========================================================================== */
export const CACHE_KEYS = {
  perfil: (userId: number) => `perfil:${userId}`,
  favorites: (userId: number) => `favorites:${userId}`,
  watchlist: (userId: number) => `watchlist:${userId}`,
  busqueda: (query: string, pagina: number) =>
    `tmdb:search:${query.toLowerCase().trim()}:p${pagina}`,
}

export const CACHE_TTL = {
  perfil: 60 * 10, // 10 minutos
  listas: 60 * 5, // 5 minutos
  busqueda: 60 * 60 * 2, // 2 horas
}

export { redis } from "../lib/redis.js"
