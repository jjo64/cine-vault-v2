import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { useSocket } from "../context/SocketContext"

type NotificationType = "follow" | "like" | "comment" | "report_resolved" | "review" | "system"

const mensajeNotificacion = (type: NotificationType, username: string) => {
  switch (type) {
    case "like": return `${username} dio like a tu reseña`
    case "follow": return `${username} empezó a seguirte`
    case "comment": return `${username} comentó tu reseña`
    case "report_resolved": return "Tu reporte ha sido resuelto"
    default: return "Nueva notificación"
  }
}

const formatRelativeDate = (isoDate: string) => {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" })

  if (Math.abs(diffMs) < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute")
  }

  if (Math.abs(diffMs) < day) {
    return rtf.format(Math.round(diffMs / hour), "hour")
  }

  return rtf.format(Math.round(diffMs / day), "day")
}

type NotificacionesProps = {
  open?: boolean
  showTrigger?: boolean
}

export const Notificaciones = ({ open, showTrigger = true }: NotificacionesProps) => {
  const [abiertoInterno, setAbiertoInterno] = useState(false)
  const { notificaciones, noLeidas, marcarLeida, marcarTodasLeidas, loading } = useSocket()

  const items = useMemo(() => notificaciones, [notificaciones])
  const abierto = open ?? abiertoInterno

  return (
    <div style={{ position: "relative" }}>
      {showTrigger && (
        <button
          onClick={() => setAbiertoInterno((prev) => !prev)}
          aria-label={noLeidas > 0
            ? `Notificaciones, ${noLeidas} sin leer`
            : 'Notificaciones'}
          aria-expanded={abiertoInterno}
          aria-haspopup="true"
          aria-controls="notificaciones-panel"
          style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span aria-hidden="true">🔔</span>
          {noLeidas > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -5,
                right: -5,
                background: "red",
                color: "white",
                borderRadius: "50%",
                width: 18,
                height: 18,
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {noLeidas}
            </span>
          )}
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {noLeidas > 0 ? `${noLeidas} notificaciones sin leer` : ''}
          </span>
        </button>
      )}

      {/* Panel de notificaciones */}
      {abierto && (
        <div
          id="notificaciones-panel"
          role="dialog"
          aria-label="Panel de notificaciones"
          aria-modal="false"
          style={{
            position: "absolute",
            right: 0,
            top: 35,
            width: 320,
            background: "#111111",
            border: "1px solid #252525",
            borderRadius: 0,
            boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
            zIndex: 1000,
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #252525", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#E2E2E2" }}>Notificaciones</span>
            <button
              onClick={() => marcarTodasLeidas()}
              disabled={noLeidas <= 0}
              aria-label="Marcar todas las notificaciones como leídas"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#7a7a7a",
                background: "transparent",
                border: "none",
                cursor: noLeidas > 0 ? "pointer" : "default",
                opacity: noLeidas > 0 ? 1 : 0.6,
              }}
            >
                Marcar todas
              </button>
          </div>


          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#7a7a7a", fontFamily: "'Syne', sans-serif", fontSize: 12 }}>
              Cargando...
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#7a7a7a", fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontStyle: "italic" }}>
              Sin notificaciones nuevas.
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((n, index) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.34, delay: index * 0.04 }}
                  onClick={() => !n.read && marcarLeida(n.id)}
                  onKeyDown={(e) => { if (!n.read && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); marcarLeida(n.id) } }}
                  role={!n.read ? "button" : undefined}
                  tabIndex={!n.read ? 0 : undefined}
                  aria-label={!n.read
                    ? `Notificación de ${n.sender?.username ?? 'alguien'}: ${mensajeNotificacion(n.type, n.sender?.username ?? 'alguien')}. Presionar para marcar como leída`
                    : undefined}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #252525",
                    cursor: n.read ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: n.read ? "#7a7a7a" : "#E2E2E2",
                  }}
                  whileHover={!n.read ? { backgroundColor: "#1a1a1a" } : undefined}
                >
                  {n.sender?.avatar_url ? (
                    <img
                      src={n.sender.avatar_url}
                      alt={`Avatar de ${n.sender.username}`}
                      style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#252525",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      {n.sender?.username?.slice(0, 1).toUpperCase() ?? "?"}
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 2 }}>
                    <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontSize: 12 }}>
                      {mensajeNotificacion(n.type, n.sender?.username ?? "Alguien")}
                    </p>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, color: "#7a7a7a" }}>
                      {formatRelativeDate(n.created_at)}
                    </span>
                  </div>

                  {!n.read && (
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#D4AF7A", marginLeft: "auto" }} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  )
}