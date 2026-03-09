import { Server } from "socket.io"

export const usuariosConectados = new Map<number, string>()
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

    socket.on("registrar_usuario", (userId: number) => {
      usuariosConectados.set(userId, socket.id)
      console.log(`Usuario ${userId} registrado con socket ${socket.id}`)
    })

    socket.on("disconnect", () => {
      for (const [userId, socketId] of usuariosConectados.entries()) {
        if (socketId === socket.id) {
          usuariosConectados.delete(userId)
          console.log(`Usuario ${userId} desconectado`)
          break
        }
      }
    })
  })

  return io
}
