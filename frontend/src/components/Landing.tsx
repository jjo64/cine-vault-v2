import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'motion/react'
import { Search, ChevronRight, Star, Users, BookOpen, Layers, ArrowRight, Film, Sparkles, Lock, Clapperboard, Menu, X } from 'lucide-react'
import InfiniteSlider from './InfiniteSlider'
import { createSlug } from '../utils/stringUtils'
import { getCurrentUser} from '../services/authServices'
import { resolveNavPathWithFallback } from '../lib/navigation'
import './Landing.css'

const C = {
  bg: '#080808',
  surface: '#111111',
  elevated: '#1A1A1A',
  border: '#252525',
  accent: '#D4AF7A',
  accentDim: '#9A7A48',
  accentGlow: 'rgba(212,175,122,0.10)',
  accentGlowStrong: 'rgba(212,175,122,0.18)',
  text: '#E2E2E2',
  textSoft: '#A1A1A1',
  textMuted: '#B0B0B0',
  gold: '#C8A96E',
} as const


const SERIF = "'Cormorant Garamond', serif"
const SANS = "'Syne', sans-serif"

type SearchMovie = {
  id: number
  title?: string
  name?: string
  media_type?: 'movie' | 'tv' | 'person'
  poster_path?: string | null
  profile_path?: string | null
}

type ApiMovie = {
  id: number
  title: string
  poster_path: string | null
  vote_average: number
  release_date?: string
}

const IMG = {
  hero: 'https://images.unsplash.com/photo-1607421433843-a29d5013cb63?w=1600&q=85',
  cinema: 'https://images.unsplash.com/photo-1759230766134-e3ff1c27d20e?w=1200&q=80',
  woman: 'https://images.unsplash.com/photo-1675277456349-6ca2bf207110?w=900&q=80',
  filmReel: 'https://images.unsplash.com/photo-1619622637662-0104aa03a4af?w=900&q=80',
  street: 'https://images.unsplash.com/photo-1759829381324-f3d2b5ed7f6d?w=900&q=80',
  fog: 'https://images.unsplash.com/photo-1563941433-b6a094653ed2?w=600&q=80',
  nightCity: 'https://images.unsplash.com/photo-1670782128814-c5a55b68f50d?w=600&q=80',
  projector: 'https://images.unsplash.com/photo-1762541693135-fb989de961e1?w=600&q=80',
  womanPortrait: 'https://images.unsplash.com/photo-1761429944940-fe98ec7ba4cb?w=600&q=80',
  italy: 'https://images.unsplash.com/photo-1753731622675-56904104f4a9?w=600&q=80',
  hongKong: 'https://images.unsplash.com/photo-1742695760180-92c9a73ffdf2?w=600&q=80',
  grain: 'https://images.unsplash.com/photo-1698159929266-28e8e8ef6b33?w=600&q=80',
  mistyRoad: 'https://images.unsplash.com/photo-1763713441172-37ed2f89b256?w=600&q=80',
} as const

function Img({ src, alt, style, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [error, setError] = useState(false)
  if (error) return <div style={{ ...style, background: '#1a1a1a' }} />
  return <img src={src} alt={alt} style={style} onError={() => setError(true)} {...rest} />
}

function GrainOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1000,
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
        opacity: 0.4,
      }}
    />
  )
}

function Stars({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 12 12" fill={i < rating ? C.gold : C.textMuted}>
          <path d="M6 1l1.3 2.6L10 4l-2 2 .5 2.8L6 7.5 3.5 8.8 4 6 2 4l2.7-.4z" />
        </svg>
      ))}
    </div>
  )
}

function Typewriter({ texts }: { texts: string[] }) {
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(true)
  const current = texts[idx]

  useEffect(() => {
    const speed = deleting ? 40 : 80
    const timer = window.setTimeout(() => {
      if (!deleting) {
        if (shown.length < current.length) {
          setShown(current.slice(0, shown.length + 1))
        } else {
          window.setTimeout(() => setDeleting(true), 1800)
        }
      } else if (shown.length > 0) {
        setShown(shown.slice(0, -1))
      } else {
        setDeleting(false)
        setIdx((i) => (i + 1) % texts.length)
      }
    }, speed)

    return () => window.clearTimeout(timer)
  }, [shown, deleting, current, texts.length])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCursorVisible((value) => !value)
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <span style={{ color: C.accent }}>
      {shown}
      <span style={{ opacity: cursorVisible ? 1 : 0, borderRight: `2px solid ${C.accent}`, marginLeft: 2 }} />
    </span>
  )
}

function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

function FilmCardMini({
  title,
  year,
  director,
  rating,
  img,
  movieId,
  delay = 0,
}: {
  title: string
  year: number
  director: string
  rating: number
  img: string
  movieId: number
  delay?: number
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <Link to={`/movie/${movieId}-${createSlug(title)}`} style={{ textDecoration: 'none' }} aria-label={`Ver detalles de la película ${title}`}>
        <div
          style={{
            aspectRatio: '2/3',
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative',
            marginBottom: 10,
            transform: hovered ? 'translateY(-6px)' : 'none',
            transition: 'transform 0.3s ease',
            boxShadow: hovered ? '0 20px 40px rgba(0,0,0,0.6)' : 'none',
          }}
        >
          <Img
            src={img}
            alt={title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: hovered ? 'saturate(1)' : 'saturate(0.65)',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'filter 0.4s ease, transform 0.4s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(8,8,8,0.92) 0%, transparent 55%)',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: 12,
            }}
          >
            <Stars rating={rating} size={10} />
            <div style={{ fontSize: 10, color: C.textSoft, fontFamily: SANS, marginTop: 4 }}>{director}</div>
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: `1px solid ${hovered ? C.accentDim : 'transparent'}`,
              transition: 'border-color 0.3s',
              pointerEvents: 'none',
              borderRadius: 2,
            }}
          />
        </div>
      </Link>
      <div style={{ fontSize: 12, color: C.text, fontFamily: SANS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: C.textSoft, fontFamily: SANS }}>{year}</div>
    </motion.div>
  )
}

function Navbar() {
  const navigate = useNavigate()
  const [viewerUsername, setViewerUsername] = useState<string | null>(null)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    let alive = true

    getCurrentUser()
      .then((user) => {
        if (!alive) return
        setViewerUsername(user.username)
      })
      .catch(() => {
        if (!alive) return
        setViewerUsername(null)
      })

    const onAuthChange = (event: Event) => {
      const authEvent = event as CustomEvent<{ authenticated?: boolean }>
      if (authEvent.detail?.authenticated === false) {
        setViewerUsername(null)
        return
      }

      getCurrentUser()
        .then((user) => setViewerUsername(user.username))
        .catch(() => setViewerUsername(null))
    }

    window.addEventListener('auth-state-changed', onAuthChange)
    return () => {
      alive = false
      window.removeEventListener('auth-state-changed', onAuthChange)
    }
  }, [])

  const [scrolled, setScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchMovie[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebouncedValue(searchQuery.trim(), 300)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    if (!debouncedQuery) {
      return
    }

    const controller = new AbortController()

    fetch(`${import.meta.env.VITE_API_URL}/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('search failed')
        return response.json()
      })
      .then((data: { results?: SearchMovie[] }) => {
        setSearchResults(Array.isArray(data?.results) ? data.results : [])
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === 'AbortError') return
        setSearchResults([])
      })

    return () => controller.abort()
  }, [debouncedQuery])

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
      }
    }

    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  const visibleResults = useMemo(() => searchResults.slice(0, 6), [searchResults])
  const navLinks = viewerUsername ? ['Sign in', 'Create account', 'Films', 'Lists', 'Members', 'Journal'] : ['Sign in', 'Create account', 'Films', 'Lists', 'Members', 'Journal']
  const visibleNavLinks = navLinks

  const navigateByType = (item: SearchMovie) => {
    const label = item.title || item.name || 'sin-titulo'
    if (item.media_type === 'person') {
      navigate(`/person/${item.id}`)
      return
    }
    if (item.media_type === 'tv') {
      navigate(`/tv/${item.id}`)
      return
    }
    navigate(`/movie/${item.id}-${createSlug(label)}`)
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={`landing-navbar ${menuOpen ? 'landing-menu-open' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        background: scrolled ? 'rgba(8,8,8,0.97)' : 'rgba(8,8,8,0.6)',
        backdropFilter: 'blur(20px)',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        transition: 'background 0.4s, border-color 0.4s',
      }}
    >
      <Link
        className="landing-logo"
        to="/"
        style={{
          fontFamily: SERIF,
          fontSize: 21,
          fontWeight: 500,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          color: C.text,
          textDecoration: 'none',
          lineHeight: 1,
        }}
      >
        Cine<span style={{ color: C.accent }}>Vault</span>
      </Link>

      <ul className="landing-desktop-links landing-nav-links" style={{ display: 'flex', listStyle: 'none', margin: 0, padding: 0, alignItems: 'center', left: '3%', position: 'relative'}}>
        {visibleNavLinks.map((link) => (
          <li key={link}>
            {link === 'Sign in' || link === 'Create account' ? (
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('open-auth-modal', {
                      detail: { mode: link === 'Create account' ? 'register' : 'login' },
                    })
                  )
                }}
                style={{ fontFamily: SANS, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.text, textDecoration: 'none', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              >
                {link}
              </button>
            ) : (
              <button
                onClick={() => navigate(resolveNavPathWithFallback(link))}
                style={{ fontFamily: SANS, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.text, textDecoration: 'none', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              >
                {link}
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="landing-nav-right">
        <div ref={containerRef} className={`landing-search ${menuOpen ? 'landing-search-compressed' : ''}`} style={{ position: 'relative' }}>
          <div
            className="landing-search-shell"
            style={{
              height: 40,
              borderRadius: 999,
              border: `1px solid ${C.border}`,
              background: 'rgba(255,255,255,0.14)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px 0 14px',
            }}
          >
            <input
              placeholder="Buscar"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(event) => {
                const nextValue = event.target.value
                setSearchQuery(nextValue)
                if (!nextValue.trim()) {
                  setSearchResults([])
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && searchQuery.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
                  setIsSearchFocused(false)
                }
              }}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: C.text,
                fontFamily: SANS,
                letterSpacing: '0.04em',
              }}
            />
            <button
              onClick={() => {
                if (!searchQuery.trim()) return
                navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
                setIsSearchFocused(false)
              }}
              aria-label="Buscar"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: C.textSoft,
                display: 'grid',
                placeItems: 'center',
                padding: 0,
              }}
            >
              <Search size={16} />
            </button>
          </div>

          {isSearchFocused && searchQuery.trim() && (
            <div
              className="landing-search-dropdown"
              style={{
                position: 'absolute',
                top: 46,
                right: 0,
                width: 'min(92vw, 420px)',
                border: `1px solid ${C.border}`,
                background: 'rgba(8,8,8,0.98)',
                borderRadius: 6,
                overflow: 'hidden',
                maxHeight: '65vh',
                overflowY: 'auto',
              }}
            >
              {visibleResults.length > 0 ? (
                visibleResults.map((movie) => (
                  <button
                    key={movie.id}
                    onClick={() => {
                      navigateByType(movie)
                      setIsSearchFocused(false)
                      setSearchQuery('')
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      borderBottom: `1px solid ${C.border}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      textAlign: 'left',
                      color: C.text,
                    }}
                  >
                    <Img
                      src={movie.media_type === 'person'
                        ? (movie.profile_path ? `https://image.tmdb.org/t/p/w92${movie.profile_path}` : '/no-poster.svg')
                        : (movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : '/no-poster.svg')}
                      alt={movie.title || movie.name || 'Sin titulo'}
                      style={{ width: 30, height: 46, objectFit: 'cover' }}
                    />
                    <span className="landing-search-title" style={{ fontFamily: SANS, fontSize: 13, letterSpacing: '0.04em' }}>{movie.title || movie.name || 'Sin titulo'}</span>
                  </button>
                ))
              ) : (
                <div style={{ padding: 12, fontFamily: SANS, fontSize: 11, color: C.textSoft, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Sin resultados
                </div>
              )}
            </div>
          )}
        </div>
        <div className="landing-mobile-menu" style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setMenuOpen((value) => {
                const next = !value
                if (next) setIsSearchFocused(false)
                return next
              })
            }}
            className="landing-mobile-menu-btn"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          {menuOpen && (
            <div className="landing-mobile-menu-panel">
              {navLinks.map((link) => (
                <button
                  key={link}
                  onClick={() => {
                    if (link === 'Sign in' || link === 'Create account') {
                      window.dispatchEvent(
                        new CustomEvent('open-auth-modal', {
                          detail: { mode: link === 'Create account' ? 'register' : 'login' },
                        })
                      )
                    } else {
                      navigate(resolveNavPathWithFallback(link))
                    }
                    setMenuOpen(false)
                  }}
                  className="landing-mobile-menu-link"
                >
                  {link}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  )
}

function Hero() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 540], ['0%', '28%'])
  const scale = useTransform(scrollY, [0, 540], [1, 1.08])

  const typewriterTexts = ['reseñas.', 'obsesiones.', 'rituales.', 'descubrimientos.', 'opiniones.']

  return (
    <div style={{ position: 'relative', height: '100vh', minHeight: 640, overflow: 'hidden' }}>
      <motion.div style={{ y, scale, position: 'absolute', inset: '-10% 0', zIndex: 0 }}>
        <Img src={IMG.hero} alt="CineVault Hero" style={{ width: '100%', height: '110%', objectFit: 'cover', filter: 'brightness(0.38) saturate(0.6)' }} />
      </motion.div>

      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(8,8,8,0.2) 0%, transparent 30%, rgba(8,8,8,0.5) 70%, ${C.bg} 100%)`, zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 60%, ${C.accentGlow} 0%, transparent 60%)`, zIndex: 1 }} />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 24px',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <motion.div
          className="landing-hero-logo-mobile"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          style={{
            fontFamily: SERIF,
            fontSize: 52,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: C.text,
            lineHeight: 1,
            alignSelf: 'center',
            width: 'auto',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          Cine<span style={{ color: C.accent }}>Vault</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} style={{ marginBottom: 24 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: SANS,
              fontSize: 10,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: C.accent,
              border: `1px solid ${C.accentDim}`,
              padding: '5px 14px',
              background: 'rgba(212,175,122,0.06)',
            }}
          >
            <Clapperboard size={12} />
            Para cinéfilos de verdad
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: 'easeOut' }}
          style={{
            fontFamily: SERIF,
            fontSize: 'clamp(52px, 7vw, 86px)',
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            color: C.text,
            margin: '0 0 16px',
          }}
        >
          Tus peliculas.<br />
          Tu vault.<br />
          Tus <Typewriter texts={typewriterTexts} />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: C.textSoft, maxWidth: 560, lineHeight: 1.6, margin: '0 0 40px' }}
        >
          El lugar donde el cine deja de ser entretenimiento y se convierte en formación.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="landing-hero-cta-wrap"
        >
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'register' } }))}
            className="landing-hero-cta-btn"
          >
            Empezar ahora <ArrowRight size={13} />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          style={{ position: 'absolute', bottom: 34, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <div style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.textMuted }}>Scroll</div>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            style={{ width: 1, height: 32, background: `linear-gradient(to bottom, ${C.accentDim}, transparent)` }}
          />
        </motion.div>
      </div>
    </div>
  )
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 40 }}>
      <div>
        <div style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.accent, marginBottom: 10 }}>{eyebrow}</div>
        <h2 style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.1 }}>{title}</h2>
      </div>
      <a href="#" style={{ fontFamily: SANS, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.accent, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
        Ver todas <ChevronRight size={12} />
      </a>
    </div>
  )
}

function MovieGridSection({ endpoint, eyebrow, title }: { endpoint: string; eyebrow: string; title: string }) {
  const [movies, setMovies] = useState<ApiMovie[]>([])

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`)
        if (!response.ok) {
          setMovies([])
          return
        }
        const data = await response.json()
        setMovies(Array.isArray(data?.results) ? data.results.slice(0, 10) : [])
      } catch {
        setMovies([])
      }
    }

    fetchMovies()
  }, [endpoint])

  return (
    <section className="landing-section-sm" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <SectionHeader eyebrow={eyebrow} title={title} />
      </motion.div>
      <div className="landing-movies-grid">
        {movies.map((movie, i) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.06 }}
            style={{ position: 'relative', overflow: 'hidden', background: C.elevated, cursor: 'pointer', border: `1px solid ${C.border}` }}
          >
            <FilmCardMini
              movieId={movie.id}
              title={movie.title}
              year={Number(movie.release_date?.slice(0, 4) || 0) || 0}
              director="TMDB"
              rating={Math.max(1, Math.min(5, Math.round((movie.vote_average || 0) / 2)))}
              img={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : IMG.fog}
              delay={0}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.accent}, transparent)` }} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  const pillars = [
    {
      icon: <Layers size={22} color={C.accent} />,
      label: 'El Vault',
      title: 'Tu archivo artístico',
      desc: 'Sube lo que el cine te genera: reflexiones, edits, críticas visuales. No es un repositorio, es una extensión de quién eres.',
      img: IMG.filmReel,
    },
    {
      icon: <BookOpen size={22} color={C.accent} />,
      label: 'El Perfil',
      title: 'Tu diario cinematográfico',
      desc: 'Watchlist, ratings, reseñas, historial. No es un trofeo de cuánto viste. Es un mapa de quién eres como espectador.',
      img: IMG.cinema,
    },
    {
      icon: <Sparkles size={22} color={C.accent} />,
      label: 'El Descubrimiento',
      title: 'Esta noche, sin excusas',
      desc: 'Cada noche, una recomendación irrechazable. Un pequeño ritual. Con recompensa si lo sigues.',
      img: IMG.woman,
    },
  ]

  return (
    <section id="como-funciona" className="landing-section" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ textAlign: 'center', marginBottom: 64 }}>
        <div style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.accent, marginBottom: 14 }}>Tres pilares</div>
        <h2 style={{ fontFamily: SERIF, fontSize: 48, fontWeight: 400, color: C.text, margin: '0 auto 16px', lineHeight: 1.1, maxWidth: 600 }}>El alma de CineVault</h2>
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: C.textSoft, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          Para personas que quieren hacer del cine su vida, no para personas que quieren ver películas.
        </p>
      </motion.div>

      <div className="landing-grid-3">
        {pillars.map((pillar, i) => (
          <motion.div
            key={pillar.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: i * 0.15 }}
            style={{ position: 'relative', overflow: 'hidden', background: C.elevated, cursor: 'pointer' }}
          >
            <Img
              className="pillar-img"
              src={pillar.img}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.3) brightness(0.5)', opacity: 0.15 }}
            />
            <div style={{ position: 'relative', zIndex: 1, padding: '40px 36px 44px' }}>
              <div style={{ marginBottom: 20 }}>{pillar.icon}</div>
              <div style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.accent, marginBottom: 12 }}>{pillar.label}</div>
              <h3 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 400, color: C.text, margin: '0 0 16px', lineHeight: 1.2 }}>{pillar.title}</h3>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.textSoft, lineHeight: 1.7, margin: 0 }}>{pillar.desc}</p>
              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 6, color: C.accent, fontFamily: SANS, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Explorar <ArrowRight size={11} />
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.accent}, transparent)` }} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function NightFeature() {
  return (
    <section className="landing-section" style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div className="landing-grid-night">
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <div style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.accent, marginBottom: 16 }}>Feature estrella</div>
          <h2 style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 400, color: C.text, margin: '0 0 20px', lineHeight: 1.05 }}>Esta noche,<br />sin excusas.</h2>
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: C.textSoft, lineHeight: 1.7, margin: '0 0 32px', maxWidth: 440 }}>
            Cada noche a las 20h, CineVault te da una pelicula. Una sola. Irrechazable. Si la ves, sumas puntos, desbloqueas logros y avanzas.
          </p>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 160, height: '100%', background: `linear-gradient(90deg, ${C.accentGlow}, transparent)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.accent, marginBottom: 6 }}>Esta noche, sin excusas</div>
              <div style={{ fontFamily: SERIF, fontSize: 22, color: C.text, marginBottom: 4 }}>Andrei Rublev</div>
              <div style={{ fontFamily: SANS, fontSize: 11, color: C.textSoft }}>Andrei Tarkovsky · 1966 · 3h 25m</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                <Link to="/profile" style={{ padding: '8px 18px', background: C.accent, color: C.bg, fontFamily: SANS, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }}>
                  Marcar como vista
                </Link>
                <div style={{ fontSize: 11, color: C.gold, fontFamily: SANS, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={10} fill={C.gold} color={C.gold} /> +40 pts esta noche
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }} style={{ position: 'relative' }}>
          <div style={{ aspectRatio: '4/5', overflow: 'hidden', borderRadius: 2 }}>
            <Img src={IMG.street} alt="Cine de noche" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.5) brightness(0.7)' }} />
          </div>
          <div style={{ position: 'absolute', bottom: -20, left: -20, background: C.surface, border: `1px solid ${C.border}`, padding: '16px 22px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 300, color: C.text, lineHeight: 1 }}>7x</div>
            <div style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.textSoft, marginTop: 4 }}>Récord de streak nocturno</div>
          </div>
          <div style={{ position: 'absolute', top: 20, right: 20, width: 10, height: 10, borderRadius: '50%', background: C.accent, boxShadow: `0 0 20px ${C.accentGlowStrong}` }} />
        </motion.div>
      </div>
    </section>
  )
}

const publicReviews = [
  {
    id: 1,
    user: 'M. Reyes',
    avatar: IMG.fog,
    film: 'Stalker',
    year: 1979,
    rating: 5,
    text: 'Hay películas que ves y películas que te ven. Tarkovsky construye un espacio donde no importa si la Zona existe o no.',
  },
  {
    id: 2,
    user: 'D. Pereyra',
    avatar: IMG.nightCity,
    film: 'Mulholland Dr.',
    year: 2001,
    rating: 5,
    text: 'Lynch no dirige películas, construye sueños con arquitectura propia. Cada revisión descubre una nueva capa.',
  },
  {
    id: 3,
    user: 'C. Ibarra',
    avatar: IMG.hongKong,
    film: 'In the Mood for Love',
    year: 2000,
    rating: 5,
    text: 'Wong Kar-wai filma el deseo como niebla, presente en todas partes y tocable en ninguna.',
  },
]

function ReviewsSection() {
  return (
    <section className="landing-section" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.accent, marginBottom: 14 }}>La comunidad opina</div>
        <h2 style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.1 }}>Reseñas que son literatura</h2>
      </motion.div>

      <div className="landing-grid-3">
        {publicReviews.map((review, i) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.12 }}
            style={{ background: C.elevated, padding: '32px 28px', position: 'relative' }}
          >
            <div style={{ fontFamily: SERIF, fontSize: 72, lineHeight: 0.8, color: C.accentDim, marginBottom: 16, opacity: 0.5 }}>'</div>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: C.textSoft, lineHeight: 1.7, margin: '0 0 24px' }}>{review.text}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Stars rating={review.rating} size={11} />
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${C.border}` }}>
                <Img src={review.avatar} alt={review.user} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.5)' }} />
              </div>
              <div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: C.text }}>{review.user}</div>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: C.textSoft }}>{review.film}, {review.year}</div>
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${C.accentDim}, transparent)` }} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section className="landing-section-lg" style={{ background: C.bg, borderTop: `1px solid ${C.border}`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 400, background: `radial-gradient(ellipse, ${C.accentGlow} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9 }} style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: C.accent, marginBottom: 20 }}>
          Tu vault está vacío. Toda gran colección empieza con una.
        </div>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(44px, 6vw, 72px)', fontWeight: 400, color: C.text, margin: '0 auto 20px', lineHeight: 1.05, maxWidth: 700 }}>
          Bien. Ya tienes algo que defender.
        </h2>
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: C.textSoft, maxWidth: 480, margin: '0 auto 48px', lineHeight: 1.6 }}>
          Empieza con una película. La que más te marcó. La que cambió cómo ves el mundo.
        </p>

        <div className="landing-final-cta-wrap">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'register' } }))}
            className="landing-final-cta-btn"
          >
            Crear cuenta gratis <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          {[
            { icon: <Lock size={12} />, text: 'Sin algoritmos que te manipulen' },
            { icon: <Users size={12} />, text: 'Comunidad de cinéfilos reales' },
            { icon: <Film size={12} />, text: 'Sin spoilers, sin ruido' },
          ].map((item) => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: SANS, fontSize: 11, color: C.textSoft, letterSpacing: '0.08em' }}>
              <span style={{ color: C.accentDim }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

function Footer() {
  const cols = [
    { title: 'Explorar', links: ['Films', 'Directores', 'Listas', 'Journal', 'Miembros'] },
    { title: 'Tu cuenta', links: ['Iniciar sesión', 'Crear cuenta', 'El Vault', 'Watchlist', 'Reseñas'] },
    { title: 'CineVault', links: ['Quiénes somos', 'Manifiesto', 'Prensa', 'Contacto', 'API'] },
  ]

  return (
    <footer className="landing-footer" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
      <div className="landing-footer-grid">
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 24, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text, marginBottom: 16 }}>
            Cine<span style={{ color: C.accent }}>Vault</span>
          </div>
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: C.textSoft, lineHeight: 1.7, maxWidth: 280, margin: '0 0 24px' }}>
            Para personas que quieren hacer del cine su vida, no para personas que quieren ver películas.
          </p>
          <div style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.textMuted }}>© 2026 CineVault</div>
        </div>

        {cols.map((col) => (
          <div key={col.title}>
            <div style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.accent, marginBottom: 20 }}>{col.title}</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {col.links.map((link) => (
                <li key={link}>
                  <a href={`/${link.toLowerCase()}`} style={{ fontFamily: SANS, fontSize: 12, color: C.textSoft, textDecoration: 'none', letterSpacing: '0.06em' }}>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${C.border}` }} className="landing-footer-bottom">
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: C.textMuted }}>'Toda gran colección empieza con una.'</div>
        <div className="landing-footer-bottom-links">
          {['Terminos', 'Privacidad', 'Cookies'].map((item) => (
            <a key={item} href="#" style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.textMuted, textDecoration: 'none' }}>
              {item}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: SANS, overflowX: 'hidden' }}>
      <GrainOverlay />
      <Navbar />
      <main id="main-content">
        <Hero />
        <section className="landing-section-sm" style={{ background: C.bg }}>
          <SectionHeader eyebrow="Lo que otros usuarios están viendo" title="El canon está vivo" />
          <InfiniteSlider />
        </section>
        <MovieGridSection endpoint="/api/movies/top-rated" eyebrow="Colección" title="Aclamados por la crítica" />
        <MovieGridSection endpoint="/api/movies/upcoming" eyebrow="Colección" title="Pronto en cine" />

        <HowItWorks />
        <NightFeature />
        <ReviewsSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
