import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Eye,
  Film,
  Flame,
  Heart,
  MessageCircle,
  Play,
  Search as SearchIcon,
  Star,
  Trophy,
} from 'lucide-react'
import { authorizedJson, getCurrentUser, logoutCurrentUser } from '../services/authServices'
import { getMyLists } from '../services/listsServices'
import { createSlug } from '../utils/stringUtils'
import './HomeLogged.css'

type ZoneId = 'entrada' | 'sala' | 'vitrina'

type DiaryEntry = {
  movie_id: number
  watched_date: string | null
  tmdb_id: number | null
  movie_info?: {
    title?: string
    poster_path?: string | null
  } | null
  review?: {
    rating?: number | null
    content?: string | null
    created_at?: string
  } | null
}

type WatchlistEntry = {
  movie_id: number
  tmdb_id: number | null
  added_at?: string | null
  movie_info?: {
    title?: string
    poster_path?: string | null
  } | null
}

type ReviewEntry = {
  id: number
  movie_id: number
  tmdb_id?: number | null
  content: string | null
  rating: number | null
  likes?: number
  created_at: string
}

type VaultEntry = {
  movie_id: number
  tmdb_id: number | null
  movie_info?: {
    title?: string
    poster_path?: string | null
    release_date?: string
  } | null
  added_at?: string | null
}

type FollowingUser = {
  id: number
  username: string
  avatar_url?: string | null
}

type DirectorAutopsy = {
  person_id: number
  name: string
  profile_path: string | null
  nationality: string
  statistics?: {
    total_movies?: number
  }
}

type MentirasRanking = {
  shame?: Array<{
    id: number
    title: string
    poster: string
    voterCount: number
  }>
  completed?: Array<{
    id: number
    title: string
    poster: string
    finishRate: number
  }>
}

type UserListSummary = {
  id: number
  name: string
  items_count: number
  itemsCount?: number
  is_public?: boolean
  description?: string | null
}

type MovieMeta = {
  title: string
  posterUrl: string
  backdropUrl: string
  year: number | null
  director: string
  runtimeLabel: string
  genres: string[]
  overview: string | null
}

type FeedItem = {
  id: number
  user: string
  username: string
  avatar: string
  film: string
  movieId: number
  tmdbId: number | null
  rating: number
  text: string
  likes: number
  comments: number
  posterUrl: string
}

type FollowingActivityItem = {
  user: string
  username: string
  avatar: string
  film: string
  movieId: number
  tmdbId: number | null
  rating: number
  time: string
  posterUrl: string
}

type FollowingReviewItem = {
  id: number
  user: string
  username: string
  avatar: string
  movieId: number
  tmdbId: number | null
  rating: number
  text: string
  likes: number
  createdAt: string
}

interface HomeLoggedProps {
  username: string
}

const API_URL = import.meta.env.VITE_API_URL
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

const C = {
  bg: '#080808',
  surface: '#111111',
  elevated: '#1A1A1A',
  border: '#252525',
  accent: '#D4AF7A',
  accentDim: '#9A7A48',
  accentGlow: 'rgba(212,175,122,0.12)',
  text: '#E2E2E2',
  textSoft: '#7A7A7A',
  textMuted: '#3A3A3A',
  gold: '#C8A96E',
} as const

const SERIF = "'Cormorant Garamond', serif"
const SANS = "'Syne', sans-serif"

const DIRECTOR_IDS = [5655, 12453, 6384, 13757, 4405, 6648]

const ZONES: { id: ZoneId; symbol: string; name: string; subtitle: string; desc: string }[] = [
  { id: 'entrada', symbol: '◈', name: 'La Entrada', subtitle: 'Descubrimiento · Reto nocturno · Feed', desc: 'Tu portal diario al cine' },
  { id: 'sala', symbol: '◫', name: 'Tu Sala', subtitle: 'Vault · Diario · Progreso', desc: 'El rincon que es tuyo' },
  { id: 'vitrina', symbol: '◳', name: 'La Vitrina', subtitle: 'Buscar · Directores · Listas', desc: 'El catalogo infinito' },
]

function toPoster(path?: string | null) {
  if (!path) return '/no-poster.svg'
  if (path.startsWith('http')) return path
  return `${TMDB_IMG}${path}`
}

function toBackdrop(path?: string | null) {
  if (!path) return '/no-poster.svg'
  if (path.startsWith('http')) return path
  return `https://image.tmdb.org/t/p/original${path}`
}

function normalizeRating(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(5, parsed))
}

function relativeLabel(date?: string | null) {
  if (!date) return 'reciente'
  const diffMs = Date.now() - new Date(date).getTime()
  const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)))
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days}d`
  return 'hace mas de 1 semana'
}

function initials(name: string) {
  const source = name.replace('@', '').trim()
  if (!source) return 'C'
  return source.slice(0, 1).toUpperCase()
}

function movieHref(movieId: number, tmdbId: number | null, title: string) {
  const resolved = tmdbId ?? movieId
  return `/movie/${resolved}-${createSlug(title || 'pelicula')}`
}

function Grain() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 900,
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.045\'/%3E%3C/svg%3E")',
        opacity: 0.38,
      }}
    />
  )
}

function Img({ src, alt, style, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false)
  if (failed) return <div style={{ ...style, background: C.elevated }} />
  return <img src={src} alt={alt} style={style} onError={() => setFailed(true)} {...rest} />
}

function SectionLabel({ children, link, linkHref }: { children: React.ReactNode; link?: string; linkHref?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.accent, fontFamily: SANS }}>{children}</div>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${C.border}, transparent)` }} />
      {link ? (
        <Link
          to={linkHref || '#'}
          style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: C.textSoft,
            textDecoration: 'none',
            fontFamily: SANS,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
          }}
        >
          {link} <ChevronRight size={11} />
        </Link>
      ) : null}
    </div>
  )
}

export default function HomeLogged({ username }: HomeLoggedProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const resolveZone = (value: string | null): ZoneId => {
    if (value === 'sala' || value === 'vitrina') return value
    return 'entrada'
  }
  const [activeZone, setActiveZone] = useState<ZoneId>(() => resolveZone(searchParams.get('zona')))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [diary, setDiary] = useState<DiaryEntry[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [reviews, setReviews] = useState<ReviewEntry[]>([])
  const [vault, setVault] = useState<VaultEntry[]>([])
  const [lists, setLists] = useState<UserListSummary[]>([])
  const [followingActivity, setFollowingActivity] = useState<FollowingActivityItem[]>([])
  const [followingReviews, setFollowingReviews] = useState<FollowingReviewItem[]>([])
  const [directors, setDirectors] = useState<DirectorAutopsy[]>([])
  const [mentiras, setMentiras] = useState<MentirasRanking>({})
  const [metaByTmdb, setMetaByTmdb] = useState<Record<number, MovieMeta>>({})
  const [searchValue, setSearchValue] = useState('')
  const [watchedTonight, setWatchedTonight] = useState(false)
  const [likedFeedIds, setLikedFeedIds] = useState<Set<number>>(new Set())
  const [likeBusyIds, setLikeBusyIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const nextZone = resolveZone(searchParams.get('zona'))
    setActiveZone((prev) => (prev === nextZone ? prev : nextZone))
  }, [searchParams])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (next.get('zona') === activeZone) return
    next.set('zona', activeZone)
    setSearchParams(next, { replace: true })
  }, [activeZone, searchParams, setSearchParams])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const me = await getCurrentUser()
        if (!active) return

        const [diaryRes, watchlistRes, reviewsRes, vaultRes, listsRes, followingRes, mentirasRes, directorsRes] = await Promise.allSettled([
          authorizedJson<{ diary?: DiaryEntry[] }>('/api/diary'),
          authorizedJson<WatchlistEntry[]>('/api/watchlist'),
          authorizedJson<ReviewEntry[]>('/api/reviews'),
          authorizedJson<VaultEntry[]>('/api/vault'),
          getMyLists(),
          fetch(`${API_URL}/api/users/${me.id}/following`).then((res) => (res.ok ? res.json() : [] as FollowingUser[])),
          fetch(`${API_URL}/api/mentiras/ranking`).then((res) => (res.ok ? res.json() : {} as MentirasRanking)),
          Promise.all(
            DIRECTOR_IDS.map((id) => fetch(`${API_URL}/api/directors/${id}/autopsy`).then((res) => (res.ok ? res.json() : null)).catch(() => null))
          ),
        ])

        if (!active) return

        const diaryData = diaryRes.status === 'fulfilled' ? diaryRes.value.diary || [] : []
        const watchlistData = watchlistRes.status === 'fulfilled' ? watchlistRes.value || [] : []
        const reviewsData = reviewsRes.status === 'fulfilled' ? reviewsRes.value || [] : []
        const vaultData = vaultRes.status === 'fulfilled' ? vaultRes.value || [] : []
        const listsData = listsRes.status === 'fulfilled' ? listsRes.value || [] : []
        const followingData = followingRes.status === 'fulfilled' ? (Array.isArray(followingRes.value) ? followingRes.value : []) : []

        setDiary(diaryData)
        setWatchlist(watchlistData)
        setReviews(reviewsData)
        setVault(vaultData)
        setLists(Array.isArray(listsData) ? listsData : [])

        if (mentirasRes.status === 'fulfilled') {
          setMentiras(mentirasRes.value || {})
        }

        if (directorsRes.status === 'fulfilled') {
          setDirectors((directorsRes.value || []).filter((item): item is DirectorAutopsy => Boolean(item)))
        }

        const followingUsers = followingData.slice(0, 6)
        const activityRaw = await Promise.all(
          followingUsers.map(async (user) => {
            try {
              const response = await fetch(`${API_URL}/api/diary/${user.id}`)
              if (!response.ok) return null
              const payload = (await response.json()) as { diary?: DiaryEntry[] }
              const first = payload.diary?.[0]
              if (!first) return null

              return {
                user: `@${user.username}`,
                username: user.username,
                avatar: initials(user.username),
                film: first.movie_info?.title || `Pelicula ${first.movie_id}`,
                movieId: first.movie_id,
                tmdbId: first.tmdb_id ?? null,
                rating: normalizeRating(first.review?.rating),
                time: relativeLabel(first.watched_date || first.review?.created_at || null),
                posterUrl: toPoster(first.movie_info?.poster_path),
              } satisfies FollowingActivityItem
            } catch {
              return null
            }
          })
        )

        if (!active) return
        setFollowingActivity(activityRaw.filter((item): item is FollowingActivityItem => Boolean(item)))

        const reviewsByFollowing = await Promise.all(
          followingUsers.map(async (user) => {
            try {
              const response = await fetch(`${API_URL}/api/reviews/user/${user.id}`)
              if (!response.ok) return [] as FollowingReviewItem[]
              const payload = (await response.json()) as ReviewEntry[]
              if (!Array.isArray(payload)) return [] as FollowingReviewItem[]

              return payload.slice(0, 2).map((review) => ({
                id: review.id,
                user: user.username,
                username: user.username,
                avatar: initials(user.username),
                movieId: review.movie_id,
                tmdbId: review.tmdb_id ?? null,
                rating: normalizeRating(review.rating),
                text: (review.content || 'Sin comentario.').trim(),
                likes: review.likes || 0,
                createdAt: review.created_at,
              }))
            } catch {
              return [] as FollowingReviewItem[]
            }
          })
        )

        if (!active) return
        setFollowingReviews(
          reviewsByFollowing
            .flat()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 4)
        )

        const tmdbIds = new Set<number>()

        for (const entry of diaryData) if (entry.tmdb_id) tmdbIds.add(entry.tmdb_id)
        for (const entry of watchlistData) if (entry.tmdb_id) tmdbIds.add(entry.tmdb_id)
        for (const entry of vaultData) if (entry.tmdb_id) tmdbIds.add(entry.tmdb_id)
        for (const entry of reviewsData) if (entry.tmdb_id) tmdbIds.add(entry.tmdb_id)
        for (const item of activityRaw) if (item?.tmdbId) tmdbIds.add(item.tmdbId)
        for (const item of reviewsByFollowing.flat()) if (item.tmdbId) tmdbIds.add(item.tmdbId)

        const ids = Array.from(tmdbIds).slice(0, 40)
        const metaEntries = await Promise.all(
          ids.map(async (tmdbId) => {
            try {
              const response = await fetch(`${API_URL}/api/movies/${tmdbId}`)
              if (!response.ok) return null
              const data = await response.json()
              const director = (data.credits?.crew || []).find((crew: { job?: string; name?: string }) => crew.job === 'Director')?.name || 'Desconocido'
              const runtime = typeof data.runtime === 'number' ? data.runtime : null
              const runtimeLabel = runtime ? `${Math.floor(runtime / 60)}h ${runtime % 60}m` : 'Duracion N/D'
              const genres = Array.isArray(data.genres) ? data.genres.slice(0, 3).map((g: { name?: string }) => g.name || '').filter(Boolean) : []
              const year = data.release_date ? Number(String(data.release_date).slice(0, 4)) : null
              const overview = typeof data.overview === 'string' && data.overview.trim().length > 0 ? data.overview.trim() : null

              return [
                tmdbId,
                {
                  title: data.title || `Pelicula ${tmdbId}`,
                  posterUrl: toPoster(data.poster_path),
                  backdropUrl: toBackdrop(data.backdrop_path || data.poster_path),
                  year,
                  director,
                  runtimeLabel,
                  genres,
                  overview,
                } satisfies MovieMeta,
              ] as const
            } catch {
              return null
            }
          })
        )

        if (!active) return
        setMetaByTmdb(Object.fromEntries(metaEntries.filter((entry): entry is readonly [number, MovieMeta] => Boolean(entry))))
      } catch {
        if (!active) return
        setError('No se pudo cargar Home Logged')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const greetingName = useMemo(() => {
    const cleaned = username?.trim() || ''
    if (!cleaned) return 'cinefilo'
    return cleaned.slice(0, 1).toUpperCase() + cleaned.slice(1)
  }, [username])

  const tonightFilm = useMemo(() => {
    const candidate = watchlist[0] || diary[0] || null
    if (!candidate) return null
    const tmdbId = candidate.tmdb_id ?? null
    const meta = tmdbId ? metaByTmdb[tmdbId] : null
    const title = candidate.movie_info?.title || meta?.title || `Pelicula ${candidate.movie_id}`
    return {
      movieId: candidate.movie_id,
      tmdbId,
      title,
      year: meta?.year || null,
      director: meta?.director || 'Desconocido',
      duration: meta?.runtimeLabel || 'Duracion N/D',
      synopsis: meta?.overview || 'Una recomendacion basada en tu historial reciente y tus patrones de watchlist.',
      points: 40,
      genres: meta?.genres?.length ? meta.genres : ['Drama', 'Autor'],
      posterUrl: meta?.posterUrl || toPoster(candidate.movie_info?.poster_path),
      backdropUrl: meta?.backdropUrl || meta?.posterUrl || toPoster(candidate.movie_info?.poster_path),
    }
  }, [watchlist, diary, metaByTmdb])

  const becauseYouWatched = useMemo(() => {
    const base = [...watchlist, ...diary]
    const seen = new Set<number>()
    const result: Array<{ movieId: number; tmdbId: number | null; title: string; director: string; rating: number; posterUrl: string }> = []

    for (const item of base) {
      if (seen.has(item.movie_id)) continue
      seen.add(item.movie_id)
      const tmdbId = item.tmdb_id ?? null
      const meta = tmdbId ? metaByTmdb[tmdbId] : null
      result.push({
        movieId: item.movie_id,
        tmdbId,
        title: item.movie_info?.title || meta?.title || `Pelicula ${item.movie_id}`,
        director: meta?.director || 'Desconocido',
        rating: 4 + ((result.length % 3) * 0.2),
        posterUrl: meta?.posterUrl || toPoster(item.movie_info?.poster_path),
      })
      if (result.length === 8) break
    }

    return result
  }, [watchlist, diary, metaByTmdb])

  const feedRapido = useMemo(() => {
    return followingReviews.map((review, index) => {
      const tmdbId = review.tmdbId ?? null
      const meta = tmdbId ? metaByTmdb[tmdbId] : null
      const text = (review.text || 'Sin comentario.').trim()
      return {
        id: review.id,
        user: review.user,
        username: review.username,
        avatar: review.avatar,
        film: meta?.title || `Pelicula ${review.movieId}`,
        movieId: review.movieId,
        tmdbId,
        rating: normalizeRating(review.rating),
        text,
        likes: review.likes || 0,
        comments: 12 + index * 7,
        posterUrl: meta?.posterUrl || '/no-poster.svg',
      } satisfies FeedItem
    })
  }, [followingReviews, metaByTmdb])

  const vaultCards = useMemo(() => {
    return vault.slice(0, 3).map((item, index) => {
      const tmdbId = item.tmdb_id ?? null
      const meta = tmdbId ? metaByTmdb[tmdbId] : null
      const title = item.movie_info?.title || meta?.title || `Pelicula ${item.movie_id}`
      const type = index % 3 === 0 ? 'Reflexion' : index % 3 === 1 ? 'Edit' : 'Critica'
      return {
        id: item.movie_id,
        type,
        title,
        duration: ['12 min', '6 min', '18 min'][index % 3],
        views: 800 + index * 320,
        posterUrl: meta?.posterUrl || toPoster(item.movie_info?.poster_path),
        tmdbId,
      }
    })
  }, [vault, metaByTmdb])

  const diaryHighlights = useMemo(() => {
    return diary.slice(0, 2).map((entry) => {
      const tmdbId = entry.tmdb_id ?? null
      const meta = tmdbId ? metaByTmdb[tmdbId] : null
      return {
        movieId: entry.movie_id,
        tmdbId,
        film: entry.movie_info?.title || meta?.title || `Pelicula ${entry.movie_id}`,
        text: entry.review?.content?.trim() || 'Sin nota para esta entrada.',
        rating: normalizeRating(entry.review?.rating),
        date: relativeLabel(entry.watched_date || entry.review?.created_at || null),
        posterUrl: meta?.posterUrl || toPoster(entry.movie_info?.poster_path),
      }
    })
  }, [diary, metaByTmdb])

  const weekStats = useMemo(() => {
    const normalizedProfile = encodeURIComponent((username || greetingName).trim().toLowerCase())
    const reviewHref = normalizedProfile
      ? `/${normalizedProfile}?tab=Reseñas`
      : '/profile?tab=Reseñas'

    return [
      { num: String(diary.length), label: 'Peliculas', icon: <Film size={16} /> },
      { num: String(reviews.length), label: 'Reseñas', icon: <BookOpen size={16} />, href: reviewHref },
      { num: String(Math.min(7, Math.max(1, Math.floor((diary.length + watchlist.length) / 2))),), label: 'Dias de racha', icon: <Flame size={16} /> },
      { num: String(reviews.length * 40 + diary.length * 15), label: 'Puntos', icon: <Trophy size={16} /> },
    ]
  }, [diary.length, reviews.length, watchlist.length, username, greetingName])

  const directorCards = useMemo(() => {
    return directors
      .filter((director) => (director.statistics?.total_movies || 0) > 0)
      .slice(0, 6)
      .map((director) => ({
      id: director.person_id,
      name: director.name,
      nationality: director.nationality || 'N/D',
      films: director.statistics?.total_movies || 0,
      img: director.profile_path ? toPoster(director.profile_path) : null,
    }))
  }, [directors])

  const communityLists = useMemo(() => {
    const own = lists.slice(0, 2).map((list) => ({
      id: list.id,
      title: list.name,
      count: (list.items_count || list.itemsCount || 0),
      user: `@${greetingName.toLowerCase()}`,
      img: '/no-poster.svg',
      href: '/lists',
    }))

    const shame = (mentiras.shame || []).slice(0, 1).map((item) => ({
      id: 1000 + item.id,
      title: `Ranking: ${item.title}`,
      count: item.voterCount || 0,
      user: '@cinevault',
      img: item.poster || '/no-poster.svg',
      href: '/mentiras',
    }))

    const complete = (mentiras.completed || []).slice(0, 1).map((item) => ({
      id: 2000 + item.id,
      title: `Top completadas: ${item.title}`,
      count: item.finishRate || 0,
      user: '@cinevault',
      img: item.poster || '/no-poster.svg',
      href: '/mentiras',
    }))

    return [...own, ...shame, ...complete].slice(0, 3)
  }, [lists, mentiras, greetingName])

  const hasData = tonightFilm || becauseYouWatched.length > 0 || feedRapido.length > 0
  const profileHref = `/${encodeURIComponent((username || greetingName).trim().toLowerCase())}`
  const myVaultHref = `${profileHref}/vault`

  const handleToggleFeedLike = async (reviewId: number) => {
    if (likeBusyIds.has(reviewId)) return
    const wasLiked = likedFeedIds.has(reviewId)

    setLikeBusyIds((prev) => new Set(prev).add(reviewId))
    setLikedFeedIds((prev) => {
      const next = new Set(prev)
      if (wasLiked) next.delete(reviewId)
      else next.add(reviewId)
      return next
    })
    setFollowingReviews((prev) =>
      prev.map((item) =>
        item.id === reviewId
          ? { ...item, likes: Math.max(0, item.likes + (wasLiked ? -1 : 1)) }
          : item
      )
    )

    try {
      await authorizedJson(`/api/reviews/${reviewId}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
      })
    } catch {
      setLikedFeedIds((prev) => {
        const next = new Set(prev)
        if (wasLiked) next.add(reviewId)
        else next.delete(reviewId)
        return next
      })
      setFollowingReviews((prev) =>
        prev.map((item) =>
          item.id === reviewId
            ? { ...item, likes: Math.max(0, item.likes + (wasLiked ? 1 : -1)) }
            : item
        )
      )
    } finally {
      setLikeBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(reviewId)
        return next
      })
    }
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchValue.trim()) return
    navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`)
  }

  const renderEntrada = () => (
    <motion.div key="entrada" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ marginBottom: 56 }}>
        <SectionLabel link="Ver catalogo" linkHref="/search">Esta noche para vos</SectionLabel>
        {tonightFilm ? (
          <div style={{ position: 'relative', overflow: 'hidden', background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}` }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <Img src={tonightFilm.backdropUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', filter: 'saturate(0.28) brightness(0.33)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(8,8,8,0.96) 34%, rgba(8,8,8,0.76) 63%, rgba(8,8,8,0.45) 86%, rgba(8,8,8,0.24) 100%)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 0% 42%, rgba(212,175,122,0.18) 0%, rgba(212,175,122,0.05) 20%, transparent 44%)' }} />
            </div>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 340, height: '100%', background: `linear-gradient(90deg, rgba(212,175,122,0.16), rgba(212,175,122,0.02), transparent)`, pointerEvents: 'none' }} />
            <div className="hl-tonight-inner">
              <Link to={movieHref(tonightFilm.movieId, tonightFilm.tmdbId, tonightFilm.title)} className="hl-tonight-poster" style={{ textDecoration: 'none' }}>
                <div style={{ width: '100%', height: '100%' }}>
                  <Img src={tonightFilm.posterUrl} alt={tonightFilm.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.7)' }} />
                </div>
              </Link>
              <div style={{ maxWidth: 620, paddingTop: 10 }}>
                <div style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.accent, marginBottom: 10, lineHeight: 1 }}>Recomendacion personal</div>
                <Link to={movieHref(tonightFilm.movieId, tonightFilm.tmdbId, tonightFilm.title)} style={{ textDecoration: 'none' }}>
                  <div style={{ fontFamily: SERIF, fontSize: 'clamp(26px,3vw,38px)', fontWeight: 300, lineHeight: 1.05, color: C.text, marginBottom: 4, letterSpacing: '-0.01em' }}>{tonightFilm.title}</div>
                </Link>
                <div style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.accent, marginBottom: 6 }}>{tonightFilm.director}</div>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.textSoft, marginBottom: 14, lineHeight: 1.1 }}>{tonightFilm.year || 'N/D'} · {tonightFilm.duration}</div>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, lineHeight: 1.65, color: 'rgba(226,226,226,0.65)', margin: '0 0 18px', maxWidth: 520, minHeight: 78, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tonightFilm.synopsis}</p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                  {tonightFilm.genres.map((g) => (
                    <span key={g} style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textSoft, border: `1px solid ${C.border}`, padding: '3px 9px', fontFamily: SANS }}>{g}</span>
                  ))}
                </div>
                <div className="hl-tonight-meta-row">
                  <button
                    onClick={() => setWatchedTonight((v) => !v)}
                    aria-pressed={watchedTonight}
                    aria-label={watchedTonight ? 'Quitar marca de vista' : 'Marcar película como vista'}
                    style={{ padding: '10px 24px', background: watchedTonight ? C.accentDim : C.accent, color: C.bg, border: 'none', fontFamily: SANS, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
                  >
                    {watchedTonight ? <><Check size={11} aria-hidden="true" /> Vista</> : 'Marcar como vista'}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.gold, fontFamily: SANS, fontSize: 11 }}><Trophy size={12} fill={C.gold} color={C.gold} /> +{tonightFilm.points} pts esta noche</div>
                </div>
              </div>
                <Link to={movieHref(tonightFilm.movieId, tonightFilm.tmdbId, tonightFilm.title)} className="hl-tonight-actions" style={{ textDecoration: 'none', flexShrink: 0, alignSelf: 'center' }}>
                  <div style={{ width: 28, height: 28, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSoft }}>
                    <ArrowRight size={12} />
                  </div>
                </Link>
            </div>
          </div>
        ) : (
          <div style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.textSoft, padding: 20 }}>Todavia no hay peliculas para recomendarte esta noche.</div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ marginBottom: 56 }}>
        <SectionLabel link="Ver todo" linkHref="/for-you">Porque viste <em style={{ fontStyle: 'italic', color: C.accent, marginLeft: 4 }}>{diary[0]?.movie_info?.title || 'tu ultima pelicula'}</em></SectionLabel>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
          {becauseYouWatched.map((film) => (
            <Link key={film.movieId} to={movieHref(film.movieId, film.tmdbId, film.title)} style={{ textDecoration: 'none', flexShrink: 0, width: 130 }}>
              <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.25 }}>
                <div style={{ aspectRatio: '2/3', borderRadius: 1, overflow: 'hidden', marginBottom: 10, border: `1px solid ${C.border}` }}>
                  <Img src={film.posterUrl} alt={film.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.6)' }} />
                </div>
                <div style={{ fontFamily: SANS, fontSize: 12, color: C.text, lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{film.title}</div>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: C.textSoft, textAlign: 'left', marginTop: 1 }}>{film.director}</div>
                <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                  {[1, 2, 3, 4, 5].map((s) => <span key={s} style={{ fontSize: 9, color: s <= Math.round(film.rating) ? C.gold : C.textMuted }}>★</span>)}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ marginBottom: 56 }}>
        <SectionLabel link="Ver actividad" linkHref="/feed">Tus seguidos vieron</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {followingActivity.map((item, i) => (
            <motion.div
              key={`${item.user}-${item.movieId}`}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              className="hl-activity-row"
            >
              <Link to={`/${encodeURIComponent(item.username)}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                <div className="hl-activity-avatar">{item.avatar}</div>
              </Link>
              <Link to={movieHref(item.movieId, item.tmdbId, item.film)} className="hl-activity-poster-link" style={{ textDecoration: 'none' }}>
                <div style={{ aspectRatio: '2/3', borderRadius: 1, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                  <Img src={item.posterUrl} alt={item.film} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.4)' }} />
                </div>
              </Link>
              <div>
                <Link to={`/${encodeURIComponent(item.username)}`} style={{ fontFamily: SANS, fontSize: 13, color: C.text, textDecoration: 'none' }}>{item.user}</Link>
                <span style={{ fontFamily: SANS, fontSize: 12, color: C.textSoft }}> vio </span>
                <Link to={movieHref(item.movieId, item.tmdbId, item.film)} style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: C.accent, textDecoration: 'none' }}>{item.film}</Link>
                <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                  {[1, 2, 3, 4, 5].map((s) => <span key={s} style={{ fontSize: 10, color: s <= item.rating ? C.gold : C.textMuted }}>★</span>)}
                </div>
              </div>
              <div style={{ fontFamily: SANS, fontSize: 10, color: C.textMuted, letterSpacing: '0.06em', textAlign: 'right' }}>{item.time}</div>
            </motion.div>
          ))}
          {followingActivity.length === 0 ? (
            <div style={{ color: C.textSoft, borderBottom: `1px solid ${C.border}`, padding: '12px 0' }}>Todavia no hay actividad visible de usuarios seguidos.</div>
          ) : null}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ marginBottom: 32 }}>
        <SectionLabel link="Abrir feed" linkHref="/feed">Feed rapido</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {feedRapido.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }} className="hl-feed-post">
              <Link to={movieHref(post.movieId, post.tmdbId, post.film)} style={{ textDecoration: 'none' }}>
                <div className="hl-feed-poster" style={{ borderRadius: 1, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                  <Img src={post.posterUrl} alt={post.film} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.4)' }} />
                </div>
              </Link>
              <div>
                <div className="hl-feed-header">
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <Link to={`/${encodeURIComponent(post.username)}`} style={{ textDecoration: 'none' }}>
                      <div className="hl-activity-avatar" style={{ width: 26, height: 26, fontSize: 12 }}>{post.avatar}</div>
                    </Link>
                    <Link to={`/${encodeURIComponent(post.username)}`} style={{ fontFamily: SANS, fontSize: 12, color: C.text, textDecoration: 'none' }}>{post.user}</Link>
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="hl-feed-action-label" style={{ fontFamily: SANS, fontSize: 11, color: C.textMuted }}>reseño</span>
                    <Link to={movieHref(post.movieId, post.tmdbId, post.film)} style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: C.accent, textDecoration: 'none' }}>{post.film}</Link>
                    <div style={{ display: 'flex', gap: 1 }}>{[1, 2, 3, 4, 5].map((s) => <span key={s} style={{ fontSize: 9, color: s <= post.rating ? C.gold : C.textMuted }}>★</span>)}</div>
                  </div>
                </div>
                <Link
                  to={`/${encodeURIComponent(post.username)}/movie/${post.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <p style={{
                    fontFamily: SERIF,
                    fontStyle: 'italic',
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: C.textSoft,
                    margin: 0,
                    cursor: 'pointer',
                    transition: 'color 0.18s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.textSoft)}
                  >
                    {post.text}
                  </p>
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, paddingTop: 4 }}>
                <button
                  onClick={() => handleToggleFeedLike(post.id)}
                  disabled={likeBusyIds.has(post.id)}
                  aria-label={likedFeedIds.has(post.id) ? `Quitar like (${post.likes} likes)` : `Dar like (${post.likes} likes)`}
                  aria-pressed={likedFeedIds.has(post.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, color: likedFeedIds.has(post.id) ? C.accent : C.textSoft, fontFamily: SANS, fontSize: 11, border: 'none', background: 'none', padding: 0, cursor: likeBusyIds.has(post.id) ? 'default' : 'pointer' }}
                >
                  <Heart size={13} strokeWidth={1.5} fill={likedFeedIds.has(post.id) ? C.accent : 'none'} aria-hidden="true" />
                  <span aria-hidden="true">{post.likes}</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.textMuted, fontFamily: SANS, fontSize: 11 }}><MessageCircle size={12} strokeWidth={1.5} /> {post.comments}</div>
              </div>
            </motion.div>
          ))}
          <Link to="/feed" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0', color: C.accent, textDecoration: 'none', fontFamily: SANS, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Abrir el feed completo <ArrowRight size={13} />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )

  const renderSala = () => (
    <motion.div key="sala" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ marginBottom: 48 }}>
        <SectionLabel link="Ver todo mi Vault" linkHref={myVaultHref}>Mi Vault</SectionLabel>
        <div className="hl-vault-grid">
          {vaultCards.map((item) => (
            <Link key={item.id} to={movieHref(item.id, item.tmdbId, item.title)} style={{ textDecoration: 'none' }}>
              <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} style={{ cursor: 'pointer', background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden' }}>
                  <Img src={item.posterUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.45) brightness(0.62)' }} />
                  <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.accent, border: `1px solid ${C.accentDim}`, padding: '2px 7px', fontFamily: SANS, background: 'rgba(8,8,8,0.7)' }}>{item.type}</div>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(8,8,8,0.6)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={11} fill="white" color="white" style={{ marginLeft: 2 }} />
                    </div>
                  </div>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontFamily: SERIF, fontSize: 15, color: C.text, lineHeight: 1.3, marginBottom: 5 }}>{item.title}</div>
                  <div style={{ display: 'flex', gap: 12, fontFamily: SANS, fontSize: 10, color: C.textSoft }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={9} /> {item.duration}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={9} /> {item.views.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      <div className="hl-two-col">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ marginBottom: 48 }}>
          <SectionLabel link="Abrir diario" linkHref="/diary">Mi Diario</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {diaryHighlights.map((entry) => (
              <motion.div key={entry.movieId} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 16, padding: '20px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ aspectRatio: '2/3', borderRadius: 1, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                  <Img src={entry.posterUrl} alt={entry.film} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.4)' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 17, color: C.text }}>{entry.film}</span>
                    <div style={{ display: 'flex', gap: 2 }}>{[1, 2, 3, 4, 5].map((s) => <span key={s} style={{ fontSize: 10, color: s <= entry.rating ? C.gold : C.textMuted }}>★</span>)}</div>
                    <span style={{ fontFamily: SANS, fontSize: 10, color: C.textMuted, marginLeft: 'auto' }}>{entry.date}</span>
                  </div>
                  <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, lineHeight: 1.6, color: C.textSoft, margin: 0 }}>{entry.text}</p>
                </div>
              </motion.div>
            ))}
            <Link to="/diary" style={{ marginTop: 16, width: '100%', padding: '12px', background: 'transparent', border: `1px dashed ${C.border}`, color: C.textSoft, fontFamily: SANS, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>
              <BookOpen size={12} /> Añadir entrada
            </Link>
          </div>
        </motion.div>

        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <SectionLabel>Esta semana</SectionLabel>
            <div className="hl-stats-grid">
              {weekStats.map((s) => {
                const content = (
                  <>
                    <div style={{ color: C.accentDim, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
                    <div style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 300, color: C.text, lineHeight: 1 }}>{s.num}</div>
                    <div style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.textMuted, marginTop: 5 }}>{s.label}</div>
                  </>
                )

                if (!s.href) {
                  return <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '20px 16px', textAlign: 'center' }}>{content}</div>
                }

                return (
                  <Link key={s.label} to={s.href} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '20px 16px', textAlign: 'center', textDecoration: 'none', cursor: 'pointer' }}>
                    {content}
                  </Link>
                )
              })}
            </div>
          </motion.div>

          <div style={{ marginTop: 32, padding: 24, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.accent, fontFamily: SANS, marginBottom: 16 }}>Mis insignias</div>
            {[
              { icon: '🎞️', title: 'Maratonista', desc: '5 peliculas en una semana' },
              { icon: '✍️', title: 'Critica en desarrollo', desc: '50 reseñas escritas' },
              { icon: '🕯️', title: 'Ritual nocturno', desc: '7 noches seguidas' },
            ].map((b) => (
              <div key={b.title} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{b.icon}</span>
                <div>
                  <div style={{ fontFamily: SANS, fontSize: 12, color: C.text }}>{b.title}</div>
                  <div style={{ fontFamily: SANS, fontSize: 11, color: C.textSoft }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )

  const renderVitrina = () => (
    <motion.div key="vitrina" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ marginBottom: 56 }}>
        <SectionLabel>Buscar en CineVault</SectionLabel>
        <form onSubmit={submitSearch} role="search" style={{ position: 'relative', maxWidth: 600 }}>
          <SearchIcon size={16} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: C.textSoft, pointerEvents: 'none' }} aria-hidden="true" />
          <label htmlFor="hl-search-input" style={{
            position: 'absolute', width: 1, height: 1, padding: 0,
            margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap', border: 0,
          }}>Buscar en CineVault</label>
          <input
            id="hl-search-input"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Titulo, director, actor, lista..."
            aria-label="Buscar títulos, directores, actores o listas"
            style={{ width: '100%', padding: '16px 18px 16px 48px', background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontFamily: SANS, fontSize: 14, letterSpacing: '0.03em', outline: 'none', boxSizing: 'border-box' }}
          />
          {searchValue ? (
            <button type="submit" aria-label="Ejecutar búsqueda" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.accent, fontFamily: SANS, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              <span aria-hidden="true">Buscar →</span>
            </button>
          ) : null}
        </form>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ marginBottom: 56 }}>
        <SectionLabel link="Abrir arcos" linkHref="/arcos">Arcos editoriales</SectionLabel>
        <Link to="/arcos" style={{ textDecoration: 'none', display: 'block' }}>
          <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, padding: '20px 22px' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, fontFamily: SANS, marginBottom: 8 }}>
              Ruta de formación
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 26, color: C.text, marginBottom: 10, lineHeight: 1.1 }}>
              Descubre y completa Arcos
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.textSoft, lineHeight: 1.6 }}>
              Secuencias curatoriales pensadas para ver cine con contexto y progresión.
            </div>
          </motion.div>
        </Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ marginBottom: 56 }}>
        <SectionLabel link="Ver todos" linkHref="/search?tab=person">Directores que quizas no conoces</SectionLabel>
        <div className="hl-achievements-grid">
          {directorCards.map((d) => (
            <Link key={d.id} to={`/person/${d.id}`} style={{ textDecoration: 'none' }}>
              <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                {d.img ? (
                  <div style={{ aspectRatio: '1/1', borderRadius: '50%', overflow: 'hidden', border: `1px solid ${C.border}`, marginBottom: 10 }}>
                    <Img src={d.img} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', filter: 'saturate(0.55) brightness(0.8)' }} />
                  </div>
                ) : (
                  <div style={{ aspectRatio: '1/1', borderRadius: '50%', border: `1px solid ${C.border}`, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(212,175,122,0.16), rgba(26,26,26,0.9))', color: C.accent, fontFamily: SERIF, fontSize: 26 }}>
                    {initials(d.name)}
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: SANS, fontSize: 11, color: C.text, lineHeight: 1.3, marginBottom: 2 }}>{d.name}</div>
                  <div style={{ fontFamily: SANS, fontSize: 9, color: C.textMuted, letterSpacing: '0.08em' }}>{d.nationality} · {d.films} films</div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
        <SectionLabel link="Ver todas" linkHref="/lists">Listas de la comunidad</SectionLabel>
        <div className="hl-vault-grid">
          {communityLists.map((list) => (
            <Link key={list.id} to={list.href} style={{ textDecoration: 'none', display: 'block' }}>
              <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} style={{ cursor: 'pointer', background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden' }}>
                  <Img src={list.img} alt={list.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.38) brightness(0.5)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,8,0.9) 0%, transparent 60%)' }} />
                  <div style={{ position: 'absolute', bottom: 10, left: 12, fontFamily: SANS, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.accentDim }}>{list.count} items</div>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontFamily: SERIF, fontSize: 17, color: C.text, lineHeight: 1.3, marginBottom: 5 }}>{list.title}</div>
                  <div style={{ fontFamily: SANS, fontSize: 10, color: C.textSoft }}>{list.user}</div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ marginTop: 40 }}>
        <SectionLabel link="Abrir ranking" linkHref="/mentiras">Mentiras de la comunidad</SectionLabel>
        <Link to="/mentiras" style={{ textDecoration: 'none', display: 'block' }}>
          <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, padding: '20px 22px' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, fontFamily: SANS, marginBottom: 8 }}>
              Honestidad cinefila
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 26, color: C.text, marginBottom: 10, lineHeight: 1.1 }}>
              Que peliculas nadie termina de verdad?
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.textSoft, lineHeight: 1.6 }}>
              Ranking vivo de confesiones y finalizacion real dentro de la comunidad.
            </div>
          </motion.div>
        </Link>
      </motion.div>
    </motion.div>
  )

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: SANS, textAlign: 'left' }}>
      <Grain />

      <div className="hl-nav-offset">
        <div className="hl-greeting-bar">
          <div>
            <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: C.textSoft }}>Bienvenido de vuelta, </span>
            <span style={{ fontFamily: SERIF, fontSize: 17, color: C.text }}>{greetingName}.</span>
          </div>
          <div className="hl-greeting-stats">
            <div className="hl-stat-item">
              <Flame size={12} color={C.accent} /> <span style={{ color: C.text }}>{Math.min(9, Math.max(1, diary.length))}</span> <span className="hl-stat-label">dias de racha</span>
            </div>
            <div className="hl-stat-item">
              <Trophy size={12} color={C.gold} /> <span style={{ color: C.text }}>{reviews.length * 40 + diary.length * 15}</span> <span className="hl-stat-label">puntos</span>
            </div>
            <div className="hl-stat-item">
              <Star size={12} color={C.gold} /> <span style={{ color: C.text }}>{Math.min(7, Math.max(1, Math.floor((reviews.length + watchlist.length) / 3)))}</span> <span className="hl-stat-label">insignias</span>
            </div>
          </div>
        </div>
      </div>

        <div className="hl-zones">
          { ZONES.map((zone, i) => {
            const isActive = activeZone === zone.id
            return (
              <motion.button key={zone.id} onClick={() => setActiveZone(zone.id)} className={`hl-zone-btn ${isActive ? 'active' : ''} ${i < 2 ? 'with-border' : ''}`} whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                <div className="hl-zone-bg" />
                <div className="hl-zone-line" />
                {isActive ? <div className="hl-zone-glow" /> : null}
                <div className="hl-zone-inner">
                  <div className="hl-zone-symbol-wrap">
                    <span className="hl-zone-symbol">{zone.symbol}</span>
                    <div className="hl-zone-dot" />
                  </div>
                  <div className="hl-zone-info">
                    <div className="hl-zone-name">{zone.name}</div>
                    <div className="hl-zone-subtitle">{zone.subtitle}</div>
                  </div>
                  <div className="hl-zone-dots-mobile">
                    {ZONES.map(z => (
                      <div key={z.id} onClick={(e) => { e.stopPropagation(); setActiveZone(z.id)}} className={`hl-zone-dot-btn ${activeZone === z.id ? 'active' : ''}`} />
                    ))}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>

        <div className="hl-main-content">
          {loading ? <div style={{ color: C.textSoft, marginBottom: 16 }}>Cargando Home Logged...</div> : null}
          {error ? <div style={{ color: '#FF8A8A', marginBottom: 16 }}>{error}</div> : null}
          {!loading && !hasData ? <div style={{ color: C.textSoft, marginBottom: 16 }}>No hay actividad suficiente todavia.</div> : null}

          <AnimatePresence mode="wait">
            {activeZone === 'entrada' ? renderEntrada() : null}
            {activeZone === 'sala' ? renderSala() : null}
            {activeZone === 'vitrina' ? renderVitrina() : null}
          </AnimatePresence>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={async () => {
                await logoutCurrentUser()
                navigate('/')
              }}
              aria-label="Cerrar sesión de CineVault"
              style={{ border: `1px solid ${C.border}`, background: C.elevated, color: '#FF8A8A', padding: '9px 12px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: SERIF, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textMuted, textDecoration: 'none' }}>Cine<span style={{ color: C.accent }}>Vault</span></Link>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: C.textMuted }}>&quot;Toda gran coleccion empieza con una.&quot;</div>
      </footer>
    </div>
  )
}
