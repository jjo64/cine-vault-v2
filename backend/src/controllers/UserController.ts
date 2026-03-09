import { Request, Response } from "express"
import type { SolicitudAutenticada } from "../middlewares/auth.middlewares.js"
import * as userService from "../services/user.services.js"
import { emitirNotificacion } from "./NotificationsController.js"
import jwt from "jsonwebtoken"
import type { PayloadAcceso } from "../middlewares/auth.middlewares.js"

export const obtenerUsuarios = async (req: Request, res: Response) => {
  res.json(await userService.obtenerUsuariosService())
}
export const obtenerUsuarioPorId = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]
  let viewerId: number | null = null

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as PayloadAcceso
      viewerId = payload.user_id
    } catch {
      // Si el token no es valido se ignora y el endpoint sigue siendo publico.
      viewerId = null
    }
  }

  res.json(
    await userService.obtenerUsuarioPorIdService(Number(req.params.id), viewerId)
  )
}
export const obtenerUsuarioPorUsername = async (req: Request, res: Response) => {
  res.json(
    await userService.obtenerUsuarioPorUsernameService(String(req.params.username))
  )
}
export const obtenerSeguidores = async (req: Request, res: Response) => {
  res.json(await userService.obtenerSeguidoresService(Number(req.params.id)))
}
export const obtenerSiguiendo = async (req: Request, res: Response) => {
  res.json(await userService.obtenerSiguiendoService(Number(req.params.id)))
}
export const actualizarPerfil = async (
  req: SolicitudAutenticada,
  res: Response
) => {
  await userService.actualizarPerfilService(req.user!.user_id, req.body)
  res.json({ message: "Perfil actualizado correctamente" })
}
export const seguirUsuario = async (
  req: SolicitudAutenticada,
  res: Response
) => {
  await userService.seguirUsuarioService(
    req.user!.user_id,
    Number(req.params.id)
  )

  // Notificar al usuario seguido
  if (req.user!.user_id !== Number(req.params.id)) {
    await emitirNotificacion({
      user_id: Number(req.params.id),
      sender_id: req.user!.user_id,
      type: "follow",
    })
  }

  res.json({ message: "Usuario seguido correctamente" })
}
export const dejarDeSeguirUsuario = async (
  req: SolicitudAutenticada,
  res: Response
) => {
  await userService.dejarDeSeguirUsuarioService(
    req.user!.user_id,
    Number(req.params.id)
  )
  res.json({ message: "Has dejado de seguir al usuario correctamente" })
}
