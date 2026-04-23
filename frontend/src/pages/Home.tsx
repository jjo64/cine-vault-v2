// import TextType from './TextType';
import { useEffect, useState } from 'react';
import Landing from '../components/Landing';
import HomeLogged from '@/components/HomeLogged.tsx';
import { getCurrentUser } from '../services/authServices';
import { SeoHead } from '../components/SeoHead';
import { buildWebSiteSchema } from '../utils/seo/buildMovieSchema';

interface User {
    username: string;
}

const Home: React.FC = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    let authEpoch = 0

    async function fetchUser(epoch: number) {
      try {
        const currentUser = await getCurrentUser()
        if (alive && epoch === authEpoch) {
          setUser(currentUser)
        }
      } catch {
        if (alive && epoch === authEpoch) {
          setUser(null)
        }
      } finally {
        if (alive && epoch === authEpoch) {
          setLoading(false)
        }
      }
    }

    const onAuthChange = (event: Event) => {
      const authEvent = event as CustomEvent<{ authenticated?: boolean }>
      if (authEvent.detail?.authenticated === false) {
        authEpoch += 1
        setUser(null)
        setLoading(false)
        return
      }

      authEpoch += 1
      const currentEpoch = authEpoch
      setLoading(true)
      fetchUser(currentEpoch)
    }

    window.addEventListener('auth-state-changed', onAuthChange)
    authEpoch += 1
    fetchUser(authEpoch)

    return () => {
      alive = false
      window.removeEventListener('auth-state-changed', onAuthChange)
    }
  }, [])

  if (loading) return <p>Cargando...</p>

  return (
    <>
      <SeoHead.Page
        title="CineVault — El diario cinematográfico que te define"
        description="Guarda películas en tu vault, escribe reseñas, lleva tu diario de cine y recibe una recomendación irrechazable cada noche. Para los que hacen del cine su vida."
        canonical="https://cinevault.art/"
        structuredData={buildWebSiteSchema('https://cinevault.art')}
      />
      {user ? <HomeLogged username={user.username} /> : <Landing />}
    </>
  )

}
export default Home;