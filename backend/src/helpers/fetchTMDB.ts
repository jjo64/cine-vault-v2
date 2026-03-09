/**
 * Helper para centralizar las peticiones a la API de TMDB.
 * Todas las respuestas se solicitan en español (es-ES) por defecto.
 */
export const consultarTMDB = async (
  endpoint: string,
  params: Record<string, string> = {}
) => {
  const parametrosUrl = new URLSearchParams({
    language: "es-ES",
    ...params,
  })
  const url = `https://api.themoviedb.org/3/${endpoint}?${parametrosUrl.toString()}`
  const opciones = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.API_KEY_TMDB}`,
    },
  }

  const respuesta = await fetch(url, opciones)
  if (!respuesta.ok) {
    throw new Error(`Error de TMDB. Estado: ${respuesta.status}`)
  }
  return respuesta.json()
}
