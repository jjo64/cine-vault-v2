import { Request, Response } from "express"
import * as watchlistService from "../services/watchlist.services.js"

/* ==========================================================================
   CONTROLADOR DE WATCHLIST
   --------------------------------------------------------------------------
   Responsabilidad ÚNICA: extraer datos del request, llamar al servicio y
   devolver res. Sin try/catch manuales — el manejadorErrores global se ocupa.
   ========================================================================== */

export const getMyWatchlist = async (req: Request, res: Response) => {
  const result = await watchlistService.obtenerWatchlistService(
    req.user!.user_id
  )
  res.json(result)
}

export const getWatchlistByUser = async (req: Request, res: Response) => {
  const result = await watchlistService.obtenerWatchlistService(
    Number(req.params.id_user)
  )
  res.json(result)
}

export const addMovieToWatchlist = async (req: Request, res: Response) => {
  await watchlistService.agregarAWatchlistService(req.user!.user_id, req.body)
  res.status(201).json({
    message: `Película ${req.body.movie_id} añadida a la watchlist`,
  })
}

export const removeMovieFromWatchlist = async (req: Request, res: Response) => {
  await watchlistService.eliminarDeWatchlistService(req.user!.user_id, req.body)
  res.json({ message: "Película eliminada de la watchlist" })
}
