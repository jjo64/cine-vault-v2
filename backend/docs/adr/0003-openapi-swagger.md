# ADR 0003: Estrategia de documentación OpenAPI/Swagger UI para la API REST

## Estado
Propuesto

## Contexto
La documentación existente en `docs/openapi.yaml` está incompleta y no refleja todos los endpoints ni los contratos actuales. Se requiere un flujo claro para mantener la documentación sincronizada con el código y exponer `/api-docs` en el entorno de desarrollo.

## Decisión
- Consolidar el spec en `backend/docs/openapi.yaml` bajo OpenAPI 3.1.
- Servir Swagger UI en `/api-docs` (solo dev) cargando el YAML estático.
- Mantener esquemas reusables en `components.schemas` y respuestas estandarizadas (`components.responses`).
- Versionar rutas bajo `/api/v1` (alias manteniendo compatibilidad temporal) y alinear con los controladores existentes.

## Consecuencias
- **Positivas:** descubribilidad de la API, onboarding rápido, menor fricción FE/BE, base para generación de SDKs.
- **Negativas:** esfuerzo continuo de mantenimiento y revisión en PRs.

## Notas de implementación
- Añadir ejemplos de éxito y error por endpoint.
- Incluir seguridad combinada: `bearerAuth` + `cookieAuth` para refresh.
- Documentar paginación y rate limiting en `components` reutilizables.
