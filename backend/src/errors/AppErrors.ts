/* ==========================================================================
   JERARQUÍA DE ERRORES PERSONALIZADOS
   --------------------------------------------------------------------------
   Todos los servicios lanzan estas clases. El manejadorErrores global de
   Express las intercepta y devuelve el JSON apropiado con el statusCode.
   ========================================================================== */

export class ApplicationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/** 400 - Datos inválidos o malformados */
export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR")
  }
}

/** 401 - No autenticado / credenciales incorrectas */
export class UnauthorizedError extends ApplicationError {
  constructor(message = "No autorizado") {
    super(message, 401, "UNAUTHORIZED")
  }
}

/** 403 - Autenticado pero sin permisos suficientes */
export class ForbiddenError extends ApplicationError {
  constructor(message = "Acceso prohibido") {
    super(message, 403, "FORBIDDEN")
  }
}

/** 404 - Recurso no encontrado */
export class NotFoundError extends ApplicationError {
  constructor(message = "Recurso no encontrado") {
    super(message, 404, "NOT_FOUND")
  }
}

/** 409 - Conflicto (ej: usuario ya existe) */
export class ConflictError extends ApplicationError {
  constructor(message = "Conflicto con un recurso existente") {
    super(message, 409, "CONFLICT")
  }
}

/** 410 - Recurso expirado (ej: token de verificación vencido) */
export class GoneError extends ApplicationError {
  constructor(message = "El recurso ha expirado") {
    super(message, 410, "GONE")
  }
}

/** 429 - Demasiadas solicitudes */
export class TooManyRequestsError extends ApplicationError {
  constructor(message = "Demasiadas solicitudes. Intenta nuevamente luego") {
    super(message, 429, "TOO_MANY_REQUESTS")
  }
}

/** 422 - Contenido inapropiado detectado por el sistema de moderación  OPENAI*/
export class ContentModerationError extends ApplicationError {
  constructor(message = "Contenido no permitido detectado") {
    super(message, 422, "CONTENT_MODERATION_ERROR")
  }
}
