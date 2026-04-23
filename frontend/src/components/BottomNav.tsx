import { Link, useLocation } from 'react-router-dom'
import { Home, Search, Film, User } from 'lucide-react'
import './BottomNav.css'

const ITEMS = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/search', icon: Search, label: 'Buscar' },
  { to: '/feed', icon: Film, label: 'Feed' },
  { to: '/profile', icon: User, label: 'Perfil' },
  // /profile → ProfileIndexPage → redirige a /:username si logueado
  // → dispara modal de login si no logueado
]

export function BottomNav() {
  const { pathname } = useLocation()

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/'
    return pathname.startsWith(to)
  }

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {ITEMS.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          className={`bottom-nav__item ${isActive(to) ? 'active' : ''}`}
          aria-label={label}
        >
          <div className="bottom-nav__icon">
            <Icon size={18} strokeWidth={isActive(to) ? 2 : 1.5} />
          </div>
          {label}
          {isActive(to) && <div className="bottom-nav__dot" />}
        </Link>
      ))}
    </nav>
  )
}
