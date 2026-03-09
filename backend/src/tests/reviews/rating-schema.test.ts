import { describe, it, expect } from "vitest"
import { crearResenaSchema } from "../../schemas/reviews.js"

describe("reviews rating schema", () => {
  it("acepta ratings de 1 a 5 en pasos de 0.5", () => {
    const valid = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
    for (const val of valid) {
      const result = crearResenaSchema.safeParse({
        movie_id: 1,
        content: "ok",
        rating: val,
      })
      expect(result.success).toBe(true)
    }
  })

  it("rechaza ratings fuera de rango", () => {
    const invalid = [0, 0.5, 5.5, 10, "abc"]
    for (const val of invalid) {
      const result = crearResenaSchema.safeParse({
        movie_id: 1,
        content: "ok",
        rating: val,
      })
      expect(result.success).toBe(false)
    }
  })
})
