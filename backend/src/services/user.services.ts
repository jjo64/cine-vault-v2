import { Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import {
  ConflictError,
  ValidationError,
  NotFoundError,
} from "../errors/AppErrors.js"

// Tipo tipado para la actualización de perfil (reemplaza `any`)
type ActualizarPerfil = {
  username?: string
  avatar_url?: string
  bio?: string
}

/**
 * Actualiza el perfil del usuario autenticado.
 * Usa tipo ActualizarPerfil tipado (fix: antes usaba `any`).
 * Usa req.user!.user_id (fix: antes usaba Number(req.user!)).
 */
export const actualizarPerfilService = async (
  idUsuario: number,
  datos: { username?: string; avatar_url?: string; bio?: string }
) => {
  const datosActualizar: ActualizarPerfil = {}

  if (datos.username !== undefined) {
    if (
      typeof datos.username !== "string" ||
      datos.username.trim().length < 3
    ) {
      throw new ValidationError("Nombre de usuario inválido")
    }
    datosActualizar.username = datos.username.trim()
  }

  if (datos.avatar_url !== undefined) {
    if (typeof datos.avatar_url !== "string") {
      throw new ValidationError("Avatar inválido")
    }
    datosActualizar.avatar_url = datos.avatar_url
  }

  if (datos.bio !== undefined) {
    if (typeof datos.bio !== "string" || datos.bio.length > 280) {
      throw new ValidationError("La bio es inválida (máximo 280 caracteres)")
    }
    datosActualizar.bio = datos.bio
  }

  if (Object.keys(datosActualizar).length === 0) {
    throw new ValidationError("No hay datos para actualizar")
  }

  try {
    await prisma.users.update({
      where: { id: idUsuario },
      data: datosActualizar,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError("El nombre de usuario ya está en uso")
    }
    throw error
  }
}

/**
 * Sigue a un usuario.
 * Usa req.user!.user_id del middleware de autenticación (fix: antes usaba Number(req.user!)).
 */
export const seguirUsuarioService = async (
  idUsuario: number,
  idUsuarioSeguir: number
) => {
  if (idUsuario === idUsuarioSeguir) {
    throw new ValidationError("No puedes seguirte a ti mismo")
  }

  try {
    await prisma.follows.create({
      data: { follower_id: idUsuario, following_id: idUsuarioSeguir },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError("Ya estás siguiendo a este usuario")
    }
    throw error
  }
}

/**
 * Deja de seguir a un usuario.
 * Usa req.user!.user_id del middleware de autenticación (fix: antes usaba Number(req.user!)).
 */
export const dejarDeSeguirUsuarioService = async (
  idUsuario: number,
  idUsuarioDejar: number
) => {
  const eliminado = await prisma.follows.deleteMany({
    where: { follower_id: idUsuario, following_id: idUsuarioDejar },
  })

  if (eliminado.count === 0) {
    throw new NotFoundError("No estabas siguiendo a este usuario")
  }
}

/**
 * Obtiene todos los usuarios con campos seguros (sin contraseña).
 */
export const obtenerUsuariosService = async () => {
  return prisma.users.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      avatar_url: true,
    },
  })
}

/**
 * Obtiene un usuario por su ID.
 * Devuelve solo _count de relaciones (reviews, diary, watchlist) en vez de los datos completos
 * para evitar devolver miles de registros sin límite.
 */
export const obtenerUsuarioPorIdService = async (
  id: number,
  viewerId: number | null = null
) => {
  const usuario = await prisma.users.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      avatar_url: true,
      bio: true,
      created_at: true,
      _count: {
        select: {
          reviews: true,
          diary_entries: true,
          watchlist: true,
          follows_follows_follower_idTousers: true,
          follows_follows_following_idTousers: true,
        },
      },
    },
  })
  if (!usuario) throw new NotFoundError("Usuario no encontrado")

  if (!viewerId || viewerId === id) {
    return {
      ...usuario,
      is_following: false,
    }
  }

  const relacion = await prisma.follows.findUnique({
    where: {
      follower_id_following_id: {
        follower_id: viewerId,
        following_id: id,
      },
    },
    select: { follower_id: true },
  })

  return {
    ...usuario,
    is_following: Boolean(relacion),
  }
}

/**
 * Obtiene un usuario por su username único.
 */
export const obtenerUsuarioPorUsernameService = async (username: string) => {
  const normalized = username.trim()
  if (!normalized) throw new ValidationError("Username inválido")

  const usuario = await prisma.users.findUnique({
    where: { username: normalized },
    select: {
      id: true,
      username: true,
      avatar_url: true,
      bio: true,
      created_at: true,
      _count: {
        select: {
          reviews: true,
          diary_entries: true,
          watchlist: true,
          follows_follows_follower_idTousers: true,
          follows_follows_following_idTousers: true,
        },
      },
    },
  })

  if (!usuario) throw new NotFoundError("Usuario no encontrado")
  return usuario
}

/**
 * Obtiene los seguidores de un usuario.
 * Resuelto con include anidado en UNA SOLA QUERY (fix N+1).
 */
export const obtenerSeguidoresService = async (id: number) => {
  const usuario = await prisma.users.findUnique({
    where: { id },
    include: {
      follows_follows_following_idTousers: {
        include: {
          users_follows_follower_idTousers: {
            select: { id: true, username: true, avatar_url: true },
          },
        },
      },
    },
  })
  if (!usuario) throw new NotFoundError("Usuario no encontrado")
  return usuario.follows_follows_following_idTousers
    .map((f) => f.users_follows_follower_idTousers)
    .filter(Boolean)
}

/**
 * Obtiene los usuarios que sigue un usuario.
 * Resuelto con include anidado en UNA SOLA QUERY (fix N+1).
 */
export const obtenerSiguiendoService = async (id: number) => {
  const usuario = await prisma.users.findUnique({
    where: { id },
    include: {
      follows_follows_follower_idTousers: {
        include: {
          users_follows_following_idTousers: {
            select: { id: true, username: true, avatar_url: true },
          },
        },
      },
    },
  })
  if (!usuario) throw new NotFoundError("Usuario no encontrado")
  return usuario.follows_follows_follower_idTousers
    .map((f) => f.users_follows_following_idTousers)
    .filter(Boolean)
}
