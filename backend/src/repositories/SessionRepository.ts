import { sessions, Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma.js"

export interface ISessionRepository {
  create(data: Prisma.sessionsCreateInput): Promise<sessions>
  findByHashAndId(id: string, tokenHash: string): Promise<sessions | null>
  deleteById(id: string): Promise<void>
  deleteManyByUser(userId: number): Promise<number>
  deleteManyByUserExcept(userId: number, keepSessionId: string): Promise<number>
  findByUser(
    userId: number
  ): Promise<
    Pick<
      sessions,
      "id" | "user_agent" | "ip_address" | "created_at" | "expires_at"
    >[]
  >
  findById(id: string): Promise<sessions | null>
}

export class SessionRepository implements ISessionRepository {
  async create(data: Prisma.sessionsCreateInput): Promise<sessions> {
    return prisma.sessions.create({ data })
  }

  async findByHashAndId(
    id: string,
    tokenHash: string
  ): Promise<sessions | null> {
    return prisma.sessions.findFirst({ where: { id, token_hash: tokenHash } })
  }

  async deleteById(id: string): Promise<void> {
    await prisma.sessions.delete({ where: { id } }).catch(() => null)
  }

  async deleteManyByUser(userId: number): Promise<number> {
    const result = await prisma.sessions.deleteMany({
      where: { user_id: userId },
    })
    return result.count
  }

  async deleteManyByUserExcept(
    userId: number,
    keepSessionId: string
  ): Promise<number> {
    const result = await prisma.sessions.deleteMany({
      where: { user_id: userId, NOT: { id: keepSessionId } },
    })
    return result.count
  }

  async findByUser(userId: number) {
    return prisma.sessions.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        user_agent: true,
        ip_address: true,
        created_at: true,
        expires_at: true,
      },
      orderBy: { created_at: "desc" },
    })
  }

  async findById(id: string): Promise<sessions | null> {
    return prisma.sessions.findUnique({ where: { id } })
  }
}

export const sessionRepository = new SessionRepository()
