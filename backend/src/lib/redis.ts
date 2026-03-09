import { Redis } from "ioredis"

interface RedisLike {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: unknown[]): Promise<"OK" | null>
  setex(key: string, seconds: number, value: string): Promise<"OK" | null>
  del(...keys: string[]): Promise<number>
  keys(pattern: string): Promise<string[]>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  lpush(key: string, ...values: string[]): Promise<number>
  ltrim(key: string, start: number, stop: number): Promise<void | "OK">
  lrange(key: string, start: number, stop: number): Promise<string[]>
  on(event: string, listener: (...args: unknown[]) => void): this
}

const createInMemoryRedis = (): RedisLike => {
  const kv = new Map<string, string>()
  const lists = new Map<string, string[]>()
  const expiry = new Map<string, number>()

  const isExpired = (key: string) => {
    const exp = expiry.get(key)
    if (exp && Date.now() > exp) {
      kv.delete(key)
      lists.delete(key)
      expiry.delete(key)
      return true
    }
    return false
  }

  return {
    async get(key: string) {
      if (isExpired(key)) return null
      return kv.has(key) ? kv.get(key)! : null
    },
    async set(key: string, value: string, ...args: unknown[]) {
      // Soportar firmas: set key value ["EX", ttl] ["NX"]
      const parts = args.flat().map(String)
      const hasNx = parts.includes("NX")
      const exIndex = parts.indexOf("EX")
      const ttlSeconds = exIndex !== -1 ? Number(parts[exIndex + 1]) : undefined

      if (hasNx && kv.has(key) && !isExpired(key)) {
        return null
      }

      kv.set(key, value)
      if (ttlSeconds && Number.isFinite(ttlSeconds)) {
        expiry.set(key, Date.now() + ttlSeconds * 1000)
      }
      return "OK" as const
    },
    async setex(key: string, seconds: number, value: string) {
      kv.set(key, value)
      if (Number.isFinite(seconds)) {
        expiry.set(key, Date.now() + seconds * 1000)
      }
      return "OK" as const
    },
    async del(...keys: string[]) {
      let removed = 0
      for (const key of keys) {
        removed += kv.delete(key) ? 1 : 0
        removed += lists.delete(key) ? 1 : 0
        expiry.delete(key)
      }
      return removed
    },
    async keys(pattern: string) {
      // Implementación simple con comodín *
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$")
      const allKeys = new Set([...kv.keys(), ...lists.keys()])
      return Array.from(allKeys).filter((key) => regex.test(key))
    },
    async incr(key: string) {
      if (isExpired(key)) {
        kv.delete(key)
        expiry.delete(key)
      }
      const current = Number(kv.get(key) || "0") + 1
      kv.set(key, String(current))
      return current
    },
    async expire(key: string, seconds: number) {
      if (!kv.has(key)) return 0
      expiry.set(key, Date.now() + seconds * 1000)
      return 1
    },
    async lpush(key: string, value: string) {
      if (isExpired(key)) {
        lists.delete(key)
        expiry.delete(key)
      }
      const arr = lists.get(key) || []
      arr.unshift(value)
      lists.set(key, arr)
      return arr.length
    },
    async ltrim(key: string, start: number, stop: number) {
      if (isExpired(key)) return
      const arr = lists.get(key) || []
      lists.set(key, arr.slice(start, stop + 1))
    },
    async lrange(
      key: string,
      start: string | number = 0,
      stop: string | number = -1
    ) {
      if (isExpired(key)) return []
      const arr = lists.get(key) || []
      const s = Number(start)
      const e = Number(stop)
      if (e === -1) return arr.slice(s)
      return arr.slice(s, e + 1)
    },
    on() {
      return this
    },
  }
}

// Usamos un único cliente: mock en test, ioredis en otros entornos.
const buildRedisClient = (): RedisLike => {
  if (process.env.NODE_ENV === "test") return createInMemoryRedis()

  const redisUrl = process.env.REDIS_URL
  const baseOpts = {
    lazyConnect: true,
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
  }

  const client = redisUrl
    ? new Redis(redisUrl, baseOpts)
    : new Redis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT) || 6379,
        ...baseOpts,
      })

  client.on("error", (err) => console.error("Redis Error:", err))
  return client
}

const redis: RedisLike = buildRedisClient()

export { redis }
