import { describe, it, expect, vi, beforeEach } from "vitest"
import { isDuplicateComment } from "../../services/security.services.js"

vi.mock("ioredis", () => {
  class RedisMock {
    store = new Map<string, string[]>()
    async lpush(key: string, value: string) {
      const arr = this.store.get(key) || []
      arr.unshift(value)
      this.store.set(key, arr)
      return arr.length
    }
    async ltrim(key: string, start: number, stop: number) {
      const arr = this.store.get(key) || []
      this.store.set(key, arr.slice(start, stop + 1))
    }
    async lrange(key: string, start = 0, stop = -1) {
      const arr = this.store.get(key) || []
      if (stop === -1) return arr.slice(start)
      return arr.slice(start, stop + 1)
    }
    on() {
      return this
    }
  }
  return { Redis: RedisMock }
})

describe("isDuplicateComment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("detecta duplicados al tercer envío", async () => {
    const comment = "igual"
    const userId = "u1"
    expect(await isDuplicateComment(userId, comment)).toBe(false)
    expect(await isDuplicateComment(userId, comment)).toBe(false)
    expect(await isDuplicateComment(userId, comment)).toBe(true)
  })
})
