import { redis } from "../lib/redis.js"

/**
 * Servicio de Seguridad y Comportamiento
 *
 * Implementaciones basadas en tus excelentes sugerencias:
 */

// Detección de Spikes (Rate Limiting por IP)
export const checkIPSpike = async (ip: string) => {
  const key = `spike:${ip}`
  const MAX_REQUESTS = 10
  const WINDOW_SECONDS = 5

  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, WINDOW_SECONDS)

  return count > MAX_REQUESTS
}

// Detección de Spam (Comentarios duplicados en ráfaga)
export const isDuplicateComment = async (userId: string, comment: string) => {
  const key = `spam_check:${userId}`
  const MAX_DUPLICATES = 3

  // Guardamos el comentario y mantenemos solo los últimos 3
  await redis.lpush(key, comment)
  await redis.ltrim(key, 0, MAX_DUPLICATES - 1)

  const lastComments = await redis.lrange(key, 0, -1)
  const repeats = lastComments.filter((c) => c === comment).length

  return repeats >= MAX_DUPLICATES
}

// Recomendación IA Ligera (Concepto)
// Para el futuro, vamos a decidir si usar brain.js:
// export const getSmartRecommendations = (userData) => { ... }

export { redis }
