/**
 * CineVault — Feed Page (/feed)
 * TikTok-style vertical snap scroll — Reseñas, Vault, Descubrimientos
 * Palette: Oro Silencioso #D4AF7A · Cormorant Garamond + Syne
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
    Heart, MessageCircle, Share2, Bookmark, Play,
    ChevronUp, ChevronDown, Eye, Trophy, Search,
    Sparkles, List, Film, Star,
} from 'lucide-react';

// ─── PALETTE ─────────────────────────────────────────────────
const C = {
    bg: '#080808',
    surface: '#111111',
    elevated: '#1A1A1A',
    border: '#252525',
    accent: '#D4AF7A',
    accentDim: '#9A7A48',
    accentGlow: 'rgba(212,175,122,0.15)',
    text: '#E2E2E2',
    textSoft: '#7A7A7A',
    textMuted: '#3A3A3A',
    gold: '#C8A96E',
} as const;

const SERIF = "'Cormorant Garamond', serif";
const SANS = "'Syne', sans-serif";

// ─── IMAGE HELPER ─────────────────────────────────────────────
function Img({ src, alt, style, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
    const [err, setErr] = useState(false);
    if (err) return <div style={{ ...style, background: C.elevated }} />;
    return <img src={src} alt={alt} style={style} onError={() => setErr(true)} {...rest} />;
}

// ─── FEED DATA ────────────────────────────────────────────────
type FeedItem =
    | { id: number; type: 'review'; user: User; film: Film; rating: number; text: string; tags: string[]; likes: number; comments: number; bg: string }
    | { id: number; type: 'vault'; user: User; vaultType: string; title: string; duration: string; description: string; views: number; likes: number; comments: number; bg: string }
    | { id: number; type: 'tonight'; film: Film; description: string; points: number; likes: number; comments: number; bg: string }
    | { id: number; type: 'discovery'; film: Film; quote: string; description: string; likes: number; comments: number; bg: string }
    | { id: number; type: 'list'; user: User; listTitle: string; description: string; count: number; films: string[]; likes: number; comments: number; bg: string }
    | { id: number; type: 'quote'; director: string; quote: string; source: string; likes: number; comments: number; bg: string };

type User = { name: string; handle: string; films: number; avatar: string };
type Film = { title: string; year: number; director: string; id: string; duration?: string };

const FEED: FeedItem[] = [
    {
        id: 1, type: 'review',
        user: { name: 'Martina Reyes', handle: '@martinareyes', films: 347, avatar: 'M' },
        film: { title: 'Stalker', year: 1979, director: 'Tarkovsky', id: 'stalker' },
        rating: 5,
        text: 'Hay películas que ves y películas que te ven. Stalker es de las segundas. Tarkovsky construye un espacio donde no importa si la Zona existe o no — lo que importa es lo que cada personaje está dispuesto a confesar frente a ella. Ver esto en 2026 es entender que el mundo no cambió tanto.',
        tags: ['Existencialismo', 'Slow cinema', 'URSS'],
        likes: 284, comments: 47,
        bg: 'https://images.unsplash.com/photo-1648256289719-9ebbd79faaa5?w=1200&q=85',
    },
    {
        id: 2, type: 'vault',
        user: { name: 'Martina Reyes', handle: '@martinareyes', films: 347, avatar: 'M' },
        vaultType: 'Reflexión', title: 'Por qué Tarkovsky te cambia la vida',
        duration: '12 min', views: 4821,
        description: 'Una mirada a la filosofía detrás del tiempo como lenguaje cinematográfico. De Stalker a El espejo, cómo un director soviético redefinió lo que el cine puede hacer con el tiempo.',
        likes: 1203, comments: 89,
        bg: 'https://images.unsplash.com/photo-1768622943509-24488766e94b?w=1200&q=85',
    },
    {
        id: 3, type: 'tonight',
        film: { title: 'Andrei Rublev', year: 1966, director: 'Tarkovsky', id: 'andrei-rublev', duration: '3h 25m' },
        description: 'Un monje medieval. El arte como resistencia. El alma humana bajo el yugo. 205 minutos que se sienten como un sueño que no querés que termine.',
        points: 40, likes: 891, comments: 134,
        bg: 'https://images.unsplash.com/photo-1680479610863-13c6224a78d0?w=1200&q=85',
    },
    {
        id: 4, type: 'review',
        user: { name: 'Diego Pereyra', handle: '@diegop', films: 512, avatar: 'D' },
        film: { title: 'Mulholland Dr.', year: 2001, director: 'Lynch', id: 'mulholland' },
        rating: 5,
        text: 'Lynch no dirige películas, construye sueños con arquitectura propia. La primera vez la odié. La quinta entendí que es la única película que honestamente representa cómo funciona la mente cuando la realidad se desintegra. Hollywood como pesadilla y como deseo.',
        tags: ['Lynch', 'Neo-noir', 'Surrealismo', 'Hollywood'],
        likes: 437, comments: 63,
        bg: 'https://images.unsplash.com/photo-1770896689026-f5421714f6a5?w=1200&q=85',
    },
    {
        id: 5, type: 'discovery',
        film: { title: 'Jeanne Dielman', year: 1975, director: 'Chantal Akerman', id: 'jeanne-dielman', duration: '3h 28m' },
        quote: 'El minimalismo más devastador del siglo XX.',
        description: 'Akerman filmó tres horas y media de rutina doméstica que explotan sin que lo veas venir. El tiempo real como arma política. Una de las películas más importantes jamás hechas.',
        likes: 672, comments: 91,
        bg: 'https://images.unsplash.com/photo-1769650795757-c901425aefbb?w=1200&q=85',
    },
    {
        id: 6, type: 'vault',
        user: { name: 'Cinéfilo Sur', handle: '@cinefilosur', films: 189, avatar: 'C' },
        vaultType: 'Edit', title: 'Planos que detienen el tiempo',
        duration: '6 min', views: 12400,
        description: 'Una selección de planos secuencia, silencios y miradas que hacen que el corazón se pause. Tarkovsky, Angelopoulos, Hou Hsiao-hsien, Kiarostami.',
        likes: 2847, comments: 203,
        bg: 'https://images.unsplash.com/photo-1760346738721-235e811f573d?w=1200&q=85',
    },
    {
        id: 7, type: 'list',
        user: { name: 'Nocturnal Viewer', handle: '@nocturnal', films: 920, avatar: 'N' },
        listTitle: 'Para ver a las 3 AM',
        description: 'No para dormir. Para entrar en un estado otro. Ocho películas que cambian tu frecuencia.',
        count: 8,
        films: ['Inland Empire', 'Enter the Void', 'Sátántangó', 'The Holy Mountain'],
        likes: 1891, comments: 156,
        bg: 'https://images.unsplash.com/photo-1656914871811-148cfdbb6ef4?w=1200&q=85',
    },
    {
        id: 8, type: 'review',
        user: { name: 'Laura Montes', handle: '@lauramontes', films: 512, avatar: 'L' },
        film: { title: 'In the Mood for Love', year: 2000, director: 'Wong Kar-wai', id: 'in-the-mood' },
        rating: 5,
        text: 'Una película sobre lo que no sucede. Wong Kar-wai filma el deseo como niebla — presente en todas partes, tocable en ninguna. Los trajes de Maggie Cheung son el único personaje que realmente se mueve.',
        tags: ['Hong Kong', 'Deseo', 'Lento', 'Banda sonora perfecta'],
        likes: 1204, comments: 88,
        bg: 'https://images.unsplash.com/photo-1750658659043-76407ff8d677?w=1200&q=85',
    },
    {
        id: 9, type: 'quote',
        director: 'Ingmar Bergman',
        quote: 'No hay arte que pase por los sentidos humanos de manera tan directa y convincente como el cine, que actúa directamente sobre los sentimientos.',
        source: 'Linterna Mágica, 1987',
        likes: 3241, comments: 189,
        bg: 'https://images.unsplash.com/photo-1762948050110-76e67d7aae29?w=1200&q=85',
    },
    {
        id: 10, type: 'discovery',
        film: { title: 'La Dolce Vita', year: 1960, director: 'Fellini', id: 'la-dolce-vita', duration: '2h 54m' },
        quote: 'El vacío más elegante que jamás se filmó.',
        description: 'Fellini retrató el hedonismo romano de los años 60 como una trampa dorada. Marcello busca algo — nunca sabe qué. Vos sí.',
        likes: 891, comments: 102,
        bg: 'https://images.unsplash.com/photo-1686511474427-40a3154453a1?w=1200&q=85',
    },
];

// ─── HELPERS ──────────────────────────────────────────────────
function fmtCount(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function Stars({ n }: { n: number }) {
    return (
        <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ fontSize: 15, color: i <= n ? C.gold : 'rgba(255,255,255,0.2)', lineHeight: 1 }}>★</span>
            ))}
        </div>
    );
}

// ─── TYPE BADGE ───────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    review: { label: 'Reseña', icon: <Star size={10} />, color: C.gold },
    vault: { label: 'Vault', icon: <Play size={10} />, color: C.accent },
    tonight: { label: 'Esta noche', icon: <Sparkles size={10} />, color: '#E8C98D' },
    discovery: { label: 'Descubrimiento', icon: <Film size={10} />, color: C.accent },
    list: { label: 'Lista', icon: <List size={10} />, color: C.textSoft },
    quote: { label: 'Cita', icon: <span style={{ fontSize: 12, lineHeight: 1 }}>"</span>, color: C.accent },
};

function TypeBadge({ type }: { type: string }) {
    const meta = TYPE_META[type];
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            background: 'rgba(8,8,8,0.65)',
            border: `1px solid rgba(255,255,255,0.1)`,
            backdropFilter: 'blur(8px)',
            color: meta.color,
            fontFamily: SANS, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>
            {meta.icon} {meta.label}
        </div>
    );
}

// ─── ACTION BUTTON ────────────────────────────────────────────
function ActionBtn({
    icon, count, active, onClick, animating,
}: {
    icon: React.ReactNode; count?: number; active?: boolean;
    onClick: () => void; animating?: boolean;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <motion.button
                onClick={onClick}
                animate={animating ? { scale: [1, 1.5, 0.85, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: active ? 'rgba(212,175,122,0.18)' : 'rgba(8,8,8,0.55)',
                    border: `1px solid ${active ? 'rgba(212,175,122,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: active ? C.accent : 'rgba(255,255,255,0.9)',
                    transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                } as any}

                whileHover={{ scale: 1.08 }}
            >
                {icon}
            </motion.button>
            {count !== undefined && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontFamily: SANS, letterSpacing: '0.04em' }}>
                    {fmtCount(count)}
                </span>
            )}
        </div>
    );
}

// ─── FLOATING HEART ANIMATION ─────────────────────────────────
function FloatingHeart({ trigger }: { trigger: boolean }) {
    return (
        <AnimatePresence>
            {trigger && (
                <motion.div
                    initial={{ opacity: 1, scale: 0.5, y: 0 }}
                    animate={{ opacity: 0, scale: 1.8, y: -60 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{
                        position: 'absolute', bottom: 180, right: 36,
                        fontSize: 32, pointerEvents: 'none', zIndex: 50,
                        color: C.accent,
                    }}
                >
                    ♥
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── CARD CONTENT RENDERERS ───────────────────────────────────

function ReviewContent({ item }: { item: Extract<FeedItem, { type: 'review' }> }) {
    const [expanded, setExpanded] = useState(false);
    const MAX = 160;
    const isLong = item.text.length > MAX;
    const displayText = expanded || !isLong ? item.text : item.text.slice(0, MAX) + '...';

    return (
        <>
            {/* Film link */}
            <Link to={`/film/${item.film.id}`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ padding: '3px 10px', background: 'rgba(212,175,122,0.1)', border: `1px solid ${C.accentDim}`, backdropFilter: 'blur(8px)' }}>
                    <span style={{ fontFamily: SERIF, fontSize: 14, fontStyle: 'italic', color: C.accent }}>
                        {item.film.title}
                    </span>
                    <span style={{ fontFamily: SANS, fontSize: 10, color: C.textSoft, marginLeft: 8 }}>
                        {item.film.year} · {item.film.director}
                    </span>
                </div>
            </Link>

            <div style={{ marginBottom: 10 }}><Stars n={item.rating} /></div>

            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, lineHeight: 1.65, color: 'rgba(226,226,226,0.92)', margin: '0 0 6px', maxWidth: 560 }}>
                {displayText}
            </p>

            {isLong && (
                <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, fontFamily: SANS, fontSize: 11, letterSpacing: '0.14em', padding: 0, marginBottom: 12 }}>
                    {expanded ? 'Ver menos' : 'Ver más'}
                </button>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {item.tags.map(t => (
                    <span key={t} style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', padding: '3px 9px', backdropFilter: 'blur(6px)', fontFamily: SANS }}>
                        {t}
                    </span>
                ))}
            </div>
        </>
    );
}

function VaultContent({ item }: { item: Extract<FeedItem, { type: 'vault' }> }) {
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, fontFamily: SANS }}>
                    {item.vaultType}
                </span>
                <span style={{ color: C.textMuted, fontSize: 10 }}>·</span>
                <span style={{ fontSize: 11, color: C.textSoft, fontFamily: SANS, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={11} /> {fmtCount(item.views)} vistas · {item.duration}
                </span>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, lineHeight: 1.15, color: C.text, marginBottom: 10, maxWidth: 500 }}>
                {item.title}
            </div>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: 'rgba(226,226,226,0.65)', lineHeight: 1.6, margin: 0, maxWidth: 480 }}>
                {item.description}
            </p>
        </>
    );
}

function TonightContent({ item }: { item: Extract<FeedItem, { type: 'tonight' }> }) {
    const [marked, setMarked] = useState(false);
    return (
        <>
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.35em', textTransform: 'uppercase', color: C.accent, marginBottom: 10 }}>
                    Esta noche, sin excusas
                </div>
                <Link to={`/film/${item.film.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ fontFamily: SERIF, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, lineHeight: 1.05, color: C.text, marginBottom: 4 }}>
                        {item.film.title}
                    </div>
                    <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: C.textSoft, marginBottom: 14 }}>
                        {item.film.director} · {item.film.year} · {item.film.duration}
                    </div>
                </Link>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: 'rgba(226,226,226,0.7)', lineHeight: 1.65, margin: '0 0 20px', maxWidth: 500 }}>
                    {item.description}
                </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                    onClick={() => setMarked(v => !v)}
                    style={{
                        padding: '10px 22px', background: marked ? C.accentDim : C.accent, color: C.bg,
                        border: 'none', fontFamily: SANS, fontSize: 11, letterSpacing: '0.18em',
                        textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    {marked ? '✓ Vista' : 'Marcar como vista'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.gold, fontFamily: SANS, fontSize: 12 }}>
                    <Trophy size={13} fill={C.gold} color={C.gold} /> +{item.points} pts esta noche
                </div>
            </div>
        </>
    );
}

function DiscoveryContent({ item }: { item: Extract<FeedItem, { type: 'discovery' }> }) {
    return (
        <>
            <Link to={`/film/${item.film.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, color: C.accent, marginBottom: 10, lineHeight: 1.3 }}>
                    "{item.quote}"
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 300, lineHeight: 1.05, color: C.text, marginBottom: 6 }}>
                    {item.film.title}
                </div>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.textSoft, marginBottom: 16 }}>
                    {item.film.director} · {item.film.year} {item.film.duration ? `· ${item.film.duration}` : ''}
                </div>
            </Link>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: 'rgba(226,226,226,0.65)', lineHeight: 1.65, margin: 0, maxWidth: 500 }}>
                {item.description}
            </p>
        </>
    );
}

function ListContent({ item }: { item: Extract<FeedItem, { type: 'list' }> }) {
    return (
        <>
            <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.accent, marginBottom: 8 }}>
                    Lista curada · {item.count} películas
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 300, lineHeight: 1.1, color: C.text, marginBottom: 10 }}>
                    {item.listTitle}
                </div>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: 'rgba(226,226,226,0.65)', lineHeight: 1.65, margin: '0 0 16px', maxWidth: 460 }}>
                    {item.description}
                </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {item.films.map(f => (
                    <span key={f} style={{ fontSize: 11, fontFamily: SERIF, fontStyle: 'italic', color: 'rgba(255,255,255,0.55)', borderLeft: `2px solid ${C.accentDim}`, paddingLeft: 8 }}>
                        {f}
                    </span>
                ))}
                <span style={{ fontSize: 11, fontFamily: SANS, color: C.textMuted }}>+{item.count - item.films.length} más</span>
            </div>
        </>
    );
}

function QuoteContent({ item }: { item: Extract<FeedItem, { type: 'quote' }> }) {
    return (
        <div style={{ maxWidth: 580 }}>
            <div style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 3vw, 32px)', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.65, color: 'rgba(226,226,226,0.9)', marginBottom: 20 }}>
                <span style={{ color: C.accent, fontSize: '1.5em', lineHeight: 0.7, verticalAlign: 'bottom', marginRight: 4 }}>"</span>
                {item.quote}
                <span style={{ color: C.accent, fontSize: '1.5em', lineHeight: 0.7, verticalAlign: 'bottom', marginLeft: 4 }}>"</span>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.accent }}>
                {item.director}
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: C.textSoft, marginTop: 4 }}>
                {item.source}
            </div>
        </div>
    );
}

// ─── FEED CARD ────────────────────────────────────────────────
function FeedCard({
    item, idx, liked, bookmarked, likeAnimating,
    onLike, onBookmark, active,
}: {
    item: FeedItem; idx: number; liked: boolean; bookmarked: boolean;
    likeAnimating: boolean; onLike: () => void; onBookmark: () => void; active: boolean;
}) {
    const [localComments] = useState(item.comments);
    const filmId = (item as any).film?.id;

    const renderContent = () => {
        switch (item.type) {
            case 'review': return <ReviewContent item={item} />;
            case 'vault': return <VaultContent item={item} />;
            case 'tonight': return <TonightContent item={item} />;
            case 'discovery': return <DiscoveryContent item={item} />;
            case 'list': return <ListContent item={item} />;
            case 'quote': return <QuoteContent item={item} />;
        }
    };

    const user = (item as any).user as User | undefined;

    return (
        <div
            data-idx={idx}
            className="feed-card"
            style={{
                height: '100vh',
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
                position: 'relative',
                overflow: 'hidden',
                background: C.bg,
            }}
        >
            {/* ── Background ── */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Img
                    src={item.bg}
                    alt=""
                    style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        filter: `saturate(0.45) brightness(${active ? 0.55 : 0.35})`,
                        transform: 'scale(1.04)',
                        transition: 'filter 0.6s ease',
                    }}
                />
            </div>

            {/* ── Gradients ── */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(8,8,8,0.6) 0%, transparent 25%, transparent 45%, rgba(8,8,8,0.75) 70%, rgba(8,8,8,0.97) 100%)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', zIndex: 1, background: 'linear-gradient(to bottom, rgba(8,8,8,0.5) 0%, transparent 100%)' }} />
            {/* Accent left glow for special types */}
            {(item.type === 'tonight' || item.type === 'quote') && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: `radial-gradient(ellipse at 20% 80%, ${C.accentGlow} 0%, transparent 60%)` }} />
            )}

            {/* ── Center element (vault play / quote ornament) ── */}
            {item.type === 'vault' && active && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'rgba(8,8,8,0.6)',
                            border: `1.5px solid ${C.accent}`,
                            backdropFilter: 'blur(16px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 0 40px ${C.accentGlow}`,
                        }}
                    >
                        <Play size={26} fill={C.accent} color={C.accent} style={{ marginLeft: 4 }} />
                    </motion.div>
                </div>
            )}

            {/* ── Type badge (top-left, below nav) ── */}
            <div style={{ position: 'absolute', top: 80, left: 24, zIndex: 10 }}>
                <TypeBadge type={item.type} />
            </div>

            {/* ── Tonight accent top line ── */}
            {item.type === 'tonight' && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${C.accent}, ${C.accentDim}, transparent)`, zIndex: 20 }} />
            )}

            {/* ── Floating heart animation ── */}
            <FloatingHeart trigger={likeAnimating} />

            {/* ── Bottom content ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={active ? { opacity: 1, y: 0 } : { opacity: 0.6, y: 8 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                    position: 'absolute', bottom: 0, left: 0,
                    right: 110, zIndex: 10,
                    padding: '0 24px 36px',
                }}
            >
                {/* User info */}
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'rgba(212,175,122,0.15)',
                            border: `1.5px solid ${C.accentDim}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: SERIF, fontSize: 15, color: C.accent, flexShrink: 0,
                            backdropFilter: 'blur(8px)',
                        }}>
                            {user.avatar}
                        </div>
                        <div>
                            <span style={{ fontFamily: SANS, fontSize: 13, color: C.text, marginRight: 8 }}>{user.name}</span>
                            <span style={{ fontFamily: SANS, fontSize: 10, color: C.textSoft, letterSpacing: '0.06em' }}>{user.handle}</span>
                        </div>
                        <button style={{
                            marginLeft: 4, padding: '3px 12px',
                            background: 'transparent', color: C.accent,
                            border: `1px solid ${C.accentDim}`,
                            fontFamily: SANS, fontSize: 10, letterSpacing: '0.14em',
                            textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(8px)',
                            transition: 'all 0.2s',
                        }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.accentGlow; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                            + Seguir
                        </button>
                    </div>
                )}

                {/* Main content */}
                {renderContent()}
            </motion.div>

            {/* ── Right action column ── */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={active ? { opacity: 1, x: 0 } : { opacity: 0.4, x: 10 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{
                    position: 'absolute', right: 16, bottom: 90,
                    zIndex: 10,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                }}
            >
                {/* Film poster mini or vault type icon */}
                {filmId ? (
                    <Link to={`/film/${filmId}`} style={{ textDecoration: 'none' }}>
                        <div style={{
                            width: 52, height: 78,
                            borderRadius: 2, overflow: 'hidden',
                            border: `1.5px solid ${C.accentDim}`,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                            flexShrink: 0,
                            transition: 'transform 0.2s',
                        }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                        >
                            <Img src={item.bg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.6)' }} />
                        </div>
                    </Link>
                ) : (
                    <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: 'rgba(212,175,122,0.12)',
                        border: `1.5px solid ${C.accentDim}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: C.accent,
                    }}>
                        <Play size={18} fill={C.accent} />
                    </div>
                )}

                {/* Like */}
                <ActionBtn
                    icon={<Heart size={18} fill={liked ? C.accent : 'none'} color={liked ? C.accent : 'rgba(255,255,255,0.9)'} strokeWidth={1.5} />}
                    count={liked ? item.likes + 1 : item.likes}
                    active={liked}
                    onClick={onLike}
                    animating={likeAnimating}
                />

                {/* Comment */}
                <ActionBtn
                    icon={<MessageCircle size={18} strokeWidth={1.5} color="rgba(255,255,255,0.9)" />}
                    count={localComments}
                    active={false}
                    onClick={() => { }}
                />

                {/* Share */}
                <ActionBtn
                    icon={<Share2 size={18} strokeWidth={1.5} color="rgba(255,255,255,0.9)" />}
                    active={false}
                    onClick={() => { }}
                />

                {/* Bookmark */}
                <ActionBtn
                    icon={<Bookmark size={18} fill={bookmarked ? C.accent : 'none'} color={bookmarked ? C.accent : 'rgba(255,255,255,0.9)'} strokeWidth={1.5} />}
                    active={bookmarked}
                    onClick={onBookmark}
                />
            </motion.div>
        </div>
    );
}

// ─── FEED NAVBAR ──────────────────────────────────────────────
const TABS = ['Para ti', 'Siguiendo', 'Esta noche'];

function FeedNavbar({ activeTab, onTab }: { activeTab: string; onTab: (t: string) => void }) {
    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 64,
            display: 'flex', alignItems: 'center',
            padding: '0 24px',
            background: 'rgba(8,8,8,0.75)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
            {/* Logo */}
            <Link to="/" style={{
                fontFamily: SERIF, fontSize: 19, fontWeight: 500,
                letterSpacing: '0.13em', textTransform: 'uppercase',
                color: C.text, textDecoration: 'none', flexShrink: 0, marginRight: 32,
            }}>
                Cine<span style={{ color: C.accent }}>Vault</span>
            </Link>

            {/* Tabs — center */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => onTab(tab)}
                        style={{
                            padding: '6px 18px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: SANS, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
                            color: activeTab === tab ? C.text : C.textSoft,
                            borderBottom: `2px solid ${activeTab === tab ? C.accent : 'transparent'}`,
                            paddingBottom: 4,
                            transition: 'color 0.2s, border-color 0.2s',
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => { if (activeTab !== tab) (e.currentTarget as HTMLElement).style.color = C.text; }}
                        onMouseLeave={e => { if (activeTab !== tab) (e.currentTarget as HTMLElement).style.color = C.textSoft; }}
                    >
                        {tab === 'Esta noche' && <span style={{ color: C.accent, marginRight: 5 }}>✦</span>}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <button style={{ background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer', color: C.textSoft, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.accentDim; (e.currentTarget as HTMLElement).style.color = C.text; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.textSoft; }}
                >
                    <Search size={14} />
                </button>
                <Link to="/profile" style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: `1.5px solid ${C.accentDim}`, display: 'block', flexShrink: 0 }}>
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 14, color: C.accent }}>M</div>
                </Link>
            </div>
        </nav>
    );
}

// ─── PROGRESS DOTS ────────────────────────────────────────────
function ProgressDots({ total, active, onGo }: { total: number; active: number; onGo: (i: number) => void }) {
    return (
        <div style={{
            position: 'fixed', right: 6, top: '50%', transform: 'translateY(-50%)',
            zIndex: 150,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            pointerEvents: 'none',
        }}>
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    onClick={() => onGo(i)}
                    style={{
                        width: i === active ? 3 : 2,
                        height: i === active ? 20 : 8,
                        borderRadius: 4,
                        background: i === active ? C.accent : 'rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        pointerEvents: 'all',
                    }}
                />
            ))}
        </div>
    );
}

// ─── NAV ARROWS ───────────────────────────────────────────────
function NavArrows({ onUp, onDown, canUp, canDown }: { onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean }) {
    return (
        <div style={{
            position: 'fixed', right: 20, bottom: 32,
            zIndex: 150,
            display: 'flex', flexDirection: 'column', gap: 4,
        }}>
            <button
                onClick={onUp}
                disabled={!canUp}
                style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(8,8,8,0.7)', backdropFilter: 'blur(12px)',
                    border: `1px solid ${canUp ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                    color: canUp ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                    cursor: canUp ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (canUp) (e.currentTarget as HTMLElement).style.borderColor = C.accentDim; }}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = canUp ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}
            >
                <ChevronUp size={16} />
            </button>
            <button
                onClick={onDown}
                disabled={!canDown}
                style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(8,8,8,0.7)', backdropFilter: 'blur(12px)',
                    border: `1px solid ${canDown ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                    color: canDown ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                    cursor: canDown ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (canDown) (e.currentTarget as HTMLElement).style.borderColor = C.accentDim; }}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = canDown ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}
            >
                <ChevronDown size={16} />
            </button>
        </div>
    );
}

// ─── GRAIN ────────────────────────────────────────────────────
function Grain() {
    return (
        <div style={{
            position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 900,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E")`,
            opacity: 0.38,
        }} />
    );
}

// ─── FEED PAGE ────────────────────────────────────────────────
export function Feed() {
    const [activeIdx, setActiveIdx] = useState(0);
    const [activeTab, setActiveTab] = useState('Para ti');
    const [liked, setLiked] = useState<Set<number>>(new Set());
    const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
    const [animating, setAnimating] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // IntersectionObserver to track active card
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                        const idx = Number(entry.target.getAttribute('data-idx'));
                        if (!isNaN(idx)) setActiveIdx(idx);
                    }
                });
            },
            { root: container, threshold: 0.6 }
        );

        const cards = container.querySelectorAll('.feed-card');
        cards.forEach(c => observer.observe(c));
        return () => observer.disconnect();
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown' || e.key === 'j') goTo(Math.min(activeIdx + 1, FEED.length - 1));
            if (e.key === 'ArrowUp' || e.key === 'k') goTo(Math.max(activeIdx - 1, 0));
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [activeIdx]);

    const goTo = useCallback((idx: number) => {
        const el = containerRef.current?.querySelector(`[data-idx="${idx}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const toggleLike = (id: number) => {
        setLiked(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        setAnimating(id);
        setTimeout(() => setAnimating(null), 650);
    };

    const toggleBookmark = (id: number) => {
        setBookmarked(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <>
            <style>{`
        .feed-scroll::-webkit-scrollbar { display: none; }
        .feed-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

            <Grain />
            <FeedNavbar activeTab={activeTab} onTab={setActiveTab} />

            {/* Feed container */}
            <div style={{ height: '100vh', overflow: 'hidden', position: 'relative', background: C.bg }}>
                <div
                    ref={containerRef}
                    className="feed-scroll"
                    style={{
                        height: '100vh',
                        overflowY: 'scroll',
                        scrollSnapType: 'y mandatory',
                    }}
                >
                    {FEED.map((item, i) => (
                        <FeedCard
                            key={item.id}
                            item={item}
                            idx={i}
                            active={activeIdx === i}
                            liked={liked.has(item.id)}
                            bookmarked={bookmarked.has(item.id)}
                            likeAnimating={animating === item.id}
                            onLike={() => toggleLike(item.id)}
                            onBookmark={() => toggleBookmark(item.id)}
                        />
                    ))}

                    {/* End card */}
                    <div
                        data-idx={FEED.length}
                        style={{
                            height: '100vh', scrollSnapAlign: 'start',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            background: C.bg, position: 'relative', overflow: 'hidden',
                        }}
                    >
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, background: `radial-gradient(ellipse, rgba(212,175,122,0.08) 0%, transparent 70%)`, pointerEvents: 'none' }} />
                        <div style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 20 }}>
                            ✦ ✦ ✦
                        </div>
                        <div style={{ fontFamily: SERIF, fontSize: 42, fontWeight: 300, color: C.text, marginBottom: 12, textAlign: 'center', lineHeight: 1.1 }}>
                            Ya viste todo<br />por hoy.
                        </div>
                        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: C.textSoft, marginBottom: 40, textAlign: 'center' }}>
                            Buen momento para ver una película.
                        </div>
                        <Link to="/" style={{
                            padding: '12px 28px', background: C.accent, color: C.bg,
                            fontFamily: SANS, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                            textDecoration: 'none', transition: 'opacity 0.2s',
                        }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
                            Volver al inicio
                        </Link>
                    </div>
                </div>

                {/* Progress dots */}
                <ProgressDots total={FEED.length} active={activeIdx} onGo={goTo} />

                {/* Navigation arrows */}
                <NavArrows
                    onUp={() => goTo(Math.max(activeIdx - 1, 0))}
                    onDown={() => goTo(Math.min(activeIdx + 1, FEED.length - 1))}
                    canUp={activeIdx > 0}
                    canDown={activeIdx < FEED.length - 1}
                />
            </div>
        </>
    );
}