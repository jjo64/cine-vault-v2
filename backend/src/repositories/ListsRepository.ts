import { prisma } from "../lib/prisma.js"

type ListEntity = {
  id: number
  user_id: number
  name: string
  description: string | null
  is_public: boolean
  created_at: Date
  updated_at: Date
}

export type ListSummary = {
  id: number
  name: string
  description: string | null
  is_public: boolean
  created_at: Date
  updated_at: Date
  items_count: number
}

export type ListItem = {
  movie_id: number
  tmdb_id: number | null
  added_at: Date
}

export type ListDetail = ListSummary & {
  items: ListItem[]
}

export class ListsRepository {
  async create(userId: number, data: { name: string; description?: string | null; is_public?: boolean }) {
    return prisma.user_lists.create({
      data: {
        user_id: userId,
        name: data.name,
        description: data.description ?? null,
        is_public: data.is_public ?? false,
      },
    }) as Promise<ListEntity>
  }

  async findByIdForUser(listId: number, userId: number) {
    return prisma.user_lists.findFirst({
      where: { id: listId, user_id: userId },
    }) as Promise<ListEntity | null>
  }

  async listByUser(userId: number): Promise<ListSummary[]> {
    const lists = await prisma.user_lists.findMany({
      where: { user_id: userId },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updated_at: "desc" },
    })

    return lists.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      is_public: list.is_public,
      created_at: list.created_at,
      updated_at: list.updated_at,
      items_count: list._count.items,
    }))
  }

  async getDetailForUser(listId: number, userId: number): Promise<ListDetail | null> {
    const list = await prisma.user_lists.findFirst({
      where: { id: listId, user_id: userId },
      include: {
        items: {
          include: {
            movie_ref: {
              select: { tmdb_id: true },
            },
          },
          orderBy: { added_at: "desc" },
        },
        _count: {
          select: { items: true },
        },
      },
    })

    if (!list) return null

    return {
      id: list.id,
      name: list.name,
      description: list.description,
      is_public: list.is_public,
      created_at: list.created_at,
      updated_at: list.updated_at,
      items_count: list._count.items,
      items: list.items.map((item) => ({
        movie_id: item.movie_id,
        tmdb_id: item.movie_ref?.tmdb_id ?? null,
        added_at: item.added_at,
      })),
    }
  }

  async update(listId: number, data: { name?: string; description?: string | null; is_public?: boolean }) {
    return prisma.user_lists.update({
      where: { id: listId },
      data,
    }) as Promise<ListEntity>
  }

  async delete(listId: number) {
    await prisma.user_lists.delete({ where: { id: listId } })
  }

  async addMovie(listId: number, movieRefId: number) {
    return prisma.user_list_items.create({
      data: {
        list_id: listId,
        movie_id: movieRefId,
      },
    })
  }

  async removeMovie(listId: number, movieRefId: number) {
    await prisma.user_list_items.deleteMany({
      where: {
        list_id: listId,
        movie_id: movieRefId,
      },
    })
  }
}

export const listsRepository = new ListsRepository()
