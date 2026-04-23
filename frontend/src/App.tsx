import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router'
import SeoManager from './components/SeoManager'
import { SocketProvider } from "./context/SocketContext"
import { getStoredAccessToken, refreshAccessToken } from './services/authServices'
import { BottomNav } from './components/BottomNav'
import AuthenticatedNavbar from './components/AuthenticatedNavbar'
import { getCurrentUser, type AuthUser } from './services/authServices'
import './App.css'

const Home = lazy(() => import('./pages/Home'))
const AuthModal = lazy(() => import('./components/AuthModal'))

function App() {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
    const [user, setUser] = useState<AuthUser | null>(null)

    useEffect(() => {
        const handler = (event: Event) => {
            const customEvent = event as CustomEvent<{ mode?: 'login' | 'register' }>
            setAuthMode(customEvent.detail?.mode === 'register' ? 'register' : 'login')
            setIsAuthModalOpen(true)
        }

        window.addEventListener('open-auth-modal', handler as EventListener)
        return () => window.removeEventListener('open-auth-modal', handler as EventListener)
    }, [])

    useEffect(() => {
        let active = true
        let refreshTimerId: number | null = null

        const scheduleSilentRefresh = () => {
            if (refreshTimerId !== null) return
            // Access token expira en 15 min; lo renovamos cada 12 min.
            refreshTimerId = window.setInterval(() => {
                refreshAccessToken().catch(() => null)
            }, 12 * 60 * 1000)
        }

        const fetchUser = async () => {
            try {
                const currentUser = await getCurrentUser()
                setUser(currentUser)
            } catch {
                setUser(null)
            }
        }

        const onAuthChange = (event: Event) => {
            const authEvent = event as CustomEvent<{ authenticated?: boolean }>
            if (authEvent.detail?.authenticated === false) {
                setUser(null)
                return
            }
            fetchUser()
        }

        window.addEventListener('auth-state-changed', onAuthChange)

        const bootstrapSession = async () => {
            const existing = getStoredAccessToken()
            if (existing) {
                scheduleSilentRefresh()
                await fetchUser()
                return
            }

            const refreshed = await refreshAccessToken().catch(() => null)
            if (!active) return

            if (refreshed) {
                scheduleSilentRefresh()
            } else if (refreshTimerId !== null) {
                window.clearInterval(refreshTimerId)
                refreshTimerId = null
            }

            fetchUser()
        }

        bootstrapSession()

        return () => {
            active = false
            window.removeEventListener('auth-state-changed', onAuthChange)
            if (refreshTimerId !== null) {
                window.clearInterval(refreshTimerId)
            }
        }
    }, [])

    return (
        <SocketProvider>
            <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#080808', color: '#7A7A7A' }}>Cargando...</div>}>
                <SeoManager />
                <AuthenticatedNavbar user={user} />
                <Routes>
                    <Route path="/" element={<Home />} />
                </Routes>
            </Suspense>
            <BottomNav />
            <div className="bottom-nav-spacer" />
            {isAuthModalOpen && (
                <Suspense fallback={null}>
                    <AuthModal
                        isOpen={isAuthModalOpen}
                        onClose={() => setIsAuthModalOpen(false)}
                        initialMode={authMode}
                    />
                </Suspense>
            )}
        </SocketProvider>
    )
}

export default App

