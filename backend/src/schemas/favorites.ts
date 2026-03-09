import { z } from "zod"

/* ==========================================================================
   SCHEMAS DE FAVORITOS — Validación de entrada con Zod
   ========================================================================== */

/** Añadir una película a favoritos con posición de ranking opcional */
export const agregarFavoritoSchema = z.object({
  movieId: z.coerce
    .number({ error: "movieId debe ser un número" })
    .int("movieId debe ser un entero")
    .positive("movieId debe ser positivo"),
  rank_position: z.coerce
    .number()
    .int("rank_position debe ser un entero")
    .positive("rank_position debe ser positivo")
    .nullable()
    .optional(),
})

export type AgregarFavoritoDTO = z.infer<typeof agregarFavoritoSchema>
