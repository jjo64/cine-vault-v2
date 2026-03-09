# 📽️ CineVault — Documentación Técnica del Backend

---

## 1. Descripción del Proyecto

**CineVault** es una plataforma web de seguimiento y descubrimiento de películas, similar a Letterboxd. Permite a los usuarios registrarse, llevar un diario de películas vistas, crear listas de seguimiento (watchlist), escribir reseñas con puntuación, marcar favoritos, seguir a otros usuarios y descubrir nuevas películas a través de la API de TMDB.

### Stack Tecnológico

| Tecnología | Uso |
|---|---|
| **Node.js** + **TypeScript** | Runtime y lenguaje tipado |
| **Express.js v5** | Framework HTTP |
| **Prisma ORM v7** | ORM con adapter MariaDB |
| **JWT** | Autenticación (access 15min + refresh 7d) |
| **Zod** | Validación de esquemas de datos |
| **bcrypt** | Hashing seguro de contraseñas |
| **Helmet** | Headers HTTP de seguridad |
| **CORS** | Control de origen cruzado |
| **TMDB API** | Datos de películas en tiempo real |
| **Stripe** | Pagos y suscripciones |
| **Redis (ioredis)** | Rate limiting y anti-spam |

### Arquitectura de Capas

```
Cliente HTTP (Navegador / App móvil)
        ↓
Express Router (routes/)
        ↓
Middlewares (auth, error, async)
        ↓
Controllers (lógica de respuesta HTTP)
        ↓
Services (lógica de negocio reutilizable)
        ↓
Prisma ORM
        ↓
MariaDB
```

**¿Por qué esta arquitectura?** Separa responsabilidades: cada capa se encarga de una cosa. Los controladores no conocen la base de datos directamente, los servicios son reutilizables, y los middlewares interceptan transversalmente todas las peticiones.

---

## 1.1 Configuración y despliegue (Railway / local)

### Variables de entorno mínimas

- `PORT`: puerto del backend (default 3000)
- `JWT_SECRET`: secreto para firmar access tokens
- `API_KEY_TMDB`: Bearer de TMDB
- `FRONTEND_URL` o `FRONTEND_URLS`: origen/es permitidos en CORS (coma separada)
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`: credenciales MariaDB
- `REDIS_HOST`, `REDIS_PORT`: Redis para rate limit/cache/colas; en tests se usa un Redis en memoria automático
- `RESEND_API_KEY`, `RESEND_FROM` (opcional): si falta la API key, el envío se simula (no rompe en tests/dev)
- `BACKEND_URL`: base absoluta para links de email (verify/reset)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_VIP`, `STRIPE_PRICE_PRO`: llaves de Stripe

### Stripe Webhook

- La ruta `/api/payments/webhook` usa `express.raw({ type: "application/json" })` antes del JSON parser para validar la firma. En frameworks de despliegue, evita body-parsing previo.
- Idempotencia: cada `event.id` se guarda en Redis 24h (`stripe:event:<id>`) para no procesar duplicados.

### Redis en tests

- En `NODE_ENV=test` se usa un Redis en memoria con soporte básico de `EX`/`NX` y listas. No requiere servicio externo.

### Caché e invalidación

- Helpers en `src/lib/cache.ts`: `getCache`, `setCache`, `invalidateKeys` (TTL default 300s).
- Claves usadas:
  - `reviews:movie:<movieId>` — listado de reseñas por película
  - `movie:agg:<movieId>` — agregados (avg_rating, likes_total, diary_entries)
  - `diary:feed:<userId>` — feed de diario del usuario
  - `notif:queue:<userId>` — cola de notificaciones offline

### Rate limit y anti-spam

- `checkIPSpike(ip)`: ventana 5s, máx 10 requests → lanza 429 en mutaciones de diary/reviews/comments/search.
- `isDuplicateComment(userId, comment)`: detecta 3 comentarios idénticos consecutivos por usuario.

### Email (Resend)

- Wrapper seguro en `src/lib/email.ts`: si falta `RESEND_API_KEY` (no prod) retorna stub `{ mocked: true }` y emite warning.
- Plantillas: verificación, reset, códigos de respaldo 2FA, recomendación nocturna, recibo Stripe. Texto plano incluido.

### Notificaciones

- Si el usuario está offline, la notificación se encola en Redis (`notif:queue:<userId>`). Endpoint `GET /notifications/pending` drena y limpia la cola.

### Pagos (Stripe)

- Checkout: `/payments/create-checkout-session` crea sesión para `vip|pro`, pasa `userId`/`plan` en metadata e `payment_intent_data`.
- Portal: `/payments/portal-session` abre portal de facturación si el usuario tiene suscripción registrada.
- Webhooks manejados: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Pagos registrados idempotentemente por `provider_payment_id`; estados de suscripción se sincronizan con Stripe (`active/cancelled/expired`).

---

## 2. Estructura de Carpetas

```
backend/
├── .dockerignore              # Archivos excluidos del contexto Docker
├── .env                       # Variables de entorno (NO se sube a git)
├── .env.example               # Plantilla de variables de entorno
├── .prettierrc                # Configuración de formato de código
├── Dockerfile                 # Imagen Docker multi-stage build
├── DOCUMENTACION.md           # Este archivo
├── eslint.config.js           # Reglas de linting (ESLint flat config)
├── package.json               # Dependencias y scripts npm
├── prisma.config.ts           # Configuración de Prisma CLI
├── tsconfig.json              # Configuración de TypeScript
│
├── prisma/
│   └── schema.prisma          # Modelo de datos (tablas, relaciones, enums)
│
└── src/
    ├── server.ts              # Punto de entrada: configura Express y arranca
    │
    ├── @types/                # (Reservado) Tipos globales personalizados
    ├── config/                # (Reservado) Configuraciones futuras
    │
    ├── controllers/           # Lógica de cada endpoint HTTP
    │   ├── AuthController.ts      # Login, registro, tokens, logout
    │   ├── UserController.ts      # CRUD usuarios, follows, perfil
    │   ├── DiaryController.ts     # Entradas del diario de películas
    │   ├── WatchlistController.ts # Lista de seguimiento
    │   ├── ReviewsController.ts   # Reseñas y likes
    │   ├── FavoritiesController.ts# Películas favoritas
    │   └── PaymentsController.ts  # Integración con Stripe
    │
    ├── helpers/               # Funciones auxiliares
    │   ├── fetchTMDB.ts           # consultarTMDB — peticiones a la API de TMDB
    │   └── authOptions.ts         # Opciones de cookie para refresh token
    │
    ├── lib/
    │   └── prisma.ts              # Instancia singleton de Prisma Client
    │
    ├── middlewares/
    │   ├── auth.middlewares.ts     # middlewareAutenticacion + interfaces
    │   └── error.middlewares.ts   # manejadorAsincrono + manejadorErrores
    │
    ├── routes/                # Definición de rutas Express
    │   ├── auth.routes.ts
    │   ├── users.routes.ts
    │   ├── movies.routes.ts
    │   ├── diary.routes.ts
    │   ├── watchlist.routes.ts
    │   ├── reviews.routes.ts
    │   ├── search.routes.ts
    │   ├── payments.routes.ts
    │   └── favorities.routes.ts
    │
    ├── schemas/
    │   └── user.ts                # Esquema Zod para validación de registro
    │
    ├── services/              # Lógica de negocio reutilizable
    │   ├── auth.services.ts       # Tokens JWT, hashing, sesiones
    │   ├── security.services.ts   # Rate limiting, anti-spam (Redis)
    │   ├── content.services.ts    # Moderación de texto (placeholder)
    │   └── images.services.ts     # Moderación de imágenes (placeholder)
    │
    └── validators/            # (Reservado) Validadores adicionales
```

---

## 3. Explicación del Código por Módulo

### 3.1 `server.ts` — Punto de entrada

Configura Express con todos los middlewares globales (Helmet, CORS, JSON parser, cookie parser), registra todas las rutas bajo `/api/*` y arranca el servidor. La ruta raíz `GET /` se declara **antes** del manejador de errores para que sea alcanzable.

**Decisiones de diseño:**
- Validar `JWT_SECRET` y `API_KEY_TMDB` al arrancar (fail-fast)
- CORS restringido a un solo origen (`FRONTEND_URL`)
- Límite de 10MB en body JSON para prevenir ataques de payload
- `x-powered-by` deshabilitado para no revelar la tecnología

### 3.2 `lib/prisma.ts` — Singleton de Prisma

Crea una única instancia de `PrismaClient` con el adapter de MariaDB. Usa variables de entorno individuales (`DATABASE_HOST`, `DATABASE_PORT`, etc.) en vez del `DATABASE_URL` monolítico para mayor flexibilidad.

**Decisión:** `connectionLimit: 5` limita las conexiones simultáneas para no saturar la BD en desarrollo.

### 3.3 `middlewares/auth.middlewares.ts` — Autenticación

Define las interfaces `PayloadAcceso` y `PayloadRefresco` para tipar los tokens JWT. El middleware `middlewareAutenticacion` extrae el token del header `Authorization: Bearer <token>`, lo verifica con `jwt.verify()`, y adjunta el payload a `req.user`.

**Decisión:** La interfaz `SolicitudAutenticada` extiende `Request` de Express para que los controladores accedan a `req.user` con tipado completo.

### 3.4 `middlewares/error.middlewares.ts` — Manejo de errores

- `manejadorAsincrono`: envuelve rutas async para capturar errores sin try/catch repetitivo
- `manejadorErrores`: middleware de 4 parámetros de Express que captura cualquier error y responde con JSON limpio

### 3.5 `services/auth.services.ts` — Servicios de autenticación

Contiene toda la lógica de tokens y contraseñas:
- `crearTokenAcceso`: genera JWT de 15 minutos
- `crearTokenRefresco`: genera JWT de 7 días Y crea sesión en DB
- `verificarTokenRefresco`: verifica JWT y comprueba que la sesión no esté revocada
- `hashearContrasena` / `compararContrasena`: wrappers de bcrypt

**Decisión:** El refresh token se persiste en tabla `sessions` para poder revocar sesiones individualmente.

### 3.6 `controllers/AuthController.ts` — Controlador de autenticación

Implementa los 5 endpoints de auth:
- `iniciarSesion`: valida credenciales, genera tokens, establece cookie httpOnly
- `registrar`: valida con Zod, hashea password, crea usuario
- `renovarToken`: verifica refresh token de cookie, genera nuevo access token
- `cerrarSesion`: borra sesión de DB y limpia cookie
- `verificarToken`: devuelve datos del usuario autenticado

### 3.7 `controllers/UserController.ts` — Controlador de usuarios

Implementa CRUD de usuarios y sistema de follows:
- `obtenerUsuarios`: devuelve todos los usuarios con `select` de campos seguros (sin password)
- `obtenerUsuarioPorId`: devuelve perfil con `_count` de relaciones (no los datos completos)
- `obtenerSeguidores` / `obtenerSiguiendo`: resueltos con `include` anidado (una sola query, sin N+1)
- `seguirUsuario` / `dejarDeSeguirUsuario`: usa `req.user!.user_id` del middleware
- `actualizarPerfil`: tipo `ActualizarPerfil` tipado (no `any`)

### 3.8 `schemas/user.ts` — Validación con Zod

Define el esquema de registro con validaciones:
- Username: mínimo 3 caracteres, trimmed
- Email: formato válido
- Password: mínimo 8 caracteres + `.refine()` que rechaza contraseñas de solo espacios

### 3.9 `helpers/fetchTMDB.ts` — Consultas a TMDB

Función `consultarTMDB` que centraliza todas las peticiones a la API de The Movie Database. Configura `language=es-ES` por defecto y usa Bearer token para autenticación.

---

## 4. Documentación de Endpoints (API Reference)

### 4.1 Autenticación (`/api/auth`)

---

#### `POST /api/auth/register`

Registra un nuevo usuario en la plataforma.

| Campo | Valor |
|---|---|
| **Autenticación** | No |
| **Content-Type** | `application/json` |

**Body:**
```json
{
  "username": "string (min 3 chars)",
  "email": "string (email válido)",
  "password": "string (min 8 chars, no solo espacios)"
}
```

**Respuesta exitosa (201):**
```json
{
  "message": "Usuario registrado exitosamente",
  "userId": 1
}
```

**Errores posibles:**
| Código | Mensaje |
|---|---|
| 400 | `Error de validación` + array de errores |
| 400 | `El usuario ya está registrado` |
| 500 | `Error interno del servidor` |

**Ejemplo curl:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"cinefan","email":"cinefan@mail.com","password":"MiPassword123"}'
```

---

#### `POST /api/auth/login`

Inicia sesión y devuelve tokens de acceso.

| Campo | Valor |
|---|---|
| **Autenticación** | No |
| **Content-Type** | `application/json` |

**Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Respuesta exitosa (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```
> También establece cookie `refresh_token` (httpOnly, secure, sameSite=strict, 7 días)

**Errores posibles:**
| Código | Mensaje |
|---|---|
| 400 | `Credenciales incorrectas` (campos vacíos) |
| 401 | `Credenciales incorrectas` (usuario/contraseña inválidos) |
| 500 | `Error interno del servidor` |

**Ejemplo curl:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"cinefan","password":"MiPassword123"}' \
  -c cookies.txt
```

---

#### `POST /api/auth/refresh`

Renueva el token de acceso usando el refresh token de la cookie.

| Campo | Valor |
|---|---|
| **Autenticación** | Sí (Bearer token + cookie refresh_token) |

**Body:** Ninguno (el refresh token se lee de la cookie)

**Respuesta exitosa (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errores posibles:**
| Código | Mensaje |
|---|---|
| 401 | `No se proporcionó refresh token` |
| 401 | `Token inválido o expirado` |
| 404 | `Usuario no encontrado` |

**Ejemplo curl:**
```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Authorization: Bearer <access_token>" \
  -b cookies.txt
```

---

#### `POST /api/auth/logout`

Cierra la sesión del usuario, elimina la sesión de BD y limpia la cookie.

| Campo | Valor |
|---|---|
| **Autenticación** | Sí (Bearer token) |

**Body:** Ninguno

**Respuesta exitosa (200):**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

**Errores posibles:**
| Código | Mensaje |
|---|---|
| 401 | `No se proporcionó token de acceso` |
| 500 | `Error interno del servidor` |

**Ejemplo curl:**
```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -b cookies.txt
```

---

#### `GET /api/auth/verify`

Verifica el token de acceso actual y devuelve datos del usuario autenticado.

| Campo | Valor |
|---|---|
| **Autenticación** | Sí (Bearer token) |

**Body:** Ninguno

**Respuesta exitosa (200):**
```json
{
  "id": 1,
  "username": "cinefan",
  "email": "cinefan@mail.com",
  "role": "user"
}
```

**Errores posibles:**
| Código | Mensaje |
|---|---|
| 401 | `Token de acceso requerido` / `No se proporcionó token de acceso` |
| 403 | `Token inválido o expirado` |
| 404 | `Usuario no encontrado` |

**Ejemplo curl:**
```bash
curl http://localhost:4000/api/auth/verify \
  -H "Authorization: Bearer <access_token>"
```

---

### 4.2 Usuarios (`/api/users`)

---

#### `GET /api/users/`

Obtiene la lista de todos los usuarios (campos seguros).

| Campo | Valor |
|---|---|
| **Autenticación** | Sí (Bearer token) |

**Respuesta exitosa (200):**
```json
[
  {
    "id": 1,
    "username": "cinefan",
    "email": "cinefan@mail.com",
    "role": "user",
    "avatar_url": "https://..."
  }
]
```

---

#### `GET /api/users/:id`

Obtiene un usuario por ID con conteos de relaciones.

| Campo | Valor |
|---|---|
| **Autenticación** | No |

**Respuesta exitosa (200):**
```json
{
  "id": 1,
  "username": "cinefan",
  "avatar_url": "https://...",
  "bio": "Amante del cine",
  "created_at": "2024-01-15T...",
  "_count": {
    "reviews": 12,
    "diary_entries": 45,
    "watchlist": 23,
    "follows_follows_follower_idTousers": 5,
    "follows_follows_following_idTousers": 8
  }
}
```

**Errores posibles:**
| Código | Mensaje |
|---|---|
| 404 | `Usuario no encontrado` |

---

#### `PATCH /api/users/profile`

Actualiza el perfil del usuario autenticado.

| Campo | Valor |
|---|---|
| **Autenticación** | Sí (Bearer token) |

**Body (todos opcionales):**
```json
{
  "username": "string (min 3 chars)",
  "avatar_url": "string (URL)",
  "bio": "string (max 160 chars)"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Perfil actualizado correctamente"
}
```

**Errores posibles:**
| Código | Mensaje |
|---|---|
| 400 | `Nombre de usuario inválido` / `Avatar inválido` / `La bio es inválida` |
| 400 | `No hay datos para actualizar` |
| 409 | `El nombre de usuario ya está en uso` |

---

#### `POST /api/users/follow/:id`

Sigue a un usuario.

| Campo | Valor |
|---|---|
| **Autenticación** | Sí (Bearer token) |

**Respuesta exitosa (200):**
```json
{
  "message": "Usuario seguido correctamente"
}
```

**Errores posibles:**
| Código | Mensaje |
|---|---|
| 400 | `No puedes seguirte a ti mismo` |
| 400 | `Ya estás siguiendo a este usuario` |

---

#### `DELETE /api/users/unfollow/:id`

Deja de seguir a un usuario.

| Campo | Valor |
|---|---|
| **Autenticación** | Sí (Bearer token) |

**Respuesta exitosa (200):**
```json
{
  "message": "Has dejado de seguir al usuario correctamente"
}
```

**Errores posibles:**
| Código | Mensaje |
|---|---|
| 404 | `No estabas siguiendo a este usuario` |

---

#### `GET /api/users/:id/followers`

Obtiene la lista de seguidores de un usuario.

| Campo | Valor |
|---|---|
| **Autenticación** | No |

**Respuesta exitosa (200):**
```json
[
  { "id": 2, "username": "otroUsuario", "avatar_url": "https://..." }
]
```

---

#### `GET /api/users/:id/following`

Obtiene la lista de usuarios que sigue un usuario.

| Campo | Valor |
|---|---|
| **Autenticación** | No |

**Respuesta exitosa (200):**
```json
[
  { "id": 3, "username": "amigoCinefilo", "avatar_url": "https://..." }
]
```

---

## 5. Modelo de Base de Datos

### Tablas Principales

| Tabla | Descripción |
|---|---|
| `users` | Usuarios registrados con perfil, roles, 2FA y bloqueo |
| `sessions` | Sesiones activas (refresh tokens revocables) |
| `auth_tokens` | Tokens de verificación de email y reset de contraseña |
| `follows` | Relación many-to-many de seguidores entre usuarios |
| `diary_entries` | Diario de películas vistas con fecha |
| `watchlist` | Lista de películas por ver |
| `vault` | Colección personal de películas |
| `reviews` | Reseñas con rating y likes |
| `favorites` | Películas favoritas con posición de ranking |
| `movies_ref` | Referencia local a películas de TMDB |
| `reports` | Reportes de contenido inapropiado |
| `payments` | Historial de pagos |
| `subscriptions` | Suscripciones (free/vip/pro) |
| `user_activity` | Registro de actividad del usuario |
| `news` | Noticias/blog interno |

### Diagrama de Relaciones

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │───1:N──│   sessions   │       │  auth_tokens │
│              │───1:N──│              │       │              │
│  id          │        │  id          │       │  id          │
│  username    │        │  refresh_tok │       │  token       │
│  email       │        │  user_id  ←──┘       │  user_id  ←──┘
│  password    │        │  expires_at  │       │  type        │
│  avatar_url  │        └──────────────┘       └──────────────┘
│  bio         │
│  role        │        ┌──────────────┐
│  membership  │───1:N──│   follows    │
│  ...         │        │              │
└──────┬───────┘        │  follower_id ├── → users.id
       │                │  following_id├── → users.id
       │                └──────────────┘
       │
       ├──1:N──┐ ┌──────────────┐
       │       └─│ diary_entries │──N:1──┐
       │         │  user_id     │       │
       │         │  movie_id    │───────┤
       │         └──────────────┘       │
       │                                │  ┌──────────────┐
       ├──1:N──┐ ┌──────────────┐       ├──│  movies_ref  │
       │       └─│  watchlist   │──N:1──┤  │  id          │
       │         └──────────────┘       │  │  tmdb_id     │
       │                                │  └──────────────┘
       ├──1:N──┐ ┌──────────────┐       │
       │       └─│    vault     │──N:1──┤
       │         └──────────────┘       │
       │                                │
       ├──1:N──┐ ┌──────────────┐       │
       │       └─│   reviews    │──N:1──┘
       │         │  rating      │
       │         │  likes       │──1:N── reports
       │         └──────────────┘
       │
       ├──1:N── favorites ──N:1── movies_ref
       ├──1:N── payments ──N:1── subscriptions
       ├──1:N── subscriptions
       ├──1:N── user_activity
       └──1:N── reports
```

### Enums

| Enum | Valores |
|---|---|
| `users_role` | admin, editor, user |
| `users_membership` | free, vip, pro |
| `subscriptions_plan` | free, vip, pro |
| `subscriptions_status` | active, expired, cancelled |
| `payments_provider` | stripe, paypal |
| `payments_payment_status` | pending, paid, failed, refunded |
| `reports_status` | pending, resolved, rejected |
| `news_category` | estrenos, premios, actores, directores, streaming |
| `auth_tokens_type` | VERIFY_EMAIL, RESET_PASSWORD |

---

## 6. Sistema de Autenticación

### Flujo Completo

```
1. REGISTRO
   Usuario envía POST /api/auth/register con {username, email, password}
   → Zod valida los datos
   → bcrypt hashea la contraseña (10 rounds)
   → Se guarda el usuario en BD
   → Respuesta: 201 + "Usuario registrado exitosamente"

2. LOGIN
   Usuario envía POST /api/auth/login con {username, password}
   → Se busca el usuario por username
   → bcrypt compara la contraseña
   → Se genera ACCESS TOKEN (JWT, 15 min, firmado con JWT_SECRET)
   → Se genera REFRESH TOKEN (JWT, 7 días, firmado con REFRESH_SECRET)
   → Se crea una SESIÓN en tabla `sessions` con el refresh token
   → Se establece cookie httpOnly con el refresh token
   → Respuesta: 200 + { accessToken }

3. USO DEL ACCESS TOKEN
   Cada petición protegida incluye: Authorization: Bearer <accessToken>
   → middlewareAutenticacion extrae y verifica el token
   → Si válido: req.user = { user_id, role }
   → Si inválido: 403 "Token inválido o expirado"

4. RENOVACIÓN CON REFRESH TOKEN
   Cuando el access token expira (15 min):
   → Frontend envía POST /api/auth/refresh (la cookie se envía automáticamente)
   → Se verifica el refresh token con REFRESH_SECRET
   → Se comprueba que la sesión existe en BD (no revocada)
   → Se genera un NUEVO access token
   → Respuesta: 200 + { accessToken }

5. LOGOUT
   POST /api/auth/logout
   → Se extrae el refresh token de la cookie
   → Se decodifica para obtener id_session
   → Se ELIMINA la sesión de la BD (revocación)
   → Se limpia la cookie del navegador
   → Respuesta: 200 + "Sesión cerrada exitosamente"
```

### ¿Por qué httpOnly cookie para el refresh token?

- **httpOnly**: JavaScript del navegador NO puede acceder a la cookie → protege contra XSS
- **secure**: Solo se envía por HTTPS → protege contra MITM
- **sameSite=strict**: No se envía en peticiones cross-site → protege contra CSRF
- El access token sí va en memoria/localStorage porque tiene vida corta (15 min)

### Revocación de sesiones

La tabla `sessions` almacena cada refresh token activo. Cuando un usuario hace logout:
1. Se elimina la fila de la sesión en BD
2. Si alguien intenta usar ese refresh token después, `verificarTokenRefresco` no encontrará la sesión → error

Esto permite revocar sesiones sin invalidar todos los tokens de todos los usuarios (a diferencia de rotar el JWT_SECRET).

---

## 7. Variables de Entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor Express | `4000` |
| `FRONTEND_URL` | URL del frontend permitido en CORS | `http://localhost:5000` |
| `JWT_SECRET` | Secreto para firmar access tokens | `una_palabra_secreta_muy_larga` |
| `REFRESH_SECRET` | Secreto para firmar refresh tokens | `otra_palabra_secreta_diferente` |
| `DATABASE_URL` | URL de conexión completa para Prisma CLI | `mysql://root:pass@localhost:3306/cinevault` |
| `DATABASE_HOST` | Host de la base de datos | `localhost` |
| `DATABASE_PORT` | Puerto de la base de datos | `3306` |
| `DATABASE_USER` | Usuario de la base de datos | `root` |
| `DATABASE_PASSWORD` | Contraseña de la base de datos | `""` (vacío en XAMPP) |
| `DATABASE_NAME` | Nombre de la base de datos | `cinevault` |
| `API_KEY_TMDB` | API key de TMDB (Bearer token) | `eyJhbGciOiJIUzI1...` |
| `REDIS_HOST` | Host del servidor Redis | `127.0.0.1` |
| `REDIS_PORT` | Puerto del servidor Redis | `6379` |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe para pagos | `sk_test_...` |

> ⚠️ **IMPORTANTE:** Nunca subas el archivo `.env` a git. Usa `.env.example` como plantilla y `.gitignore` para excluirlo.
