/* ==========================================================================
   SOCKET CLIENT
   --------------------------------------------------------------------------
   Conexión del panel de admin al servidor Socket.IO.
   Gestiona la conexión, registro del usuario y escucha de eventos.
   
   Reutilizable en el frontend real — solo hay que cambiar la URL del servidor.
   ========================================================================== */

import { io } from "socket.io-client"

const SOCKET_URL = "http://localhost:4000"

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false, // no conectar hasta que el usuario haga login
})

/**
 * Conecta el socket y registra al usuario con su rol.
 * Llamar después del login exitoso.
 */
export const conectarSocket = (userId: number, role: string) => {
  socket.connect()
  socket.emit("registrar_usuario", { userId, role })
}

/**
 * Desconecta el socket.
 * Llamar cuando el usuario cierra sesión.
 */
export const desconectarSocket = () => {
  socket.disconnect()
}