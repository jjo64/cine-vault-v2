import { Server } from "socket.io"

export const usuariosConectados = new Map<number, string>()
export const adminsConectados = new Set<string>()  // sockets de admins y editores
export let io: Server

export const initSocketIO = (httpServer: any) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URLS
        ? process.env.FRONTEND_URLS.split(",").map((url) => url.trim())
        : [],
      credentials: true,
    },
  })

  io.on("connection", (socket) => {
    console.log(`Socket conectado: ${socket.id}`)

    socket.on("registrar_usuario", (data: { userId: number, role: string }) => {
      const userId = typeof data === "number" ? data : data.userId
      const role = typeof data === "number" ? "user" : data.role

      usuariosConectados.set(userId, socket.id)

      if (role === "admin" || role === "editor") {
        adminsConectados.add(socket.id)
      }
    })

    socket.on("disconnect", () => {
      for (const [userId, socketId] of usuariosConectados.entries()) {
        if (socketId === socket.id) {
          usuariosConectados.delete(userId)
          adminsConectados.delete(socket.id)
          break
        }
      }
    })
  })

  return io
}