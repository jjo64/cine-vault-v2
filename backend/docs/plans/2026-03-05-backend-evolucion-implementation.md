# Backend Evolución — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ejecutar mejoras de auth/seguridad, diario & reviews (rating 1–5 paso 0.5), rendimiento/cache, notificaciones/email (Resend) y pagos Stripe con arquitectura 3 capas.

**Architecture:** Node.js + Express 5 + TS + Prisma + Redis + Stripe + Resend; controllers delgados → services → repositories; Zod middleware; caché Redis para agregados/feeds; rate limiting Redis; Stripe webhooks con verificación de firma; emails vía Resend (sin Nodemailer).

**Tech Stack:** TypeScript, Express 5, Prisma, Redis (ioredis), Stripe, Resend, Vitest, Zod.

---

### Task 1: Alinear dependencias
**Files:**
- Modify: `package.json`

**Step 1: Verificar que Nodemailer no está**
Run: `npm run build`
Expected: PASS.

**Step 2: Instalar dependencias necesarias (si faltan)**
Run: `npm install`
Expected: Ok.

**Step 3: Commit**
Run: `git add package.json package-lock.json && git commit -m "chore: cleanup mail deps"`

### Task 2: Auth/Seguridad (refresh rotation, sesiones, 2FA, reset)
**Files:**
- Modify: `src/middlewares/auth.middlewares.ts`
- Modify: `src/services/auth.services.ts`
- Modify: `src/repositories/SessionRepository.ts`
- Modify: `src/controllers/AuthController.ts`
- Modify: `src/routes/auth.routes.ts`
- Add/Modify: `src/schemas/auth.ts` (DTOs: login, refresh, 2FA confirm, reset)
- Tests: `src/tests/auth/*.test.ts`

**Step 1: Escribir tests para middleware auth (errores tipados)**
- Add `src/tests/auth/auth-middleware.test.ts` con casos: sin token → UnauthorizedError; token inválido → UnauthorizedError; payload válido → next.

**Step 2: Run tests (esperado FAIL)**
Run: `npm test -- auth-middleware`

**Step 3: Ajustar middleware a lanzar errores tipados**
- `middlewareAutenticacion` debe `throw new UnauthorizedError(...)` en lugar de responder `res.status(401)`. Mantener attach de `req.user`.

**Step 4: Tests de refresh rotation y sesiones**
- Add `src/tests/auth/refresh-rotation.test.ts` con mock de `sessionRepository`: al renovar genera nuevo refresh y revoca anterior; si refresh no existe → Unauthorized.

**Step 5: Implementar en `auth.services.ts`**
- Al renovar: crear nuevo refresh, borrar el anterior (SessionRepository revoke by id), devolver access+refresh nuevos.
- Añadir listado de sesiones y revocación individual (servicio + controlador + ruta protegida).

**Step 6: 2FA confirm**
- DTOs en `src/schemas/auth.ts`: `confirm2fa` con token temporal + code.
- Servicio: validar TOTP, emitir access/refresh, borrar token temporal; añadir backup codes (hash + marcar usados) si no existen.
- Tests: confirm ok, code inválido, expirado.

**Step 7: Reset password seguro**
- Token de un uso; al resetear, invalidar refresh existentes (SessionRepository delete by user).
- Tests: reset consume token una sola vez; luego Unauthorized.

**Step 8: Run tests**
Run: `npm test -- auth`
Expected: PASS.

**Step 9: Commit**
Run: `git add src/middlewares/auth.middlewares.ts src/services/auth.services.ts src/repositories/SessionRepository.ts src/controllers/AuthController.ts src/routes/auth.routes.ts src/schemas/auth.ts src/tests/auth && git commit -m "feat: harden auth with rotation, sessions, 2fa"`

### Task 3: Diario & Reviews (rating 1–5 step 0.5, anti-abuso, feeds)
**Files:**
- Modify: `src/schemas/diary.ts`, `src/schemas/reviews.ts`
- Modify: `src/services/diary.services.ts`, `src/services/reviews.services.ts`
- Modify: `src/repositories/DiaryRepository.ts`, `src/repositories/ReviewsRepository.ts`
- Modify: `src/controllers/DiaryController.ts`, `src/controllers/ReviewsController.ts`
- Modify: `src/routes/diary.routes.ts`, `src/routes/reviews.routes.ts`
- Tests: `src/tests/diary/*.test.ts`, `src/tests/reviews/*.test.ts`

**Step 1: Tests de validación (rating enum 1–5 step 0.5)**
- Añadir tests que aseguren rechazo de 0, 0.5, 5.5.

**Step 2: Anti-duplicado y límites**
- Tests de servicio: rechaza si same user+movie+day en diario; rechaza review duplicada user+movie; respeta throttle mockeando Redis helpers.

**Step 3: Implementar DTOs**
- En schemas, usar `z.enum(["1","1.5",...])` con `coerce` a number.
- Validar `tags` (máx 5, 2–20 chars) y `spoiler`.

**Step 4: Reglas de negocio**
- Diary: un entry por día, allow rewatch con fecha distinta; update conserva edited_at.
- Reviews: unique user+movie; toggle likes idempotente; set edited_at al editar.

**Step 5: Feeds y respuestas**
- Servicios devuelven shape: review/diary con user, likes_count, liked_by_me, agregados.

**Step 6: Run tests**
Run: `npm test -- diary reviews`
Expected: PASS.

**Step 7: Commit**
Run: `git add src/schemas/diary.ts src/schemas/reviews.ts src/services/diary.services.ts src/services/reviews.services.ts src/repositories/DiaryRepository.ts src/repositories/ReviewsRepository.ts src/controllers/DiaryController.ts src/controllers/ReviewsController.ts src/routes/diary.routes.ts src/routes/reviews.routes.ts src/tests/diary src/tests/reviews && git commit -m "feat: diary/reviews rules with rating 1-5"`

### Task 4: Rendimiento y caché
**Files:**
- Modify: `src/services/reviews.services.ts`, `src/services/diary.services.ts`
- Modify: `src/repositories/ReviewsRepository.ts`, `src/repositories/DiaryRepository.ts`
- Modify: `src/services/security.services.ts` (añadir helpers de cache invalidation si falta)
- Add: `src/lib/cache.ts` (helpers Redis: get/set JSON, invalidate list)
- Tests: `src/tests/cache/*.test.ts`

**Step 1: Tests de caché de agregados**
- Fijar que setea `movie:agg:<id>` y lo invalida en update/delete.

**Step 2: Implementar helpers**
- `getCache`, `setCache`, `invalidateKeys` usando Redis existente.

**Step 3: Integrar en servicios**
- Al crear/editar/borrar review/diary: invalidar agregados y feeds afectadas.
- Listados usan cache cuando disponible.

**Step 4: Rate limits**
- Aplicar `checkIPSpike`/contador a creation/edit/likes y búsqueda.

**Step 5: Índices Prisma**
- Ajustar `prisma/schema.prisma` si faltan índices únicos/compuestos; correr `prisma generate` (no migrar en plan, solo dejar preparado).

**Step 6: Run tests**
Run: `npm test -- cache`

**Step 7: Commit**
Run: `git add src/lib/cache.ts src/services/reviews.services.ts src/services/diary.services.ts src/repositories/ReviewsRepository.ts src/repositories/DiaryRepository.ts src/services/security.services.ts prisma/schema.prisma src/tests/cache && git commit -m "feat: cache and rate limits for diary/reviews"`

### Task 5: Notificaciones y Email (Resend)
**Files:**
- Modify: `src/services/notifications.services.ts`, `src/controllers/NotificationsController.ts`
- Modify: `src/routes/notifications.routes.ts`
- Modify: `src/lib/email.ts` (Resend-only plantillas)
- Add: `src/templates/email/*.mjml|.html` (si se usa) + txt
- Tests: `src/tests/notifications/*.test.ts`, `src/tests/email/*.test.ts`

**Step 1: Tests de payload notif**
- Snapshot de shape `{id,type,title,body,...}` y agrupación de likes.

**Step 2: Implementar colas simples en Redis**
- Guardar notif si usuario offline; endpoint de listar/marcar read.

**Step 3: Emails Resend**
- Plantillas verificación/reset/2FA backup/recomendación nocturna/recibo Stripe con texto plano.

**Step 4: Run tests**
Run: `npm test -- notifications email`

**Step 5: Commit**
Run: `git add src/services/notifications.services.ts src/controllers/NotificationsController.ts src/routes/notifications.routes.ts src/lib/email.ts src/templates/email src/tests/notifications src/tests/email && git commit -m "feat: notifications and resend templates"`

### Task 6: Stripe/Pagos
**Files:**
- Modify: `src/services/payments.services.ts`, `src/controllers/PaymentsController.ts`, `src/routes/payments.routes.ts`
- Modify: `src/repositories/PaymentsRepository.ts`
- Modify: `prisma/schema.prisma` (tabla `subscriptions` si falta)
- Add: `src/tests/payments/*.test.ts`

**Step 1: Tests de webhooks**
- Mock Stripe signature: válido → procesa; inválido → 400.
- Idempotencia: mismo event_id no duplica.

**Step 2: Implementar checkout/portal**
- Crear session con `Idempotency-Key`; guardar `stripe_customer_id` si nuevo.

**Step 3: Webhooks**
- Manejar `checkout.session.completed`, `customer.subscription.updated|deleted`, `invoice.paid|payment_failed`; actualizar tabla `subscriptions`.

**Step 4: Run tests**
Run: `npm test -- payments`

**Step 5: Commit**
Run: `git add src/services/payments.services.ts src/controllers/PaymentsController.ts src/routes/payments.routes.ts src/repositories/PaymentsRepository.ts prisma/schema.prisma src/tests/payments && git commit -m "feat: stripe subscriptions with webhooks"`

### Task 7: Smoke y cierre
**Files:**
- N/A (scripts/tests)

**Step 1: Lint & build**
Run: `npm run lint && npm run build`

**Step 2: Test suite completa**
Run: `npm test`

**Step 3: Commit final**
Run: `git add . && git commit -m "chore: finalize backend evolution"`

---

Plan complete and saved to `docs/plans/2026-03-05-backend-evolucion-implementation.md`. Two execution options:
1) Subagent-Driven (this session) — dispatch per task with reviews.
2) Parallel Session — new session with executing-plans.
Which approach?
