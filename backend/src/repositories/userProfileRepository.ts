import { Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma.js"

type ActualizarPerfilData = {
  username?: string
  avatar_url?: string
  bio?: string
}

export interface IUserProfileRepository {
  findById(id: number): Promise<UserPublicProfile | null>
  findByUsername(username: string): Promise<UserPublicProfile | null>
  findAll(): Promise<UserSummary[]>
  search(query: string, take: number): Promise<UserSearchResult[]>
  update(id: number, data: ActualizarPerfilData): Promise<void>
  createFollow(followerId: number, followingId: number): Promise<void>
  deleteFollow(
    followerId: number,
    followingId: number
  ): Promise<{ count: number }>
  findFollow(
    viewerId: number,
    targetId: number
  ): Promise<{ follower_id: number } | null>
  findFollowers(id: number): Promise<FollowsWithFollower | null>
  findFollowing(id: number): Promise<FollowsWithFollowing | null>
  findCinematographicSignature(id: number): Promise<RawRow[]>
  findCuratedGallery(id: number): Promise<RawRow[]>
}

// ─── Tipos locales ────────────────────────────────────────────────────────────

type RawRow = Record<string, string | number | null>

type UserPublicProfile = {
  id: number
  username: string
  avatar_url: string | null
  bio: string | null
  created_at: Date
  _count: {
    reviews: number
    diary_entries: number
    watchlist: number
    follows_follows_follower_idTousers: number
    follows_follows_following_idTousers: number
  }
}

type UserSummary = {
  id: number
  username: string
  email: string
  role: string
  avatar_url: string | null
}

type UserSearchResult = {
  id: number
  username: string
  avatar_url: string | null
  bio: string | null
  _count: { reviews: number }
}

type FollowsWithFollower = Awaited<
  ReturnType<typeof prisma.users.findUnique>
> & {
  follows_follows_following_idTousers: Array<{
    users_follows_follower_idTousers: {
      id: number
      username: string
      avatar_url: string | null
    } | null
  }>
}

type FollowsWithFollowing = Awaited<
  ReturnType<typeof prisma.users.findUnique>
> & {
  follows_follows_follower_idTousers: Array<{
    users_follows_following_idTousers: {
      id: number
      username: string
      avatar_url: string | null
    } | null
  }>
}

// ─── Implementación ───────────────────────────────────────────────────────────

export class UserProfileRepository implements IUserProfileRepository {
  async findPublicById(id: number) {
    return prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatar_url: true,
        bio: true,
        created_at: true,
        _count: {
          select: {
            reviews: true,
            diary_entries: true,
            watchlist: true,
            follows_follows_follower_idTousers: true,
            follows_follows_following_idTousers: true,
          },
        },
      },
    })
  }

  async findPublicByUsername(username: string) {
    return prisma.users.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        avatar_url: true,
        bio: true,
        created_at: true,
        _count: {
          select: {
            reviews: true,
            diary_entries: true,
            watchlist: true,
            follows_follows_follower_idTousers: true,
            follows_follows_following_idTousers: true,
          },
        },
      },
    })
  }

  async findById(id: number) {
    return prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatar_url: true,
        bio: true,
        created_at: true,
        _count: {
          select: {
            reviews: true,
            diary_entries: true,
            watchlist: true,
            follows_follows_follower_idTousers: true,
            follows_follows_following_idTousers: true,
          },
        },
      },
    }) as Promise<UserPublicProfile | null>
  }

  async findByUsername(username: string) {
    return prisma.users.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        avatar_url: true,
        bio: true,
        created_at: true,
        _count: {
          select: {
            reviews: true,
            diary_entries: true,
            watchlist: true,
            follows_follows_follower_idTousers: true,
            follows_follows_following_idTousers: true,
          },
        },
      },
    }) as Promise<UserPublicProfile | null>
  }

  async findAll() {
    return prisma.users.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar_url: true,
      },
    }) as Promise<UserSummary[]>
  }

  async search(query: string, take: number) {
    return prisma.users.findMany({
      where: {
        OR: [{ username: { contains: query } }, { bio: { contains: query } }],
      },
      select: {
        id: true,
        username: true,
        avatar_url: true,
        bio: true,
        _count: { select: { reviews: true } },
      },
      orderBy: [{ username: "asc" }],
      take,
    }) as Promise<UserSearchResult[]>
  }

  async update(id: number, data: ActualizarPerfilData) {
    await prisma.users.update({ where: { id }, data })
  }

  async createFollow(followerId: number, followingId: number) {
    await prisma.follows.create({
      data: { follower_id: followerId, following_id: followingId },
    })
  }

  async deleteFollow(followerId: number, followingId: number) {
    return prisma.follows.deleteMany({
      where: { follower_id: followerId, following_id: followingId },
    })
  }

  async findFollow(viewerId: number, targetId: number) {
    return prisma.follows.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: viewerId,
          following_id: targetId,
        },
      },
      select: { follower_id: true },
    })
  }

  async findFollowers(id: number) {
    return prisma.users.findUnique({
      where: { id },
      include: {
        follows_follows_following_idTousers: {
          include: {
            users_follows_follower_idTousers: {
              select: { id: true, username: true, avatar_url: true },
            },
          },
        },
      },
    })
  }

  async findFollowing(id: number) {
    return prisma.users.findUnique({
      where: { id },
      include: {
        follows_follows_follower_idTousers: {
          include: {
            users_follows_following_idTousers: {
              select: { id: true, username: true, avatar_url: true },
            },
          },
        },
      },
    })
  }

  async findCinematographicSignature(id: number): Promise<RawRow[]> {
    return prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT
        user_id, pivotal_film, pivotal_film_detail,
        formative_director, formative_director_detail,
        unforgettable_scene, unforgettable_scene_detail,
        cinema_turning_year, cinema_turning_year_detail
      FROM cinematographic_signature
      WHERE user_id = ${id}
      LIMIT 1
    `)
  }

  async findCuratedGallery(id: number): Promise<RawRow[]> {
    return prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT cgi.movie_id, cgi.order_index, cgi.note, mr.tmdb_id
      FROM curated_gallery_items cgi
      INNER JOIN movies_ref mr ON mr.id = cgi.movie_id
      WHERE cgi.user_id = ${id}
      ORDER BY cgi.order_index ASC
    `)
  }
}

export const userProfileRepository = new UserProfileRepository()
