# Backend Evolución — Diseño

**Fecha:** 2026-03-05
**Ámbito:** Backend CineVault (sin frontend en esta fase)
**Pilares:** Auth/Seguridad; Diario & Reviews (rating 1–5 en pasos de 0.5); Rendimiento/Cache; Notificaciones/Email (solo Resend); Pagos Stripe

---

## 1. Alcance y prioridades
- Proteger usuarios y sesiones (auth, 2FA, refresh, rate limiting, auditoría).
- Robustecer pilares de producto: diario y reviews con validación consistente y anti-abuso.
- Acelerar lecturas con caché/Redis y límites sanos.
- Profesionalizar notificaciones y correo (Resend) y cerrar flujos de pagos Stripe.

## 2. Decisiones clave por sección
- **Auth/Seguridad:** rotación estricta de refresh con lista de sesiones; endpoint “mis sesiones” para revocar. 2FA completo con token temporal + confirmación; backup codes. Resets invalidan refresh previos. Middleware auth lanza errores tipados (no responde inline). Rate limiting en auth. Auditoría de eventos clave.
- **Diario/Reviews:** rating 1–5 (pasos 0.5); Zod DTOs obligatorios; un diario por user+movie+day, rewatch con fechas distintas; reviews únicas por user+movie, editables con `edited_at`. Spoiler flag. Likes idempotentes. Feeds de seguidos y listados por película. Anti-duplicado de contenido.
- **Rendimiento/Cache:** Redis para agregados por película (promedio 1–5, totales reviews/diarios), feeds paginados, listados top/latest; invalidación en escrituras; rate limits en creación/edición/likes/búsqueda. Índices Prisma para user/movie combos y likes únicos.
- **Notificaciones/Email (Resend):** disparo desde servicios; payload consistente; agrupación anti-ruido; plantillas HTML+txt en Resend con voz CineVault. Jobs diarios/semanales para recomendación y digest. No nodemailer.
- **Stripe/Pagos:** checkout session, webhooks verificados, billing portal; tabla de suscripciones con estado/period_end; idempotencia por `Idempotency-Key` y registro de `event_id`. Copy de error en voz de marca.

## 3. DTOs y validación (Zod)
- **Diario:** `movie_id:int+`, `diary_date:ISO`, `rewatch:boolean`, `rating: z.enum([1,1.5,2,2.5,3,3.5,4,4.5,5])`, `review?:string<=2000`, `mood?:enum` corta. Query: paginación (`page`,`pageSize<=50`), `sort` (`latest`,`rewatches`).
- **Reviews:** `movie_id:int+`, `content:1-2000`, `rating` mismo enum 1–5 step 0.5, `spoiler:boolean`, `tags?: string[]` máx 5 cada 2–20. Query: `sort` (`latest`,`most_liked`,`highest_rating`), filtros `tags`, `rating>=`, rango de fechas.
- **Auth:** login con username/password; flujo 2FA: token temporal → confirmar TOTP → emitir access/refresh. Reset password: token de un uso + invalida refresh. Sesiones: revocar por id.
- **Pagos:** crear checkout (plan), portal, webhooks; request bodies mínimos y firma Stripe.

## 4. Respuestas y contratos API
- **Review response:** `id, movie_id, rating(1–5,0.5), content, spoiler, tags, user{id,username}, likes_count, liked_by_me, created_at, edited_at`.
- **Diario response:** `id, movie_id, diary_date, rewatch, rating(1–5,0.5), review, mood, user{id,username}`.
- **Agregados cacheados:** `movie_rating_avg, movie_reviews_count, movie_diary_count`.
- **Notificación:** `{ id, type, title, body, movie_id?, review_id?, actor{ id, username }, created_at, read_at }`.
- **Sesiones:** `{ id, user_agent, ip_city?, last_used_at, created_at }` con acciones de revocar.

## 5. Caché y rendimiento
- Claves Redis: `movie:agg:<id>`, `feed:diary:<user>:p<page>`, `feed:reviews:<user>:p<page>`, `movie:reviews:latest:<id>:p<page>`, `movie:reviews:top:<id>:p<page>`. TTL 2–30 min según tipo.
- Invalidar en escrituras: review/diary create-update-delete, likes toggle (solo si cambia), reseteo masivo de usuario si borra cuenta.
- Rate limits: diarios/reviews 10 ops/5min por user+IP; likes 30/5min; búsquedas 30/5min.
- Índices Prisma: diary `(user_id, diary_date)`, `(movie_id)`; reviews `(user_id, movie_id)` único, `(movie_id)`, `(movie_id, rating)`; likes `(review_id, user_id)` único; sessions `(user_id, created_at)`.

## 6. Seguridad y pagos
- JWT: validar `aud/iss/exp/iat`; considerar `kid` para rotar secret; errores tipados. Refresh rotation + revocación; endpoint “mis sesiones”.
- 2FA: TOTP con QR/código secreto, confirmación, backup codes hashed, desactivación segura.
- Resets: token de un uso, expira; invalida refresh tokens; registra evento.
- Stripe: verify signature en webhooks; registrar `event_id` para idempotencia; guardar `stripe_customer_id`; tabla `subscriptions(plan,status,period_end,cancel_at_period_end,last_invoice_url)`.

## 7. Notificaciones y email (Resend)
- Eventos: nueva review en película seguida, like a tu review, nuevo follower, recomendación nocturna, recibo Stripe.
- Agrupación: likes en ventana corta para evitar spam.
- Plantillas: HTML oscuro cinéfilo + texto plano; tono CineVault (“Esta noche, sin excusas: …”; “Esa tarjeta cortó la escena…”).
- Jobs: cron diario (recomendación) y semanal (digest).

## 8. Dependencias frontend
- Endpoints y query params para feeds, filtros, spoilers, likes, sesiones, portal Stripe.
- Campos `liked_by_me`, `spoiler`, `read_at`, `rating` 1–5 step 0.5, agregados cacheados.
- Copy sugerido para mostrar mensajes de límite/throttle y errores de pago.

## 9. Riesgos y pruebas
- Riesgos: inconsistencia de caché si falta invalidar; firmas de webhook; fuga de info en 404 de recursos ajenos; abuso de creación masiva.
- Pruebas recomendadas: unit de servicios (auth, diary, reviews, notif, payments con Stripe mock); integración webhooks Stripe (firma válida/ inválida); rate limit paths; snapshot de emails Resend (HTML/txt); toggles de likes idempotentes.

---

**Siguientes pasos:** Generar plan de implementación detallado con la skill writing-plans en `docs/plans/2026-03-05-backend-evolucion-implementation.md`.
