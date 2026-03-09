import { Request, Response } from "express"
import * as listsService from "../services/lists.services.js"

export const getMyLists = async (req: Request, res: Response) => {
  const lists = await listsService.getMyListsService(req.user!.user_id)
  res.json(lists)
}

export const getMyListDetail = async (req: Request, res: Response) => {
  const listId = Number(req.params.id)
  const detail = await listsService.getMyListDetailService(req.user!.user_id, listId)
  res.json(detail)
}

export const createList = async (req: Request, res: Response) => {
  const list = await listsService.createListService(req.user!.user_id, req.body)
  res.status(201).json(list)
}

export const updateList = async (req: Request, res: Response) => {
  const listId = Number(req.params.id)
  const updated = await listsService.updateListService(req.user!.user_id, listId, req.body)
  res.json(updated)
}

export const deleteList = async (req: Request, res: Response) => {
  const listId = Number(req.params.id)
  await listsService.deleteListService(req.user!.user_id, listId)
  res.json({ message: "Lista eliminada" })
}

export const addMovieToList = async (req: Request, res: Response) => {
  const listId = Number(req.params.id)
  await listsService.addMovieToListService(req.user!.user_id, listId, req.body)
  res.status(201).json({ message: "Película agregada a la lista" })
}

export const removeMovieFromList = async (req: Request, res: Response) => {
  const listId = Number(req.params.id)
  const movieId = Number(req.params.movie_id)
  await listsService.removeMovieFromListService(req.user!.user_id, listId, movieId)
  res.json({ message: "Película eliminada de la lista" })
}
