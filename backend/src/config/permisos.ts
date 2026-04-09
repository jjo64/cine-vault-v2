/* ==========================================================================
   SISTEMA DE PERMISOS (RBAC)
   --------------------------------------------------------------------------
   Relaciona roles y membresías con permisos específicos.
   Para agregar un permiso nuevo: definirlo en PERMISOS y asignarlo al rol
   correspondiente en PERMISOS_POR_ROL o PERMISOS_POR_MEMBRESIA.
   No hay que tocar ningún middleware ni controlador.
   ========================================================================== */

export const PERMISOS = {
  // Reviews
  BORRAR_REVIEWS_AJENAS: "borrar_reviews_ajenas",

  BORRAR_COMENTARIOS_AJENOS: "borrar_comentarios_ajenos",  //Creo permiso para eliminar comentarios ajenos

  // Reportes
  GESTIONAR_REPORTES: "gestionar_reportes", // resolver/rechazar
  VER_REPORTES: "ver_reportes", // solo lectura

  // Noticias
  GESTIONAR_NOTICIAS: "gestionar_noticias", // crear/editar/borrar

  // Usuarios
  CAMBIAR_ROL_USUARIOS: "cambiar_rol_usuarios",
  VER_ACTIVIDAD_USUARIOS: "ver_actividad_usuarios",

  // Pagos
  VER_PAGOS: "ver_pagos",

  // Membresía — funcionalidades futuras
  EXHIBIR_PELICULAS: "exhibir_peliculas",
} as const

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS]

/* ==========================================================================
   PERMISOS POR ROL
   ========================================================================== */

const PERMISOS_POR_ROL: Record<string, Permiso[]> = {
  admin: [
    PERMISOS.BORRAR_REVIEWS_AJENAS,
    PERMISOS.GESTIONAR_REPORTES,
    PERMISOS.VER_REPORTES,
    PERMISOS.GESTIONAR_NOTICIAS,
    PERMISOS.CAMBIAR_ROL_USUARIOS,
    PERMISOS.VER_ACTIVIDAD_USUARIOS,
    PERMISOS.VER_PAGOS,
    PERMISOS.BORRAR_COMENTARIOS_AJENOS // Añado los permisos al rol de admin para gestionar comentarios ajenos
  ],
  editor: [PERMISOS.GESTIONAR_NOTICIAS, PERMISOS.VER_REPORTES],
  user: [],
}

/* ==========================================================================
   PERMISOS POR MEMBRESÍA
   --------------------------------------------------------------------------
   Separados del rol para que puedan combinarse independientemente.
   Un usuario puede ser role=user y membership=vip al mismo tiempo.
   ========================================================================== */

const PERMISOS_POR_MEMBRESIA: Record<string, Permiso[]> = {
  free: [],
  vip: [
    PERMISOS.EXHIBIR_PELICULAS, // hasta 2 películas (validado en el servicio)
  ],
  pro: [
    PERMISOS.EXHIBIR_PELICULAS, // hasta 4 películas (validado en el servicio)
  ],
}

/* ==========================================================================
   LÍMITES POR MEMBRESÍA
   --------------------------------------------------------------------------
   Centraliza los límites numéricos para no hardcodearlos en los servicios.
   ========================================================================== */

export const LIMITES_MEMBRESIA: Record<string, Record<string, number>> = {
  free: {
    peliculas_exhibicion: 0,
  },
  vip: {
    peliculas_exhibicion: 2,
  },
  pro: {
    peliculas_exhibicion: 4,
  },
}

/* ==========================================================================
   FUNCIÓN PRINCIPAL — verificar si un usuario tiene un permiso
   ========================================================================== */

/**
 * Verifica si un rol/membresía tiene un permiso específico.
 * Combina permisos de rol + permisos de membresía.
 */
export const tienePermiso = (
  rol: string,
  permiso: Permiso,
  membresia?: string
): boolean => {
  const permisosRol = PERMISOS_POR_ROL[rol] ?? []
  const permisosMembresia = membresia
    ? (PERMISOS_POR_MEMBRESIA[membresia] ?? [])
    : []

  return [...permisosRol, ...permisosMembresia].includes(permiso)
}
