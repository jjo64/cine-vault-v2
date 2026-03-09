import { Request, Response } from "express"
import * as favoritiesService from "../services/favorities.services.js"

/* ==========================================================================
   CONTROLADOR DE FAVORITOS
   --------------------------------------------------------------------------
   Responsabilidad ÚNICA: extraer datos del request, llamar al servicio y
   devolver res. Sin Prisma directo.
   ========================================================================== */

export const getFavorites = async (req: Request, res: Response) => {
  const favoritos = await favoritiesService.obtenerFavoritosService(
    req.user!.user_id
  )
  res.json(favoritos)
}

export const getFavoritesByUserId = async (req: Request, res: Response) => {
  const favoritos = await favoritiesService.obtenerFavoritosPorUsuarioService(
    Number(req.params.userId)
  )
  res.json(favoritos)
}

export const addMovieToFavorites = async (req: Request, res: Response) => {
  const favorito = await favoritiesService.agregarFavoritoService(
    req.user!.user_id,
    req.body
  )
  res.status(201).json(favorito)
}

export const removeMovieFromFavorites = async (req: Request, res: Response) => {
  await favoritiesService.eliminarFavoritoService(
    req.user!.user_id,
    Number(req.params.movieId)
  )
  res.json({ message: "Eliminado de favoritos" })
}
