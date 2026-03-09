# Referencia por dominios (backend)

Visión orientada a referencia de los módulos del backend. Incluye rutas, validación, lógica de negocio, caché y dependencias externas. Usa esta guía como diccionario rápido al navegar el código.

## Auth
- **Rutas**: `/api/auth/login|register|refresh|logout|verify|resend-verification|forgot-password|reset-password|cambiar-contrasena|revocar-sesiones|sessions/:id|2fa/activar|2fa/confirmar|2fa/desactivar|2fa/verificar` + OAuth Google (`/google`, `/google/callback`).
- **Middleware**: rate limit estricto en login/register/2FA (5/15 min/IP), limitadorEmail (3/h) en reenvíos y forgot, auth en el resto.
- **Validación**: `schemas/auth.ts` (login, forgot/reset, change password, 2FA, revoke session params).
- **Servicios**: `auth.services.ts`
  - Login: verifica email confirmado, bcrypt, soporta 2FA → devuelve token temporal o tokens reales.
  - Registro: valida con Zod (`schemas/user`), crea usuario, genera token de verificación (1 h) y envía correo (Resend).
  - Verificación email / reenvío: usa `authTokenRepository` (tipo VERIFY_EMAIL), maneja expiración.
  - Refresh token: rota refresh (JWT + sesión persistida hash), emite nuevo access + refresh; revoca sesión previa.
  - Logout: borra sesión si refresh válido.
  - Forgot/reset password: tokens RESET_PASSWORD (15 min), borrado de sesiones tras reset.
  - 2FA: genera secreto TOTP (AES-256), QR (qrcode), verifica códigos, permite desactivar.
  - Cambio de contraseña: valida actual, evita misma contraseña, revoca otras sesiones.
  - Listar/revocar sesiones: usa SessionRepository.
- **Tokens**: acceso 15 min, refresh 7 días en cookie httpOnly/secure/strict. Secrets requeridos: `JWT_SECRET`, `REFRESH_SECRET`, `VERIFY_EMAIL_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`.

## Users & Social
- **Rutas**: `/api/users` (listado, auth requerida), `/api/users/:id` (perfil público), `/follow/:id`, `/unfollow/:id`, `/users/:id/followers`, `/users/:id/following`.
- **Validación**: sin Zod en rutas; servicios validan reglas básicas.
- **Servicios**: `user.services.ts`
  - Listar usuarios: select seguro (sin password).
  - Perfil por id: devuelve counts de reviews/diary/watchlist/follows.
  - Seguir/dejar de seguir: evita self-follow, maneja conflicto y not found, usa Prisma `follows`.
  - Actualizar perfil: valida username/bio/avatar_url; maneja conflictos P2002.
- **Notificaciones**: seguir emite notificación `follow` si el seguidor ≠ seguido.

## Settings (cuenta)
- **Rutas**: `/api/settings` (patch perfil + delete cuenta), `/api/settings/auth` (cambiar password), `/api/settings/avatar` (avatar base64). Todas requieren auth.
- **Validación**: `schemas/settings.ts` (perfil username/email/bio, auth con confirmación, avatar base64).
- **Servicios**: `settings.services.ts`
  - Perfil: delega en SettingsRepository.
  - Auth: compara bcrypt, hashea nuevo password.
  - Avatar: valida MIME (jpeg/png/webp) y tamaño <=5 MB, sube a Cloudinary `cinevault/avatars/user_{id}`.
  - Eliminar cuenta: valida existencia y elimina (cascada Prisma).

## Diary
- **Rutas**: `/api/diary` GET (mi diario), POST (crear), DELETE `/:id` (eliminar), GET `/:id_user` (diario de otro). Auth requerida excepto `/:id_user`. Hay DELETE duplicado en rutas (misma lógica).
- **Validación**: `schemas/diary.ts` (movie_id entero, watched_date opcional ISO, notas opcionales).
- **Servicios**: `diary.services.ts`
  - buildRichResponse con DiaryRepository; cachea `diary:feed:{user}` y `movie:agg:{movie}`.
  - Crear: una entrada por película/día, normaliza fecha, Conflict si duplica.
  - Eliminar: sólo dueño; invalida caché diario + agregados de película.
- **Rate limit adicional**: `checkIPSpike` (10 req/5 s/IP) antes de crear/eliminar.

## Watchlist
- **Rutas**: `/api/watchlist` GET (mía), GET `/:id_user` (otro), POST `/` (add), DELETE `/:movie_id` (remove). Auth requerida salvo GET de otro.
- **Validación**: `schemas/watchlist.ts` (movie_id número positivo).
- **Servicios**: `watchlist.services.ts` usa WatchlistRepository; evita duplicados con Conflict; delete por movie_id.

## Favorites
- **Rutas**: `/api/favorites` GET (míos), `/user/:userId` (otro), POST `/:movieId` (add), DELETE `/:movieId` (remove). Auth en rutas propias.
- **Validación**: `schemas/favorites.ts` (movieId, rank_position opcional).
- **Servicios**: `favorities.services.ts` usa FavoritiesRepository; NotFound cuando lista vacía o no existe; create/delete simples.

## Reviews, Likes, Comments, Reports
- **Rutas**: `/api/reviews` GET (mías), GET `/user/:userId`, GET `/movie/:movieId`; POST `/` (crear); PATCH `/ :reviewId` (update); DELETE `/ :reviewId`; POST `/ :reviewId/like`, DELETE `/ :reviewId/like`; POST `/ :reviewId/report`.
- **Comentarios**: GET `/ :reviewId/comments`, POST `/ :reviewId/comments`, PATCH `/comments/:commentId`, DELETE `/comments/:commentId`.
- **Validación**: `schemas/reviews.ts` (rating 1–5 paso 0.5, content 2000 chars, comentario 1000 chars, report reason 5–500 chars).
- **Servicios**: `reviews.services.ts`
  - Reseñas: una por usuario/película (Conflict si ya existe); update/delete sólo dueño; cache de reviews por película (`reviews:movie:{id}`) y agregados (`movie:agg:{id}`) con diary count.
  - Likes: transacción add/remove; Conflict/NotFound según estado; invalidan caché.
  - Comentarios: CRUD sólo dueño para update/delete; devuelve review asociada para notificaciones.
  - Reportes: crea reporte con motivo; `rbac.routes.ts` muestra manejo admin/editor.
- **Notificaciones**: like/comment emiten a dueño de la review (si no es el mismo usuario).
- **Rate limit adicional**: `checkIPSpike` en crear/editar/eliminar/like/comment/report.

## Search & Movies (TMDB)
- **Rutas**:
  - `/api/search` (query `q`, page) enriquece con director + títulos alternativos; cache `tmdb:search:{q}:p{page}` 2 h.
  - `/api/search/multi|movie|person|tv` directos a TMDB (2 h) con rate limit por IP spike.
  - `/api/movies/upcoming|top-rated|popular` cache 1 h; `/api/movies/:idOrSlug` resuelve slug→id y cachea detalle 6 h (`tmdb:movie:{id}` + `tmdb:slug:{slug}`).
- **Dependencias**: `helpers/fetchTMDB` (Bearer API_KEY_TMDB), `config/redis.getOSet`.

## Notifications
- **Rutas**: `/api/notifications` GET, `/unread` GET count, `/pending` GET pendientes (cola offline), `/read-all` PATCH, `/:id/read` PATCH. Auth requerida.
- **Servicios**: `notifications.services.ts`
  - `emitirNotificacionService`: crea en DB y emite por Socket.IO si online; si offline encola en Redis (`notif:queue:{user}`) truncada a 50.
  - Consultas: list, count (filtra read), mark read/all, entregar pendientes (consume cola Redis).
- **Eventos Socket**: `registrar_usuario` y `disconnect` mantienen mapa en memoria.

## Payments & Memberships
- **Rutas**: `/api/payments/create-checkout-session` (POST plan vip|pro), `/portal-session`, `/webhook` (Stripe). Auth en las dos primeras.
- **Servicios**: `payments.services.ts`
  - Checkout: crea sesión Stripe (subscription) con metadata userId/plan, `success_url`/`cancel_url` desde FRONTEND_URL.
  - Portal: recupera sub del user para generar sesión de portal Billing.
  - Webhook: valida firma (`STRIPE_WEBHOOK_SECRET`), idempotencia Redis 24 h (`stripe:event:{id}`); maneja checkout.completed (crear suscripción + pago + end_date + provider ids), invoice.payment_succeeded/failed, subscription.updated/deleted → actualiza repositorio y baja a free.
- **Permisos**: `rbac.routes.ts` muestra ejemplos para admins (ver pagos) y membresías (EXHIBIR_PELICULAS) aún no implementado.

## RBAC
- **Permisos**: definidos en `config/permisos.ts` por rol y membresía (free/vip/pro) + límites de exhibición.
- **Middlewares**: `verificarPermiso`, `verificarRol`, `verificarPropietarioOPermiso` cargan rol/membresía de Redis (TTL 2 min) o DB; invalidación helpers para cambios.
- **Rutas demo**: `rbac.routes.ts` muestra integración con Prisma en reviews/news/reports/users/payments.

## Information (TMDB personas)
- **Rutas**: `/api/information/person/:id`, `/person/:id/combined` → proxies a TMDB (sin caché actual).

## Capa transversal y utilidades
- **Cache HTTP**: `middlewares/cache.middlewares.ts` permite cachear GETs con clave derivada (usa Redis) y sólo cachea respuestas 2xx.
- **Errores**: usar clases de `errors/AppErrors` en servicios; el manejador las convierte en JSON.
- **Seguridad spike**: `services/security.services.ts` detecta ráfagas por IP y comentarios duplicados.

## Estado de documentación
- Swagger/OpenAPI sólo cubre Auth; el resto de rutas tienen anotaciones parciales en archivos de rutas pero no en `openapi.yaml`.
- Sitemap indica Settings sin montar, pero están activos en `server.ts`.
- Considerar completar spec y alinear ADR README (0002/0003 marcados “Propuesto” en índice, pero aceptados en sus archivos).
