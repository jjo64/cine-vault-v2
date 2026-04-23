import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { io } from "socket.io-client"
import { authorizedFetch, clearStoredAccessToken, getStoredAccessToken } from "../services/authServices"
import { notify } from "../lib/notify"

export const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  autoConnect: false,
})

export const conectarSocket = (token: string) => {
  socket.auth = { token }
  socket.connect()
}

export const desconectarSocket = () => {
  socket.disconnect()
}

interface Notificacion {
  id: number
  user_id: number
  sender_id: number
  type: "follow" | "like" | "comment" | "report_resolved" | "review" | "system"
  read: boolean
  created_at: string
  message?: string | null
  sender: {
    id: number
    username: string
    avatar_url: string | null
  }
}

interface SocketContextType {
  notificaciones: Notificacion[]
  noLeidas: number
  marcarLeida: (id: number) => Promise<void>
  marcarTodasLeidas: () => Promise<void>
  loading: boolean
}

const SocketContext = createContext<SocketContextType | null>(null)

const mergeUniqueById = (base: Notificacion[], incoming: Notificacion[]) => {
  const map = new Map<number, Notificacion>()
  for (const item of base) map.set(item.id, item)
  for (const item of incoming) map.set(item.id, item)
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)

  const getUserIdFromToken = (token: string): number | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || '')) as { user_id?: unknown }
      return typeof payload.user_id === 'number' ? payload.user_id : null
    } catch {
      return null
    }
  }

  useEffect(() => {
    let active = true

    const start = async () => {
      const token = getStoredAccessToken()
      if (!token) {
        setNotificaciones([])
        setLoading(false)
        return
      }

      const userId = getUserIdFromToken(token)
      if (!userId) {
        clearStoredAccessToken()
        setNotificaciones([])
        setLoading(false)
        return
      }

      try {
        conectarSocket(token)

        socket.on("connect", () => {
          socket.emit("registrar_usuario", userId)
        })

        socket.on("nueva_notificacion", (notificacion: Notificacion) => {
          setNotificaciones((prev) => [notificacion, ...prev])
          notify.fromSocket({
            type: notificacion.type,
            sender: notificacion.sender ? { username: notificacion.sender.username } : undefined,
            message: notificacion.message ?? undefined,
          })
        })

        // Fetch normal notifications
        const res = await authorizedFetch('/api/notifications')
        const baseList = res.ok ? await res.json() : []

        // Fetch pending (offline) notifications from Redis
        const pendingRes = await authorizedFetch('/api/notifications/pending')
        let pendingList: Notificacion[] = []
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json()
          pendingList = Array.isArray(pendingData.pending) ? pendingData.pending : []
          
          // Show toasts for pending notifications that are new
          const pendingNuevas = pendingList.filter(
            (pending) => !baseList.some((existing: Notificacion) => existing.id === pending.id)
          )
          for (const pending of pendingNuevas) {
            notify.fromSocket({
              type: pending.type,
              sender: pending.sender ? { username: pending.sender.username } : undefined,
              message: pending.message ?? undefined,
            })
          }
        }

        if (active) {
          const merged = mergeUniqueById(Array.isArray(baseList) ? baseList : [], pendingList)
          setNotificaciones(merged)
        }
      } catch (err) {
        console.error("Error initializing socket/notifications:", err)
        if (active) setNotificaciones([])
      } finally {
        if (active) setLoading(false)
      }
    }

    const onAuthChange = () => {
      start()
    }

    window.addEventListener('auth-state-changed', onAuthChange)
    start()

    return () => {
      active = false
      window.removeEventListener('auth-state-changed', onAuthChange)
      socket.off("connect")
      socket.off("nueva_notificacion")
      desconectarSocket()
    }
  }, [])

  const noLeidas = notificaciones.filter((n) => !n.read).length

  const marcarLeida = async (id: number) => {
    const res = await authorizedFetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
    })
    if (!res.ok) return
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const marcarTodasLeidas = async () => {
    const res = await authorizedFetch('/api/notifications/read-all', {
      method: "PATCH",
    })
    if (!res.ok) return
    setNotificaciones((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <SocketContext.Provider value={{ notificaciones, noLeidas, marcarLeida, marcarTodasLeidas, loading }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) throw new Error("useSocket debe usarse dentro de SocketProvider")
  return context
}