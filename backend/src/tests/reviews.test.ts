import { describe, it, expect, beforeAll, afterAll } from "vitest"
import request from "supertest"
import express from "express"
import cookieParser from "cookie-parser"
import { prisma } from "../lib/prisma.js"
import rutasResenas from "../routes/reviews.routes.js"
import { manejadorErrores } from "../middlewares/error.middlewares.js"
import { crearTokenAcceso } from "../lib/tokens.js"

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use("/api/reviews", rutasResenas)
app.use(manejadorErrores)

let tokenTest: string
let userId: number
let movieId: number
let reviewId: number

beforeAll(async () => {
  const user = await prisma.users.create({
    data: {
      username: `reviewer_${Date.now()}`,
      email: `reviewer_${Date.now()}@cinevault.com`,
      password: "hashedpassword",
      is_verified: true,
    },
  })
  userId = user.id
  tokenTest = crearTokenAcceso(user.id, user.role!, user.is_verified)

  const movie = await prisma.movies_ref.create({
    data: { tmdb_id: Math.floor(Math.random() * 999999) },
  })
  movieId = movie.id
})

afterAll(async () => {
  await prisma.reviews.deleteMany({ where: { user_id: userId } })
  await prisma.movies_ref.deleteMany({ where: { id: movieId } })
  await prisma.users.deleteMany({ where: { id: userId } })
})

describe("Reviews", () => {
  it("POST /api/reviews — crea una reseña correctamente", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${tokenTest}`)
      .send({ movie_id: movieId, rating: 4.5, content: "Test reseña" })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("id")
    expect(Number(res.body.rating)).toBe(4.5)
    reviewId = res.body.id
  })

  it("GET /api/reviews/movie/:movieId — obtiene reseñas de una película", async () => {
    const res = await request(app).get(`/api/reviews/movie/${movieId}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it("PATCH /api/reviews/:reviewId — actualiza una reseña", async () => {
    const res = await request(app)
      .patch(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${tokenTest}`)
      .send({ rating: 5, content: "Actualizada" })

    expect(res.status).toBe(200)
    expect(Number(res.body.rating)).toBe(5)
  })

  it("PATCH /api/reviews/:reviewId — falla si no es el dueño", async () => {
    const otroUser = await prisma.users.create({
      data: {
        username: `otro_${Date.now()}`,
        email: `otro_${Date.now()}@cinevault.com`,
        password: "hashedpassword",
        is_verified: true,
      },
    })
    const otroToken = crearTokenAcceso(
      otroUser.id,
      otroUser.role!,
      otroUser.is_verified
    )

    const res = await request(app)
      .patch(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${otroToken}`)
      .send({ rating: 1, content: "Intento editar la reseña ajena" })

    expect(res.status).toBe(403)

    await prisma.users.delete({ where: { id: otroUser.id } })
  })

  it("DELETE /api/reviews/:reviewId — elimina una reseña", async () => {
    const res = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${tokenTest}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe("Reseña eliminada correctamente")
  })
})
