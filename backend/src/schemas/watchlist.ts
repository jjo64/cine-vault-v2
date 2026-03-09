import { z } from "zod"

/* ==========================================================================
   SCHEMAS DE WATCHLIST — Validación de entrada con Zod
   ========================================================================== */

/** Añadir una película a la watchlist */
export const agregarWatchlistSchema = z.object({
  movie_id: z.coerce
    .number({ error: "movie_id debe ser un número" })
    .int("movie_id debe ser un entero")
    .positive("movie_id debe ser positivo"),
})

/** Eliminar una película de la watchlist (acepta movie_id en body) */
export const eliminarWatchlistSchema = z.object({
  movie_id: z.coerce
    .number({ error: "movie_id debe ser un número" })
    .int("movie_id debe ser un entero")
    .positive("movie_id debe ser positivo"),
})

export type AgregarWatchlistDTO = z.infer<typeof agregarWatchlistSchema>
export type EliminarWatchlistDTO = z.infer<typeof eliminarWatchlistSchema>
