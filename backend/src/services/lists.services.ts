import { ConflictError, NotFoundError } from "../errors/AppErrors.js"
import { listsRepository } from "../repositories/ListsRepository.js"
import {
  AddMovieToListDTO,
  CreateListDTO,
  UpdateListDTO,
} from "../schemas/lists.js"
import { ensureMovieRefId, findMovieRefIdByCandidate } from "./movieRef.services.js"

export const getMyListsService = async (userId: number) => {
  return listsRepository.listByUser(userId)
}

export const getMyListDetailService = async (userId: number, listId: number) => {
  const list = await listsRepository.getDetailForUser(listId, userId)
  if (!list) throw new NotFoundError("Lista no encontrada")
  return list
}

export const createListService = async (userId: number, data: CreateListDTO) => {
  const name = data.name.trim()
  const existing = await listsRepository.listByUser(userId)
  const duplicate = existing.some((list) => list.name.toLowerCase() === name.toLowerCase())

  if (duplicate) {
    throw new ConflictError("Ya existe una lista con ese nombre")
  }

  return listsRepository.create(userId, {
    name,
    description: data.description ?? null,
    is_public: data.is_public ?? false,
  })
}

export const updateListService = async (
  userId: number,
  listId: number,
  data: UpdateListDTO
) => {
  const list = await listsRepository.findByIdForUser(listId, userId)
  if (!list) throw new NotFoundError("Lista no encontrada")

  if (data.name) {
    const existing = await listsRepository.listByUser(userId)
    const duplicate = existing.some(
      (entry) =>
        entry.id !== listId &&
        entry.name.toLowerCase() === data.name!.trim().toLowerCase()
    )
    if (duplicate) throw new ConflictError("Ya existe una lista con ese nombre")
  }

  return listsRepository.update(listId, {
    name: data.name?.trim(),
    description: data.description ?? undefined,
    is_public: data.is_public,
  })
}

export const deleteListService = async (userId: number, listId: number) => {
  const list = await listsRepository.findByIdForUser(listId, userId)
  if (!list) throw new NotFoundError("Lista no encontrada")

  await listsRepository.delete(listId)
}

export const addMovieToListService = async (
  userId: number,
  listId: number,
  data: AddMovieToListDTO
) => {
  const list = await listsRepository.findByIdForUser(listId, userId)
  if (!list) throw new NotFoundError("Lista no encontrada")

  const movieRefId = await ensureMovieRefId(data.movie_id)
  const detail = await listsRepository.getDetailForUser(listId, userId)
  const alreadyInList = detail?.items.some((item) => item.movie_id === movieRefId)
  if (alreadyInList) {
    throw new ConflictError("La película ya está en la lista")
  }

  await listsRepository.addMovie(listId, movieRefId)
}

export const removeMovieFromListService = async (
  userId: number,
  listId: number,
  movieCandidate: number
) => {
  const list = await listsRepository.findByIdForUser(listId, userId)
  if (!list) throw new NotFoundError("Lista no encontrada")

  const movieRefId = await findMovieRefIdByCandidate(movieCandidate)
  if (!movieRefId) return

  await listsRepository.removeMovie(listId, movieRefId)
}
