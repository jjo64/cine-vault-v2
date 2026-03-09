# ADR 0002: Estandarizar DTOs y validación con Zod en capa de entrada

## Estado
Aceptado — implementado en refactor 2026-03-04

## Contexto
Los controladores están mezclando extracción de `req.body`/`req.params` sin un punto único de validación, lo que dificulta:
- Reutilizar tipos de entrada/salida entre controladores y servicios.
- Garantizar contratos estables para la documentación OpenAPI.
- Mantener la consistencia de mensajes de error y códigos de estado.

## Decisión
Adoptar un **pipeline de validación Zod** y DTOs tipados:
- Cada endpoint tendrá un esquema Zod en `src/schemas/` y se derivará su tipo con `z.infer` para usar en servicios.
- Los controladores solo parsean (`schema.parse`) y delegan al servicio; no habrá lógica de validación duplicada.
- Las respuestas de servicio expondrán tipos discriminados (`type` unions) para flujos especiales (ej. 2FA).

## Consecuencias
- **Positivas:** contratos claros y reutilizables, menos `any`, menos lógica repetida, alineación directa con OpenAPI.
- **Negativas:** mayor número de archivos esquema; obliga a mantenerlos al día con los cambios de dominio.

## Notas de implementación
- Crear tipos compartidos en `src/types/` (ej. `LoginResult`, `SafeUser`).
- Agregar middlewares ligeros para validar `body/query/params` con Zod por ruta.
