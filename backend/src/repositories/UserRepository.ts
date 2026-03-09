import { users, Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma.js"

// Advanced Types: Utility definitions para Omitir campos delicados
// y Tipos Dinámicos en las respuestas de la base de datos
export type UserWithoutPassword = Omit<users, "password" | "two_factor_secret">
export type CreateUserInput = Prisma.usersCreateInput

export interface IUserRepository {
  findById(id: number): Promise<users | null>
  findByEmail(email: string): Promise<users | null>
  findByUsername(username: string): Promise<users | null>
  create(data: CreateUserInput): Promise<users>
  update(id: number, data: Partial<CreateUserInput>): Promise<users>
}

export class UserRepository implements IUserRepository {
  async findById(id: number): Promise<users | null> {
    return prisma.users.findUnique({ where: { id } })
  }

  async findByEmail(email: string): Promise<users | null> {
    return prisma.users.findUnique({ where: { email } })
  }

  async findByUsername(username: string): Promise<users | null> {
    return prisma.users.findUnique({ where: { username } })
  }

  async create(data: CreateUserInput): Promise<users> {
    return prisma.users.create({ data })
  }

  async update(id: number, data: Partial<CreateUserInput>): Promise<users> {
    return prisma.users.update({
      where: { id },
      data,
    })
  }

  // Ejemplo de tipo para retorno seguro sin password (Mapeo avanzado)
  async getSafeProfile(id: number): Promise<UserWithoutPassword | null> {
    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        role: true,
        avatar_url: true,
        two_factor_enabled: true,
        is_verified: true,
      },
    })
    return user as UserWithoutPassword | null
  }
}

// Exportamos en formato singleton por comodidad y Node.js patterns (Sin DI pesada por ahora)
export const userRepository = new UserRepository()
