# Tutorial: flujo de autenticación completo

Paso a paso para recorrer el flujo de Auth (tokens, verificación, 2FA) en local. Usa JWT de acceso en header `Authorization: Bearer`, cookies httpOnly para refresh.

## 1) Registro y verificación de email
1. POST `/api/auth/register` con `{ username, email, password }` (8+ chars).
2. Se crea `auth_tokens` tipo `VERIFY_EMAIL` (1 h) y se envía correo (simulado si no hay RESEND_API_KEY). Captura el enlace `POST /api/auth/verify-email/:token`.
3. Verifica: `POST /api/auth/verify-email/{token}` → 200.

## 2) Login y tokens
1. POST `/api/auth/login` con credenciales.
2. Si la cuenta tiene 2FA habilitado → respuesta `{ two_factor_required, tokenTemporal }` (no hay tokens aún).
3. Si no tiene 2FA → respuesta `{ accessToken }` y cookie `refresh_token` se setea en el cliente.

## 3) Habilitar 2FA (opcional)
1. Autenticado, POST `/api/auth/2fa/activar` → devuelve `{ qr, secreto }` (secreto cifrado se guarda en DB).
2. Escanea el QR en Google Authenticator.
3. POST `/api/auth/2fa/confirmar` con `{ codigo }` → activa 2FA.

## 4) Login con 2FA
1. POST `/api/auth/login` → respuesta con `tokenTemporal`.
2. POST `/api/auth/2fa/verificar` con `{ codigo, tokenTemporal }` → entrega `{ accessToken }` + cookie `refresh_token`.

## 5) Refresh y persistencia
- POST `/api/auth/refresh` (usa cookie `refresh_token`) → devuelve nuevo `accessToken` y rota `refresh_token` (revoca el anterior).
- GET `/api/auth/verify` con access token válido → devuelve perfil seguro.

## 6) Gestión de sesiones
- GET `/api/auth/sessions` → lista sesiones activas (refresh almacenados con hash).
- DELETE `/api/auth/sessions/:id` → revoca sesión específica (requiere param id string).
- POST `/api/auth/revocar-sesiones` → cierra todas salvo quizá la actual.

## 7) Recuperación de contraseña
1. POST `/api/auth/forgot-password` con email (rate limit 3/h). Respuesta siempre genérica.
2. Recibe link `POST /api/auth/reset-password` con `{ token, password }` (15 min de validez). Revoca sesiones al completar.

## 8) Cambio de contraseña (autenticado)
- POST `/api/auth/cambiar-contrasena` con `{ contrasenaActual, contrasenaNueva }`; si hay refresh cookie, se mantienen sesiones salvo la actual.

## 9) Cierre de sesión
- POST `/api/auth/logout` → borra cookie en cliente; backend revoca refresh si es válido.

## Notas rápidas
- Rate limit estricto en login/register/2FA: 5 intentos / 15 min/IP (`BRUTE_FORCE_BLOCKED`).
- Cookies configuradas `httpOnly+secure+sameSite=strict`; en local, define `FRONTEND_URLS` para CORS.
- Errores de auth llegan como `UNAUTHORIZED` (401) o `FORBIDDEN` (403) según el caso.
