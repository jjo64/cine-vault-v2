import { redis } from "./redis.js"

const DEFAULT_TTL_SECONDS = 300

type Serializable =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null

export const getCache = async <T>(key: string): Promise<T | null> => {
  const raw = await redis.get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    // Si el contenido no es JSON válido, lo ignoramos y dejamos que el caller regenere.
    return null
  }
}

export const setCache = async <T extends Serializable>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
) => {
  const payload = JSON.stringify(value)
  if (ttlSeconds > 0) {
    await redis.set(key, payload, "EX", ttlSeconds)
  } else {
    await redis.set(key, payload)
  }
}

export const invalidateKeys = async (keys: string[]) => {
  if (!keys.length) return
  await redis.del(...keys)
}

export { redis }
