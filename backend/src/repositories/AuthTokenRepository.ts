import { auth_tokens, Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma.js"

export interface IAuthTokenRepository {
  create(data: Prisma.auth_tokensCreateInput): Promise<auth_tokens>
  findFirst(where: Prisma.auth_tokensWhereInput): Promise<auth_tokens | null>
  deleteMany(where: Prisma.auth_tokensWhereInput): Promise<number>
}

export class AuthTokenRepository implements IAuthTokenRepository {
  async create(data: Prisma.auth_tokensCreateInput): Promise<auth_tokens> {
    return prisma.auth_tokens.create({ data })
  }

  async findFirst(
    where: Prisma.auth_tokensWhereInput
  ): Promise<auth_tokens | null> {
    return prisma.auth_tokens.findFirst({ where })
  }

  async deleteMany(where: Prisma.auth_tokensWhereInput): Promise<number> {
    const result = await prisma.auth_tokens.deleteMany({ where })
    return result.count
  }
}

export const authTokenRepository = new AuthTokenRepository()
