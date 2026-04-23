import { authorizedJson } from './authServices'

const API_URL = import.meta.env.VITE_API_URL
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

export type ArcoSummary = {
  id: number
  slug: string
  title: string
  description: string | null
  level: string
  official: boolean
  films: number
  usersCompleted: number
}

export type ArcoMovie = {
  movie_id: number
  tmdb_id: number | null
  order: number
  optional: boolean
  note: string | null
  watched: boolean
  movie_info: {
    title: string
    poster_path: string
    release_date: string
  } | null
}

export type ArcoDetail = {
  id: number
  slug: string
  title: string
  description: string | null
  level: string
  official: boolean
  films: number
  usersCompleted: number
  progress: {
    completed: number
    total: number
    percentage: number
  }
  movies: ArcoMovie[]
}

export const toTmdbPoster = (posterPath?: string | null) =>
  posterPath ? `${TMDB_IMG}${posterPath}` : ''

export async function fetchArcos(): Promise<ArcoSummary[]> {
  const response = await fetch(`${API_URL}/api/arcos`)
  if (!response.ok) throw new Error(`Error ${response.status}`)

  const payload = (await response.json()) as ArcoSummary[]
  return Array.isArray(payload) ? payload : []
}

export async function fetchArcoDetail(arcoId: number): Promise<ArcoDetail> {
  const response = await fetch(`${API_URL}/api/arcos/${arcoId}`)
  if (!response.ok) throw new Error(`Error ${response.status}`)

  return (await response.json()) as ArcoDetail
}

export async function marcarProgresoArco(arcoId: number, movieId: number) {
  return authorizedJson<{ message: string; arco_id: number; movie_id: number }>(
    `/api/arcos/${arcoId}/progress`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movie_id: movieId }),
    }
  )
}
