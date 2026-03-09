import {
  reviews,
  review_likes,
  reports,
  review_comments,
  Prisma,
} from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import type { CrearResenaDTO, ActualizarResenaDTO } from "../schemas/reviews.js"

/* ==========================================================================
   REVIEWS REPOSITORY
   --------------------------------------------------------------------------
   Abstrae todas las queries de Prisma relacionadas con reseñas, likes,
   comentarios y reportes. Los servicios consumen esta interfaz sin saber
   nada de Prisma, lo que permite testeabilidad y sustitución de ORM.
   ========================================================================== */

/** Campos seguros que se devuelven por defecto en listas de reseñas */
const REVIEW_SELECT = {
  id: true,
  user_id: true,
  movie_id: true,
  content: true,
  rating: true,
  likes: true,
  created_at: true,
  movies_ref: {
    select: {
      tmdb_id: true,
    },
  },
} as const

export interface MovieReviewsAggregate {
  movie_id: number
  review_count: number
  avg_rating: number | null
  likes_total: number
}

export interface IReviewsRepository {
  findByUserId(userId: number): Promise<Partial<reviews>[]>
  findByMovieId(movieId: number): Promise<Partial<reviews>[]>
  findByUserAndMovie(userId: number, movieId: number): Promise<reviews | null>
  findById(id: number): Promise<reviews | null>
  aggregateByMovie(movieId: number): Promise<MovieReviewsAggregate>
  create(userId: number, data: CrearResenaDTO): Promise<reviews>
  update(id: number, data: ActualizarResenaDTO): Promise<reviews>
  delete(id: number): Promise<void>
  // Likes
  findLike(userId: number, reviewId: number): Promise<review_likes | null>
  addLikeTransaction(
    userId: number,
    reviewId: number
  ): Promise<{ like: review_likes; review: reviews }>
  removeLikeTransaction(
    userId: number,
    reviewId: number
  ): Promise<{ like: review_likes; review: reviews }>
  // Reportes
  createReport(
    reporterId: number,
    reviewId: number,
    reason: string
  ): Promise<reports>
  // Comentarios
  findCommentsByReviewId(reviewId: number): Promise<review_comments[]>
  findCommentById(id: number): Promise<review_comments | null>
  createComment(
    reviewId: number,
    userId: number,
    content: string
  ): Promise<review_comments>
  updateComment(id: number, content: string): Promise<review_comments>
  deleteComment(id: number): Promise<void>
}

export class ReviewsRepository implements IReviewsRepository {
  async findByUserId(userId: number) {
    return prisma.reviews.findMany({
      where: { user_id: userId },
      select: REVIEW_SELECT,
      orderBy: { created_at: "desc" },
    })
  }

  async findByMovieId(movieId: number) {
    return prisma.reviews.findMany({
      where: { movie_id: movieId },
      select: REVIEW_SELECT,
      orderBy: { created_at: "desc" },
    })
  }

  async findByUserAndMovie(userId: number, movieId: number) {
    return prisma.reviews.findFirst({
      where: { user_id: userId, movie_id: movieId },
    })
  }

  async findById(id: number) {
    return prisma.reviews.findUnique({ where: { id } })
  }

  async aggregateByMovie(movieId: number) {
    const aggregate = await prisma.reviews.aggregate({
      where: { movie_id: movieId },
      _count: { id: true },
      _avg: { rating: true },
      _sum: { likes: true },
    })

    return {
      movie_id: movieId,
      review_count: aggregate._count.id,
      avg_rating: aggregate._avg.rating ? Number(aggregate._avg.rating) : null,
      likes_total: aggregate._sum.likes ?? 0,
    }
  }

  async create(userId: number, data: CrearResenaDTO) {
    return prisma.reviews.create({
      data: {
        user_id: userId,
        movie_id: data.movie_id,
        content: data.content,
        rating: data.rating,
      },
    })
  }

  async update(id: number, data: ActualizarResenaDTO) {
    return prisma.reviews.update({
      where: { id },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.rating !== undefined && { rating: data.rating }),
      },
    })
  }

  async delete(id: number) {
    await prisma.reviews.delete({ where: { id } })
  }

  // ---- Likes ----

  async findLike(userId: number, reviewId: number) {
    return prisma.review_likes.findUnique({
      where: { user_id_review_id: { user_id: userId, review_id: reviewId } },
    })
  }

  async addLikeTransaction(userId: number, reviewId: number) {
    const [like, review] = await prisma.$transaction([
      prisma.review_likes.create({
        data: { user_id: userId, review_id: reviewId },
      }),
      prisma.reviews.update({
        where: { id: reviewId },
        data: { likes: { increment: 1 } },
      }),
    ])
    return { like, review }
  }

  async removeLikeTransaction(userId: number, reviewId: number) {
    const [like, review] = await prisma.$transaction([
      prisma.review_likes.delete({
        where: {
          user_id_review_id: { user_id: userId, review_id: reviewId },
        },
      }),
      prisma.reviews.update({
        where: { id: reviewId },
        data: { likes: { decrement: 1 } },
      }),
    ])
    return { like, review }
  }

  // ---- Reportes ----

  async createReport(reporterId: number, reviewId: number, reason: string) {
    return prisma.reports.create({
      data: {
        reporter_id: reporterId,
        review_id: reviewId,
        reason,
        status: "pending",
      },
    })
  }

  // ---- Comentarios ----

  async findCommentsByReviewId(reviewId: number) {
    return prisma.review_comments.findMany({
      where: { review_id: reviewId },
      include: {
        users: { select: { id: true, username: true, avatar_url: true } },
      },
      orderBy: { created_at: "asc" },
    })
  }

  async findCommentById(id: number) {
    return prisma.review_comments.findUnique({ where: { id } })
  }

  async createComment(reviewId: number, userId: number, content: string) {
    return prisma.review_comments.create({
      data: { review_id: reviewId, user_id: userId, content },
      include: {
        users: { select: { id: true, username: true, avatar_url: true } },
      },
    })
  }

  async updateComment(id: number, content: string) {
    return prisma.review_comments.update({
      where: { id },
      data: { content },
    })
  }

  async deleteComment(id: number) {
    await prisma.review_comments.delete({ where: { id } })
  }
}

export const reviewsRepository = new ReviewsRepository()
