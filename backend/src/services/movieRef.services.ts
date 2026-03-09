import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export const findMovieRefIdByCandidate = async (
  candidate: number
): Promise<number | null> => {
  const byId = await prisma.movies_ref.findUnique({
    where: { id: candidate },
    select: { id: true },
  })
  if (byId) return byId.id

  const byTmdb = await prisma.movies_ref.findUnique({
    where: { tmdb_id: candidate },
    select: { id: true },
  })

  return byTmdb?.id ?? null
}

export const ensureMovieRefId = async (candidate: number): Promise<number> => {
  const existing = await findMovieRefIdByCandidate(candidate)
  if (existing) return existing

  try {
    const created = await prisma.movies_ref.create({
      data: { tmdb_id: candidate },
      select: { id: true },
    })
    return created.id
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const raceSafeLookup = await prisma.movies_ref.findUnique({
        where: { tmdb_id: candidate },
        select: { id: true },
      })
      if (raceSafeLookup) return raceSafeLookup.id
    }
    throw error
  }
}
