import {
  ConflictError,
  ValidationError,
  NotFoundError,
} from "../errors/AppErrors.js"
import { Prisma } from "@prisma/client"
import { userProfileRepository } from "../repositories/userProfileRepository.js"
import { userRepository } from "../repositories/UserRepository.js"

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
    await userProfileRepository.update(idUsuario, datosActualizar)
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
    await userProfileRepository.createFollow(idUsuario, idUsuarioSeguir)
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
  const eliminado = await userProfileRepository.deleteFollow(
    idUsuario,
    idUsuarioDejar
  )

  if (eliminado.count === 0) {
    throw new NotFoundError("No estabas siguiendo a este usuario")
  }
}

/**
 * Obtiene todos los usuarios con campos seguros (sin contraseña).
 */
export const obtenerUsuariosService = async () => {
  return userRepository.findAll()
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
  const usuario = await userProfileRepository.findPublicById(id)
  if (!usuario) throw new NotFoundError("Usuario no encontrado")

  if (!viewerId || viewerId === id) return { ...usuario, is_following: false }

  const relacion = await userProfileRepository.findFollow(viewerId, id)
  return { ...usuario, is_following: Boolean(relacion) }
}

/**
 * Obtiene un usuario por su username único.
 */
export const obtenerUsuarioPorUsernameService = async (username: string) => {
  const normalized = username.trim()
  if (!normalized) throw new ValidationError("Username inválido")

  const usuario = await userProfileRepository.findPublicByUsername(normalized)
  if (!usuario) throw new NotFoundError("Usuario no encontrado")
  return usuario
}

export const buscarUsuariosService = async (query: string, limit = 12) => {
  const normalized = query.trim()
  if (!normalized) return []

  const take = Math.max(1, Math.min(30, Number.isFinite(limit) ? limit : 12))
  return userProfileRepository.search(normalized, take)
}

/**
 * Obtiene los seguidores de un usuario.
 * Resuelto con include anidado en UNA SOLA QUERY (fix N+1).
 */
export const obtenerSeguidoresService = async (id: number) => {
  const usuario = await userProfileRepository.findFollowers(id)
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
  const usuario = await userProfileRepository.findFollowing(id)
  if (!usuario) throw new NotFoundError("Usuario no encontrado")
  return usuario.follows_follows_follower_idTousers
    .map((f) => f.users_follows_following_idTousers)
    .filter(Boolean)
}

const EMPTY_SIGNATURE = {
  pivotal_film: null,
  pivotal_film_detail: null,
  formative_director: null,
  formative_director_detail: null,
  unforgettable_scene: null,
  unforgettable_scene_detail: null,
  cinema_turning_year: null,
  cinema_turning_year_detail: null,
}

export const obtenerFirmaCinematograficaPublicaService = async (id: number) => {
  const user = await userProfileRepository.findById(id)
  if (!user) throw new NotFoundError("Usuario no encontrado")

  try {
    const rows = await userProfileRepository.findCinematographicSignature(id)
    return rows[0] ?? { user_id: id, ...EMPTY_SIGNATURE }
  } catch {
    return { user_id: id, ...EMPTY_SIGNATURE }
  }
}

export const obtenerGaleriaCuradaPublicaService = async (id: number) => {
  const user = await userProfileRepository.findById(id)
  if (!user) throw new NotFoundError("Usuario no encontrado")

  try {
    const items = await userProfileRepository.findCuratedGallery(id)
    return { items }
  } catch {
    return { items: [] }
  }
}
