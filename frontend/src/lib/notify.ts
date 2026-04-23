import { toast } from 'sonner'

export const notify = {
  // Generic
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),

  // Auth
  loginOk:         () => toast.success('Bienvenido de vuelta.'),
  loginError:      (msg: string) => toast.error(msg),
  registerOk:      () => toast.success('Cuenta creada. Revisá tu email para verificarla.'),
  logoutOk:        () => toast('Sesión cerrada.'),
  emailVerified:   () => toast.success('Email verificado. ¡Bienvenido a CineVault!'),
  passwordChanged: () => toast.success('Contraseña actualizada.'),
  unauthorized:    () => toast.error('Tenés que iniciar sesión primero.'),
  networkError:    () => toast.error('Error de conexión. Intentá de nuevo.'),
  serverError:     () => toast.error('Algo salió mal en el servidor.'),

  watchlistAdd:    (title: string) => toast.success(`"${title}" agregada a tu watchlist.`),
  watchlistRemove: (title: string) => toast(`"${title}" quitada de watchlist.`),
  favoritesAdd:    (title: string) => toast.success(`"${title}" agregada a favoritos.`),
  favoritesRemove: (title: string) => toast(`"${title}" quitada de favoritos.`),

  profileSaved:    () => toast.success('Perfil actualizado.'),
  avatarSaved:     () => toast.success('Avatar actualizado.'),

  followOk:        (username: string) => toast.success(`Ahora seguís a ${username}.`),
  unfollowOk:      (username: string) => toast(`Dejaste de seguir a ${username}.`),

  fromSocket: (notif: {
    type: string,
    sender?: { username: string },
    message?: string
  }) => {
    const actor = notif.sender?.username ?? 'Alguien'
    switch (notif.type) {
      case 'follow':  toast(`${actor} empezó a seguirte.`); break
      case 'like':    toast(`${actor} le dio like a tu reseña.`); break
      case 'comment': toast(`${actor} comentó tu reseña.`); break
      case 'review':  toast(`${actor} mencionó una de tus películas.`); break
      case 'system':  toast(notif.message ?? 'Nueva notificación.'); break
      default:        toast(notif.message ?? 'Nueva notificación.')
    }
  }
}
