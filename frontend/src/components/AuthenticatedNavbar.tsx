import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, Menu, X, LogOut, Settings, User, ChevronLeft } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { logoutCurrentUser, type AuthUser } from '../services/authServices';
import { searchMovies, type SearchSuggestionItem } from '../services/searchServices';
import { createSlug, initials } from '../utils/stringUtils';
import { Notificaciones } from './Notificaciones';
import './AuthenticatedNavbar.css';

interface NavbarProps {
    user: AuthUser | null;
}

const AuthenticatedNavbar: React.FC<NavbarProps> = ({ user: initialUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { noLeidas } = useSocket();
    
    // We keep a local state that follows the prop to ensure reactivity if App.tsx updates
    const [user, setUser] = useState<AuthUser | null>(initialUser);

    useEffect(() => {
        setUser(initialUser);
    }, [initialUser]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchSuggestionItem[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const searchRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const [debouncedQuery, setDebouncedQuery] = useState('');



    // Search debouncing
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch search results
    useEffect(() => {
        if (!debouncedQuery) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        searchMovies(debouncedQuery)
            .then(data => {
                setSearchResults(Array.isArray(data?.results) ? data.results.slice(0, 6) : []);
            })
            .catch(() => setSearchResults([]))
            .finally(() => setIsSearching(false));
    }, [debouncedQuery]);

    // Handle outside clicks
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
            setIsSearchOpen(false);
            setIsMobileMenuOpen(false);
        }
    };

    const handleLogout = async () => {
        await logoutCurrentUser();
        navigate('/');
    };

    const goToItem = (item: SearchSuggestionItem) => {
        const label = item.title || item.name || 'sin-titulo';
        if (item.media_type === 'person') {
            navigate(`/person/${item.id}`);
        } else if (item.media_type === 'tv') {
            navigate(`/tv/${item.id}`);
        } else {
            navigate(`/movie/${item.id}-${createSlug(label)}`);
        }
        setIsSearchOpen(false);
        setSearchQuery('');
    };

    interface NavLink {
        label: string;
        path: string;
        action?: () => void;
    }

    const authenticatedLinks: NavLink[] = [
        { label: 'Diario', path: '/diary' },
        { label: 'Esta noche', path: '/for-you' },
        { label: 'Feed', path: '/feed' },
        { label: 'Lists', path: '/lists' },
        { label: 'Films', path: '/films' },
        { label: 'Members', path: '/members' },
    ];

    const guestLinks: NavLink[] = [
        { label: 'Sign in', path: '#login', action: () => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'login' } })) },
        { label: 'Create account', path: '#register', action: () => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'register' } })) },
        { label: 'Films', path: '/films' },
        { label: 'Lists', path: '/lists' },
        { label: 'Members', path: '/members' },
        { label: 'Journal', path: '/journal' },
    ];

    const navLinks = user ? authenticatedLinks : guestLinks;

    const isPathActive = (path: string) => location.pathname === path;

    return (
        <nav className="auth-nav">
            <Link to="/" className="auth-nav-logo">
                Cine<span>Vault</span>
            </Link>

            <ul className="auth-nav-links">
                {navLinks.map(link => (
                    <li key={link.path}>
                        {link.action ? (
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    link.action?.();
                                }}
                                className={`auth-nav-link-btn ${isPathActive(link.path) ? 'active' : ''}`}
                            >
                                {link.label}
                            </button>
                        ) : (
                            <Link 
                                to={link.path} 
                                className={`auth-nav-link-btn ${isPathActive(link.path) ? 'active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ul>

            <div className="auth-nav-actions">
                <div className="auth-nav-search-wrapper" ref={searchRef}>
                    <form className="auth-nav-search-form" onSubmit={handleSearchSubmit}>
                        <input
                            type="text"
                            className="auth-nav-search-input"
                            placeholder="Buscar"
                            value={searchQuery}
                            onFocus={() => setIsSearchOpen(true)}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="auth-nav-search-btn">
                            <Search size={16} />
                        </button>
                    </form>

                    {isSearchOpen && (debouncedQuery || isSearching) && (
                        <div className="auth-nav-suggestions">
                            {isSearching && <div style={{ padding: 12, fontSize: 11, color: '#7A7A7A' }}>BUSCANDO...</div>}
                            {!isSearching && searchResults.map(item => (
                                <button key={`${item.media_type}-${item.id}`} className="auth-nav-suggestion-item" onClick={() => goToItem(item)}>
                                    <div style={{ width: 32, height: 48, background: '#1A1A1A', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                                        {(item.poster_path || item.profile_path) && (
                                            <img 
                                                src={`https://image.tmdb.org/t/p/w92${item.poster_path || item.profile_path}`} 
                                                alt="" 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        )}
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</div>
                                        <div style={{ fontSize: 10, color: '#7A7A7A', textTransform: 'uppercase' }}>{item.media_type}</div>
                                    </div>
                                </button>
                            ))}
                            {!isSearching && searchResults.length === 0 && debouncedQuery && (
                                <div style={{ padding: 12, fontSize: 11, color: '#7A7A7A' }}>SIN RESULTADOS</div>
                            )}
                        </div>
                    )}
                </div>

                <button className="auth-nav-back-btn" onClick={() => navigate(-1)} aria-label="Volver">
                    <ChevronLeft size={14} />
                    VOLVER
                </button>

                {user && (
                    <div className="auth-nav-notifications-wrapper" ref={notificationsRef}>
                        <button className="auth-nav-icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
                            <Bell size={18} />
                            {noLeidas > 0 && <span className="auth-nav-badge">{noLeidas > 9 ? '9+' : noLeidas}</span>}
                        </button>
                        {showNotifications && (
                            <div style={{ position: 'absolute', top: 48, right: 0, width: 320, zIndex: 1001 }}>
                                <Notificaciones open={showNotifications} showTrigger={false} />
                            </div>
                        )}
                    </div>
                )}

                {user ? (
                    <div className="auth-nav-profile" ref={userMenuRef}>
                        <button className="auth-nav-avatar-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt={user.username} className="auth-nav-avatar-img" />
                            ) : (
                                <span className="auth-nav-avatar-initials">{initials(user?.username || '')}</span>
                            )}
                        </button>
                        {showUserMenu && (
                            <div className="auth-nav-dropdown">
                                <Link to="/profile" className="auth-nav-dropdown-item" onClick={() => setShowUserMenu(false)}>
                                    <User size={14} style={{ marginRight: 8 }} /> Perfil
                                </Link>
                                <Link to="/settings" className="auth-nav-dropdown-item" onClick={() => setShowUserMenu(false)}>
                                    <Settings size={14} style={{ marginRight: 8 }} /> Configuración
                                </Link>
                                <div style={{ height: 1, background: '#252525', margin: '4px 0' }} />
                                <button className="auth-nav-dropdown-item auth-nav-dropdown-danger" onClick={handleLogout}>
                                    <LogOut size={14} style={{ marginRight: 8 }} /> Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                ) : null}

                <button className="auth-nav-hamburger" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>
            
            {/* Mobile Menu Overlay could be added here */}
        </nav>
    );
};

export default AuthenticatedNavbar;
