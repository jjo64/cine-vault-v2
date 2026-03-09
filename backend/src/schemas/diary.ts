import { z } from "zod"

/* ==========================================================================
   SCHEMAS DE DIARIO — Validación de entrada con Zod
   ========================================================================== */

/** Crear una entrada en el diario de visionado */
export const crearEntradaDiarioSchema = z.object({
  movie_id: z.coerce
    .number({ error: "movie_id debe ser un número" })
    .int("movie_id debe ser un entero")
    .positive("movie_id debe ser positivo"),
  watched_date: z
    .string()
    .date({ message: "watched_date debe ser YYYY-MM-DD" })
    .optional(),
  notes: z
    .string()
    .max(1000, "Las notas no pueden superar 1000 caracteres")
    .optional(),
})

export type CrearEntradaDiarioDTO = z.infer<typeof crearEntradaDiarioSchema>
