import { ContentModerationError } from "../errors/AppErrors.js"
import { alertarAdmins } from "./socket.services.js"

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
  flagged: boolean
  categories: {
    hate: boolean
    harassment: boolean
    sexual: boolean
    violence: boolean
    "self-harm": boolean
  }
}

// Objeto reutilizable que representa un resultado limpio — todo en false
// Se usa cuando la API falla para no bloquear contenido legítimo
// Si se añaden categorías nuevas, solo hay que modificar este objeto
const RESULTADO_LIMPIO: ModerationResult = {
  flagged: false,
  categories: {
    hate: false,
    harassment: false,
    sexual: false,
    violence: false,
    "self-harm": false,
  },
}

/**
 * Analiza un texto y devuelve si es inapropiado.
 * Si la API falla, devuelve RESULTADO_LIMPIO para no bloquear al usuario.
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

    // Verificamos que la respuesta sea exitosa antes de parsear
// fetch no lanza error en códigos 4xx/5xx — solo en fallos de red
  if (!respuesta.ok) {
    console.warn(`[Moderación] OpenAI respondió ${respuesta.status}, contenido no moderado`)
    return RESULTADO_LIMPIO
}

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

    if (!resultado) {
      console.warn("[Moderación] Respuesta inesperada de OpenAI, contenido no moderado")
      return RESULTADO_LIMPIO
    }

    // Casteamos el resultado de la API al tipo ModerationResult
    const objeto_moderado: ModerationResult = {
      flagged: resultado.flagged,
      categories: {
        hate: resultado.categories.hate,
        harassment: resultado.categories.harassment,
        sexual: resultado.categories.sexual,
        violence: resultado.categories.violence,
        "self-harm": resultado.categories["self-harm"],
      },
    }

    return objeto_moderado

  } catch (error) {
    // Si la API falla, devolvemos el objeto limpio para no bloquear al usuario
    console.warn("[Moderación] API de OpenAI no disponible, contenido no moderado:", error)
    return RESULTADO_LIMPIO
  }
}

/**
 * Lanza un error si el texto contiene contenido inapropiado.
 * Es el helper que usan los servicios directamente.
 */
export const verificarContenido = async (texto: string, userId?: number): Promise<void> => {
  if (!texto || texto.trim().length === 0) return

  const resultado = await moderarTexto(texto)

  if (resultado.flagged) {
    const categorias = Object.entries(resultado.categories)
      .filter(([_, valor]) => valor)
      .map(([categoria]) => categoria)
      .join(", ")

  // Alerta en tiempo real a todos los admins conectados
      alertarAdmins("contenido_bloqueado", {
        categorias,
        timestamp: new Date().toISOString(),
        texto: texto.substring(0, 100), // primeros 100 caracteres para contexto
        userId,
      })

    throw new ContentModerationError(`Contenido no permitido: ${categorias}`)
  }
}