# Guías prácticas (How-to)

Recetas breves para tareas frecuentes en el backend.

## 1) Preparar entorno local
1. Instala Node 20+, pnpm/npm, MariaDB y Redis.
2. Copia `.env` con estas claves mínimas:
   - `PORT`, `FRONTEND_URLS` (coma-separado), `BACKEND_URL`.
   - `DATABASE_HOST/PORT/USER/PASSWORD/DATABASE_NAME` o `DATABASE_URL` según prisma adapter.
   - `REDIS_URL` (o `REDIS_HOST/PORT` si usas `lib/redis`).
   - `JWT_SECRET`, `REFRESH_SECRET`, `VERIFY_EMAIL_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY` (32 chars).
   - `API_KEY_TMDB` (Bearer v4), `STRIPE_SECRET_KEY`, `STRIPE_PRICE_VIP`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET`.
   - `RESEND_API_KEY`, `RESEND_FROM`, `FRONTEND_URL` (para enlaces de correo), `CLOUDINARY_URL` si aplica.
3. Instala dependencias: `npm install`.
4. Genera Prisma client y DB: `npx prisma generate` y `npx prisma db push` (revisa `prisma/schema.prisma`).
5. Ejecuta en dev: `npm run dev` (tsx + nodemon). Swagger en `/api-docs`.

## 2) Scripts útiles
- `npm run dev` → servidor con recarga.
- `npm run build` → compila a `dist`.
- `npm start` → corre compilado.
- `npm run test` / `test:run` / `test:coverage` → Vitest.
- `npm run lint` / `lint:fix`, `npm run format`.
- `npm run stop` → `taskkill` de node en Windows.

## 3) Patrón para agregar un endpoint nuevo
1. **Schema Zod** (`src/schemas`): define `crearXSchema` + tipos `z.infer`. Aplica reglas de negocio (rangos, enums, tamaños).
2. **Servicio** (`src/services`): implementa la lógica, lanza `AppErrors`, usa repositorios y helpers (cache, redis, tokens). Mantén controladores delgados.
3. **Controlador** (`src/controllers`): recibe `req`/`res`, usa `req.user` si auth, llama servicio y devuelve JSON. Sin `try/catch` manual; deja que `manejadorAsincrono` capture.
4. **Ruta** (`src/routes`): registra path, añade middlewares: `middlewareAutenticacion`, `verificarPermiso|Rol` si aplica, `validarBody|Query|Params` con el schema, `limitadorAuth|Email` o `checkIPSpike` si sensible. Envuélvelo con `manejadorAsincrono`.
5. **Caché/Invalidación**: decide si leer/escribir Redis (usa `cachear` o `getOSet`/`setCache`/`invalidateKeys`). Documenta la clave y TTL en `config/redis.ts` o `lib/cache.ts` si es HTTP cacheable.
6. **Docs**: añade anotación Swagger en la ruta y extiende `docs/openapi.yaml` para mantener `/api-docs` en sync. Actualiza `docs/backend-domains.md` si cambias responsabilidades.

## 4) Checklist de seguridad rápida
- ¿Ruta protegida con `middlewareAutenticacion`? ¿Necesita RBAC (`verificarPermiso`) o dueño (`verificarPropietarioOPermiso`)?
- ¿Validación Zod aplicada? ¿Campos numéricos con `coerce` y límites? ¿rating step 0.5 si corresponde?
- ¿Rate limiting? Usa `limitadorAuth/Email` para auth y `checkIPSpike` en acciones de escritura.
- ¿Errores? Lanza `AppErrors` específicos; evita `throw new Error` genérico.
- ¿CORS/CSRF? Cookies httpOnly/secure para refresh; usa headers `Authorization` para access.

## 5) Notificaciones y tiempo real
- Para enviar una notificación desde cualquier servicio, llama `emitirNotificacionService({ user_id, sender_id, type })`. Si el usuario está offline, se encola en Redis y se entrega cuando consulte `/api/notifications/pending`.

## 6) Pagos y membresías
- Nuevos planes: añade IDs de precio en env y en `IDS_PRECIOS` (payments.services). Recuerda invalidar caché de rol/membresía (`invalidarCacheMembresia`) cuando cambies plan.
- Webhook: asegúrate de exponer `/api/payments/webhook` con `express.raw` antes de `express.json` (ya está en `server.ts`). Configura `STRIPE_WEBHOOK_SECRET`.

## 7) TMDB y caché
- Usa `consultarTMDB` para peticiones; cachea con `getOSet` y TTLs acordes. Incluye `language` según necesidad.

## 8) Jobs y tareas periódicas
- El cron cada hora borra usuarios no verificados >24 h. Si añades jobs, declara su frecuencia y manejo de errores (no lanzar para no tumbar el proceso).

## 9) Debug rápido
- Errores controlados llegan como `{ error: { code, message } }`. Si ves 500 genérico revisa consola server (manejador loguea "[ERROR NO CONTROLADO]").
- Para probar spike detection, dispara >10 acciones en 5 s; recibirás `TOO_MANY_REQUESTS`.
