/* ==========================================================================
   SOCKET SERVICES
   --------------------------------------------------------------------------
   Capa de lógica para emisión de eventos Socket.IO.
   Única responsabilidad: emitir eventos a usuarios y admins.
   No conoce ni HTTP ni Prisma — solo Socket.IO.
   ========================================================================== */

import { io, adminsConectados } from "../config/socketio.config.js"

/**
 * Emite una alerta a todos los admins y editores conectados.
 * Se usa cuando la IA detecta contenido inapropiado.
 */
export const alertarAdmins = (evento: string, datos: object) => {
  for (const socketId of adminsConectados) {
    io.to(socketId).emit(evento, datos)
  }
}