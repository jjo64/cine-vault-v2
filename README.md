# CineVault

Plataforma social para descubrir, reseñar y gestionar películas. Backend en Node.js/Express/TypeScript con Prisma y Redis; frontend en React/Vite/TypeScript.

## Qué ofrece
- Autenticación JWT + refresh rotatorio, verificación de email y 2FA TOTP; OAuth Google opcional.
- Capas separadas: rutas → controladores delgados → servicios → repositorios Prisma; validación con Zod.
- Funcionalidad social: diario de visionado, watchlist, favoritos, reseñas/likes/comentarios, follows y notificaciones en tiempo real (Socket.IO).
- Búsquedas y catálogos TMDB con caché Redis; pagos y membresías vía Stripe; emails con Resend; avatares en Cloudinary.

## Requisitos
- Node 20+, npm/pnpm
- MariaDB/MySQL y Redis en ejecución
- API keys: TMDB v4 Bearer, Stripe (secret + precios + webhook), Resend, Cloudinary

## Puesta en marcha rápida
1. Instala dependencias: `npm install` en `backend` y `frontend`.
2. Crea `.env` en `backend` (ver variables mínimas abajo).
3. Genera Prisma y aplica el esquema:
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   ```
4. Arranca el backend: `npm run dev` (Swagger en `/api-docs`).
5. Arranca el frontend: `cd ../frontend && npm run dev`.

> [!NOTE]
> El webhook de Stripe necesita el body raw; ya está configurado en `/api/payments/webhook`.

### Variables de entorno clave (backend)
- `PORT`, `FRONTEND_URLS` (coma-separado), `BACKEND_URL`
- `DATABASE_HOST|PORT|USER|PASSWORD|DATABASE_NAME` (o `DATABASE_URL` para Prisma MariaDB)
- `REDIS_URL` (o `REDIS_HOST|REDIS_PORT` si usas el cliente de `lib/redis`)
- `JWT_SECRET`, `REFRESH_SECRET`, `VERIFY_EMAIL_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY` (32 chars)
- `API_KEY_TMDB`
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_VIP`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`, `RESEND_FROM`
- `CLOUDINARY_URL`

### Variables de entorno clave (frontend)
- `VITE_API_URL`
- `VITE_AUTH_STORAGE_MODE` (`hybrid` por defecto, `cookie-only` para desactivar persistencia en `localStorage` y operar cookie-first)

### Scripts útiles
- `npm run dev` / `npm run build` / `npm start`
- `npm run test` / `npm run test:coverage`
- `npm run lint` / `npm run lint:fix` / `npm run format`
- `npm run stop` (Windows, mata procesos node)

## Estructura
```
cine-vault/
├─ backend/           # API, servicios, Prisma, docs backend
└─ frontend/          # SPA React/Vite
```

## Documentación
- Visión de arquitectura: [backend/docs/backend-architecture.md](backend/docs/backend-architecture.md)
- Referencia por dominios (rutas, validaciones, caché): [backend/docs/backend-domains.md](backend/docs/backend-domains.md)
- Guías prácticas (how-to): [backend/docs/backend-howto.md](backend/docs/backend-howto.md)
- Tutorial de autenticación end-to-end: [backend/docs/backend-tutorial-auth.md](backend/docs/backend-tutorial-auth.md)
- Estándares API y ADRs en [backend/docs](backend/docs)

## Estado y próximos pasos
- OpenAPI/Swagger actualmente documenta Auth; resta cubrir el resto de dominios.
- RBAC implementado (roles + membresías); rutas de ejemplo en `rbac.routes.ts`.

¿Dudas o bugs? Abre un issue o ping en el chat del equipo.
