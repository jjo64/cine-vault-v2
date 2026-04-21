import { z } from "zod"

/* ==========================================================================
   SCHEMAS DE RESEÑAS — Validación de entrada con Zod
   --------------------------------------------------------------------------
   Cada schema se exporta junto a su tipo inferido (`z.infer`) para que
   los servicios consuman tipos seguros en lugar de `any` o `req.body` crudo.
   ========================================================================== */

const ratingStep = z.coerce
  .number({ error: "rating debe ser numérico" })
  .min(1, "El rating mínimo es 1")
  .max(5, "El rating máximo es 5")
  .refine((n) => Number.isFinite(n) && (n * 2) % 1 === 0, {
    message: "El rating debe avanzar de a 0.5",
  })

/** Crear una nueva reseña */
export const crearResenaSchema = z.object({
  movie_id: z.coerce
    .number({ error: "movie_id debe ser un número" })
    .int("movie_id debe ser un entero")
    .positive("movie_id debe ser positivo"),
  content: z
    .string()
    .min(1, "El contenido no puede estar vacío")
    .max(2000, "El contenido no puede superar 2000 caracteres"),
  rating: ratingStep,
})

/** Actualizar una reseña existente (todos los campos opcionales, movie_id inmutable) */
export const actualizarResenaSchema = z
  .object({
    content: z
      .string()
      .min(1, "El contenido no puede estar vacío")
      .max(2000, "El contenido no puede superar 2000 caracteres")
      .optional(),
    rating: ratingStep.optional(),
  })
  .refine((data) => data.content !== undefined || data.rating !== undefined, {
    message: "Debes proporcionar al menos content o rating para actualizar",
  })

/** Reportar una reseña */
export const reportarResenaSchema = z.object({
  reason: z.enum([
    "lenguaje_ofensivo",
    "spam",
    "spoiler",
    "contenido_inapropiado",
    "acoso",
    "otro",
  ], { error: "El motivo debe ser una de las opciones disponibles" }),
  reason_detail: z
    .string()
    .max(500, "El detalle no puede superar 500 caracteres")
    .optional(),
})

export type ReportarResenaDTO = z.infer<typeof reportarResenaSchema>

/** Comentar en una reseña */
export const crearComentarioSchema = z.object({
  content: z
    .string()
    .min(1, "El comentario no puede estar vacío")
    .max(1000, "El comentario no puede superar 1000 caracteres")
    .transform((s) => s.trim()),
})

export const actualizarComentarioSchema = z.object({
  content: z
    .string()
    .min(1, "El comentario no puede estar vacío")
    .max(1000, "El comentario no puede superar 1000 caracteres")
    .transform((s) => s.trim()),
})

// Tipos inferidos — exportar para usar en servicios y controladores
export type CrearResenaDTO = z.infer<typeof crearResenaSchema>
export type ActualizarResenaDTO = z.infer<typeof actualizarResenaSchema>
export type CrearComentarioDTO = z.infer<typeof crearComentarioSchema>
export type ActualizarComentarioDTO = z.infer<typeof actualizarComentarioSchema>
