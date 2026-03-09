# ADR 0004: Controladores Delgados — patrón Controller → Service → Repository

## Estado
Aceptado

## Contexto
Antes del refactor, los controladores mezclaban múltiples responsabilidades:
- Instanciaban clientes externos (`new Stripe(...)`, `cloudinary.uploader.upload`, `bcrypt.hash`) directamente.
- Ejecutaban queries Prisma de forma inline sin capa intermedia.
- Duplicaban lógica de negocio entre endpoints similares.
- Gestionaban errores con `try/catch` + `console.error` + respuestas manuales en lugar de delegar al manejador global.

Esto generaba:
- Alta dificultad para escribir tests unitarios (imposible mockear sin inyección de dependencias).
- Código frágil: un cambio en la lógica de negocio requería editar varios controladores.
- Violación del principio de responsabilidad única (SRP).

## Decisión
Adoptar el patrón de **tres capas** con responsabilidades bien delimitadas:

```
Request → Route → [Zod Middleware] → Controller → Service → Repository → Prisma
```

| Capa | Responsabilidad |
|------|----------------|
| **Controller** | Extraer datos del `req`, llamar al servicio, devolver `res`. Sin lógica de negocio. |
| **Service** | Toda la lógica de negocio: autorizaciones de propiedad, validaciones semánticas, orquestación. Lanza errores de dominio (`NotFoundError`, `ForbiddenError`, etc.). |
| **Repository** | Todas las queries Prisma. Conoce la forma de los datos pero no la lógica de negocio. |

### Reglas aplicadas:
1. Los controladores no importan `prisma`, `bcrypt`, `cloudinary`, `stripe` ni `socket.io` directamente.
2. Los errores de dominio se lanzan **desde los servicios**, nunca se construyen respuestas de error en los controladores.
3. El `manejadorAsincrono` de Express 5 captura automáticamente los errores asíncronos; no se usan bloques `try/catch` locales en los controladores.
4. La emisión de Socket.IO (`emitirNotificacionService`) vive en el servicio de notificaciones, no en los controladores que la disparan.

## Alternativas consideradas
- **Inyección de dependencias con contenedor IoC** (Inversify, tsyringe): descartado por complejidad innecesaria para el alcance del proyecto.
- **Patrón CQRS**: descartado por over-engineering en este contexto.

## Consecuencias

### Positivas
- Controladores de 10-30 líneas altamente legibles.
- Los servicios pueden testearse en unidad con `vi.mock` sin levantar Express ni Prisma.
- Cambiar la capa de base de datos solo requiere modificar el repositorio.
- Los clientes externos (Stripe, Cloudinary) están aislados en servicios, facilitando sustituciones o mocks.

### Negativas
- Más archivos por feature (controller + service + repository + schema).
- Mayor indirección para operaciones simples CRUD.

## Archivos afectados
- `src/controllers/` — todos los controladores refactorizados
- `src/services/` — 6 nuevos servicios creados: `reviews`, `diary`, `watchlist`, `favorities`, `notifications`, `settings`, `payments`
- `src/repositories/` — 7 nuevos repositorios creados
