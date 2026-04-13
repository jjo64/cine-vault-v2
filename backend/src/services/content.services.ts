import { ContentModerationError } from "../errors/AppErrors.js"

/* ==========================================================================
   SERVICIO DE MODERACIÓN DE CONTENIDO
   --------------------------------------------------------------------------
   Analiza texto antes de guardarlo en la BD usando la API de moderación
   de OpenAI. Es gratuita y detecta contenido inapropiado automáticamente.
   Se llama desde los servicios de reseñas y comentarios antes de crear
   cualquier contenido generado por el usuario.
   ========================================================================== */

// Categorías que devuelve OpenAI — cada una indica un tipo de contenido
interface ModerationResult {
  flagged: boolean        // true si el contenido es inapropiado
  categories: {
    hate: boolean
    harassment: boolean
    sexual: boolean
    violence: boolean
    "self-harm": boolean
  }
}

/**
 * Analiza un texto y devuelve si es inapropiado.
 * Si la API falla, deja pasar el contenido — mejor publicar algo
 * dudoso que bloquear contenido legítimo por un error de red.
 */
export const moderarTexto = async (texto: string): Promise<ModerationResult> => {
  try {
    const respuesta = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ input: texto }),
    })

    const datos = await respuesta.json() as {
  results: Array<{
    flagged: boolean
    categories: {
      hate: boolean
      harassment: boolean
      sexual: boolean
      violence: boolean
      "self-harm": boolean
    }
  }>
}
const resultado = datos.results[0]

    return {
      flagged: resultado.flagged,
      categories: {
        hate: resultado.categories.hate,
        harassment: resultado.categories.harassment,
        sexual: resultado.categories.sexual,
        violence: resultado.categories.violence,
        "self-harm": resultado.categories["self-harm"],
      },
    }
  } catch (error) {
    // Si la API falla, dejamos pasar el contenido para no bloquear al usuario
    console.warn("[Moderación] API de OpenAI no disponible, contenido no moderado:", error)
    return {
      flagged: false,
      categories: {
        hate: false,
        harassment: false,
        sexual: false,
        violence: false,
        "self-harm": false,
      },
    }
  }
}

/**
 * Lanza un error si el texto contiene contenido inapropiado.
 * Es el helper que usan los servicios directamente.
 */
export const verificarContenido = async (texto: string): Promise<void> => {
  if (!texto || texto.trim().length === 0) return

  const resultado = await moderarTexto(texto)

  if (resultado.flagged) {
    // Construimos un mensaje descriptivo según qué categoría fue detectada
    const categorias = Object.entries(resultado.categories)
      .filter(([_, valor]) => valor)
      .map(([categoria]) => categoria)
      .join(", ")

    throw new ContentModerationError(`Contenido no permitido: ${categorias}`)
  }
}