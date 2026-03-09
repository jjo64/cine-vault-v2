# Arquitectura del backend de CineVault

Guía de comprensión (explicación) sobre cómo está organizado el backend, qué capas existen y cómo fluyen los datos. Escrita en español, alineada a las decisiones de los ADRs (controladores delgados, repositorio, validación con Zod, OpenAPI/Swagger).

## Stack y entrypoints
- **Runtime**: Node.js + Express 5 (ESM), TypeScript, Prisma (MariaDB), Redis (ioredis), Stripe, Resend, Socket.IO.
- **Entrada**: `src/server.ts` crea `express()` + `httpServer`, aplica Helmet, CORS basado en `FRONTEND_URLS`, cookies, body JSON (10 MB) y ruta raw para webhook Stripe.
- **Documentación runtime**: Swagger UI en `/api-docs` con `docs/swagger.ts` (actualmente describe Auth y esquemas compartidos; la YAML sólo cubre Auth).
- **Rutas montadas**: `/api/auth|users|movies|search|diary|watchlist|reviews|payments|rbac|information|favorites|settings|notifications`.
- **Sockets**: `config/socketio.config.ts` inicializa Socket.IO, mapea `userId -> socketId` en memoria para notificaciones en tiempo real.

## Capas y responsabilidades
- **Routes** (`src/routes/*`): sólo definen paths, middlewares (auth, rate limit, validación Zod, RBAC, caché) y envuelven controladores con `manejadorAsincrono` para propagar errores.
- **Controllers** (`src/controllers/*`): extraen datos de `req`, llaman a servicios y devuelven la respuesta. No contienen lógica de negocio ni Prisma.
- **Services** (`src/services/*`): contienen la lógica de negocio y coordinan repositorios, caché, Stripe, Cloudinary, Resend, Socket.IO. Lanzan `AppErrors` personalizados.
- **Repositories** (`src/repositories/*`): encapsulan Prisma para cada agregado (Users, Sessions, Reviews, Diary, Watchlist, Favorites, Payments, Notifications…). Siguen ADR 0001 (patrón repositorio) para desacoplar Prisma.
- **Schemas** (`src/schemas/*`): validan/parsean entrada con Zod. Los middlewares `validarBody|Query|Params` reescriben `req` con datos parseados.
- **Middlewares**: auth (JWT), RBAC (roles/membresías con caché Redis), rate limit (global + auth + email), caché HTTP (Redis), validación Zod, manejador de errores, detección de spikes en servicios.
- **Errores**: `errors/AppErrors.ts` define jerarquía (Validation, Unauthorized, Forbidden, NotFound, Conflict, Gone, TooManyRequests). El manejador global traduce a JSON estructurado.
- **Lib/helpers**: Crypto (bcrypt + 2FA TOTP AES-256), tokens (JWT acceso 15 min, refresh 7 días rotatorio, sesiones en DB), cache utilitario Redis, email (Resend), jobs (cron limpieza de usuarios no verificados), TMDB fetch helper, Redis helpers, Prisma adapter MariaDB.

## Flujo de una petición típica
1. Request → CORS/Helmet → rate limit global → body parser (raw en `/api/payments/webhook` si aplica) → cookies → `middlewareAutenticacion` (opcional según ruta) → Zod validator → middlewares específicos (RBAC, caché HTTP) → controlador → servicio.
2. El servicio usa repositorios / clientes externos, puede invalidar caché (Redis) y emitir notificaciones (Socket.IO) o correos (Resend).
3. Si hay error se lanza `AppError`; `manejadorErrores` responde con `{ error: { code, message } }` y status apropiado. Errores no controlados → 500 genérico.

## Seguridad
- **Auth**: JWT acceso corto + refresh en cookie HTTP-only/secure/strict, rotación en cada refresh; 2FA TOTP opcional; verificación de email obligatoria antes de login; sesiones persistidas (SessionRepository) para revocación.
- **Rate limiting**: global (200 req/15 min/IP), estricto en `/auth` (5 intentos/15 min/IP) y emails (3/h). Servicios `checkIPSpike` añaden otro umbral de 10 req en 5 s para acciones sensibles (diary, reviews, comments, search).
- **RBAC**: roles (admin, editor, user) + membresías (free, vip, pro) combinadas; permisos centralizados en `config/permisos.ts`. Cacheo de rol/membresía 2 min en Redis; invalidación helpers.
- **Validación**: Zod en entrada; tipos inferidos para servicios; control de tamaño base64 avatar (<=5 MB); rating reseñas step 0.5.
- **Headers**: Helmet; `x-powered-by` deshabilitado; CORS restringido a `FRONTEND_URLS` coma-separado, con fallback para herramientas sin origen.

## Datos, caché y jobs
- **Base de datos**: Prisma MariaDB con adaptador `PrismaMariaDb`. Repositorios por agregado. Algunas consultas incluyen agregados/contadores para evitar N+1.
- **Redis**: dos clientes (config/redis para cache/limiter con URL, lib/redis para utilidades/in-memory en tests). Usado para caché HTTP (`cachear`), getOSet, rate limit flexible, RBAC, colas de notificaciones offline, TTLs centrales (`CACHE_TTL`).
- **Cachés clave**: perfil/watchlist/favorites por usuario, búsquedas TMDB (`tmdb:*`), reviews por película (`reviews:movie:*`), agregados de película (`movie:agg:*`), rol/membresía (`rol:*`, `membresia:*`).
- **Jobs**: `cron.schedule` cada hora → `limpiarUsuariosNoVerificados` elimina cuentas no verificadas >24 h.

## Integraciones externas
- **TMDB**: helper `consultarTMDB` fuerza `language=es-ES`; rutas de movies/search usan `getOSet` para cachear resultados y enriquecer con créditos/títulos alternativos.
- **Stripe**: `payments.services.ts` crea checkout/portal y procesa webhooks (suscripción, renovación, fallo, cancelación) con idempotencia en Redis.
- **Resend**: correos de verificación, reset password, códigos 2FA, recomendaciones y recibos; en ausencia de API key se simula en no prod.
- **Cloudinary**: subida de avatar base64 con validación de formato/tamaño.
- **Socket.IO**: notificaciones en tiempo real; mensajes encolados en Redis si el usuario está offline.

## Decisiones clave (ADRs)
- Repositorio para desacoplar Prisma y permitir tests/migraciones sin tocar servicios (ADR 0001).
- DTOs con Zod para validación y tipos inferidos (ADR 0002).
- OpenAPI/Swagger centralizado, servido en dev en `/api-docs` (ADR 0003).
- Controladores delgados: sin lógica ni Prisma; servicios lanzan errores; middlewares para cross-cutting (ADR 0004).

## Gaps y observaciones
- `docs/openapi.yaml` sólo documenta Auth; resto de dominios expuestos en rutas pero faltan en el spec.
- `rbac.routes.ts` es demostrativo (ejemplos para permisos/reportes/noticias/actividad).
- `diary.routes.ts` tiene ruta DELETE duplicada; la segunda es redundante.
- Config de Redis aparece en dos módulos (`config/redis.ts` con URL y `lib/redis.ts` con host/port + mock test); alinear en despliegue.
- Sitemap señala Settings sin montar; en `server.ts` está montado `/api/settings`.
