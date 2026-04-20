# CHANGELOG — CineVault Backend

Registro de cambios realizados por **Thcito** durante el desarrollo del TFG.
Rama de trabajo: `desarrollo`

---

## [16-04-2026] — Sistema de strikes y mejoras de moderación

### Descripción
Implementación del sistema de strikes para infracciones leves.
Al acumular 3 strikes del mismo tipo el usuario queda bloqueado
temporalmente. Al desbanear se limpian los strikes automáticamente.

### Archivos modificados
- `backend/prisma/schema.prisma` — nueva tabla user_strikes
- `backend/src/repositories/RbacRepository.ts` — añadirStrike, contarStrikesActivos, obtenerStrikesUsuario, limpiarStrikesUsuario, banearUsuario acepta fecha opcional
- `backend/src/services/rbac.services.ts` — añadirStrikeService, obtenerStrikesUsuarioService, desbanearUsuarioService limpia strikes
- `backend/src/controllers/RbacController.ts` — añadirStrike, obtenerStrikesUsuario
- `backend/src/routes/rbac.routes.ts` — POST /users/:id/strikes, GET /users/:id/strikes

### Sistema de strikes
| Tipo | Strikes | Bloqueo |
|---|---|---|
| spoiler | 3 | 7 días |
| spam | 3 | 14 días |
| acoso | 3 | 30 días |

### Reglas
- Los strikes caducan después de 90 días
- Al llegar a 3 strikes → bloqueo temporal automático
- Al desbanear manualmente → strikes eliminados automáticamente

### BD
- Nueva tabla `user_strikes` via `npx prisma db push`

### Probado
✅ Strike 1-2 → bloqueado: false
✅ Strike 3 → bloqueado: true, bloqueo temporal aplicado
✅ Desbanear → strikes eliminados, contador reiniciado

## [16-04-2026] — Baneo automático por IA 

### Descripción
Implementación de baneo automático cuando OpenAI detecta contenido
grave. El admin puede revisar y revocar desde el historial de moderación.

### Archivos modificados
- `backend/src/errors/AppErrors.ts` — ContentModerationError acepta categorías
- `backend/src/services/content.services.ts` — lanza ContentModerationError con categorías
- `backend/src/services/reviews.services.ts` — baneo automático si contenido es grave

### Flujo
1. OpenAI detecta contenido grave (harassment, sexual, violence, hate, self-harm)
2. ContentModerationError incluye las categorías detectadas
3. reviews.services.ts evalúa si el contenido es grave
4. Si es grave → baneo automático del usuario
5. Admin notificado en tiempo real via Socket.IO
6. Admin puede revocar el baneo desde el panel de moderación

### Categorías que activan el baneo automático
- harassment
- sexual
- violence
- hate
- self-harm

### Probado
✅ Contenido grave → usuario baneado automáticamente
✅ Usuario baneado → error 403 al intentar hacer login
✅ Admin puede revocar el baneo desde el panel

## [16-04-2026] — Historial de moderación enriquecido

### Descripción
El historial de moderación ahora muestra el usuario afectado, el motivo
y el texto bloqueado para cada acción. Se añadieron campos nuevos a
user_activity para almacenar esta información.

### Archivos modificados
- `backend/prisma/schema.prisma` — añadidos campos target_user_id y metadata a user_activity
- `backend/src/repositories/RbacRepository.ts` — registrarAccionModeracion acepta metadata, obtenerHistorialModeracion incluye usuarioAfectado
- `backend/src/services/rbac.services.ts` — todas las acciones de moderación pasan metadata descriptivo
- `backend/src/services/content.services.ts` — metadata incluye categorías y texto bloqueado
- `admin-panel/src/components/ModerationPanel.tsx` — historial muestra usuario afectado, motivo y texto

### BD
- Añadidos `target_user_id` y `metadata` a `user_activity` via `npx prisma db push`

### Probado
✅ Baneo → historial muestra usuario baneado y motivo
✅ Warning → historial muestra usuario y contenido ofensivo
✅ Contenido bloqueado → historial muestra categorías y texto bloqueado
✅ Desbaneo → historial muestra usuario desbaneado

## [15-04-2026] — Panel de Moderación completo

### Descripción
Rediseño completo del panel de moderación con tres secciones integradas:
buscador de usuarios, lista de baneados y historial de acciones.

### Archivos creados
- `admin-panel/src/components/ModerationPanel.tsx` — panel completo con tabs

### Archivos eliminados
- `admin-panel/src/components/ModerationTable.tsx` — reemplazado por ModerationPanel

### Archivos modificados
- `backend/src/repositories/RbacRepository.ts` — nuevos métodos: desbanearUsuario, obtenerUsuariosBaneados, buscarUsuario
- `backend/src/services/rbac.services.ts` — nuevos servicios: desbanearUsuarioService, obtenerUsuariosBaneadosService, buscarUsuarioService
- `backend/src/controllers/RbacController.ts` — nuevos endpoints: desbanearUsuario, obtenerUsuariosBaneados, buscarUsuario
- `backend/src/routes/rbac.routes.ts` — rutas reordenadas (estáticas antes que parámetros) y nuevas rutas añadidas
- `admin-panel/src/App.tsx` — integración de ModerationPanel

### Añadido
- `PATCH /api/rbac/users/:id/unban` — desbanear usuario
- `GET /api/rbac/users/banned` — lista de usuarios baneados
- `GET /api/rbac/users/search?query=` — buscador de usuarios por username o email
- Panel de moderación con 3 tabs: Buscar usuario, Usuarios baneados, Historial
- Botón de desbanear en buscador y lista de baneados

### Probado
✅ Buscador encuentra usuarios por username y email
✅ Lista de baneados muestra usuarios con locked_until >= 2099
✅ Desbanear funciona correctamente
✅ Historial muestra todas las acciones incluyendo desbaneos

## [15-04-2026] — Buscador de comentarios por usuario

### Descripción
El admin puede revisar el historial de comentarios de un usuario
directamente desde la alerta de moderación y borrarlos si es necesario.

### Archivos creados
- `admin-panel/src/components/UserCommentsTable.tsx` — tabla de comentarios con botón de borrar

### Archivos modificados
- `backend/src/repositories/RbacRepository.ts` — nuevo método obtenerComentariosPorUsuario
- `backend/src/services/rbac.services.ts` — nuevo servicio obtenerComentariosPorUsuarioService
- `backend/src/controllers/RbacController.ts` — nuevo endpoint obtenerComentariosPorUsuario
- `backend/src/routes/rbac.routes.ts` — nueva ruta GET /rbac/users/:id/comments
- `admin-panel/src/App.tsx` — botón "Ver comentarios" en alertas, limpieza de vista al ignorar/banear/warning

### Añadido
- `GET /api/rbac/users/:id/comments` — historial de comentarios de un usuario
- Botón 💬 Ver comentarios en las alertas de moderación
- Al borrar un comentario desaparece de la tabla sin recargar
- La tabla de comentarios se limpia al banear, enviar warning o ignorar la alerta

## [15-04-2026] — Historial de moderación y refactorización SOLID

### Descripción
Añadido historial de acciones de moderación en el panel de admin.
Refactorización de content.services.ts para seguir el patrón SOLID
— las queries a Prisma se mueven al repositorio.

### Archivos modificados
- `backend/src/repositories/RbacRepository.ts` — nuevos métodos: obtenerDatosUsuarioModeracion, registrarAccionModeracion, obtenerHistorialModeracion
- `backend/src/services/rbac.services.ts` — nuevo servicio obtenerHistorialModeracionService, adminId en banear y warning
- `backend/src/controllers/RbacController.ts` — nuevo endpoint obtenerHistorialModeracion, adminId en banear y warning
- `backend/src/routes/rbac.routes.ts` — nueva ruta GET /rbac/moderation/history
- `backend/src/services/content.services.ts` — refactorizado: usa rbacRepository en vez de prisma directo
- `admin-panel/src/components/ModerationTable.tsx` — nuevo componente
- `admin-panel/src/App.tsx` — nueva sección 🛡️ Moderación

### Añadido
- `GET /api/rbac/moderation/history` — historial de las últimas 100 acciones de moderación
- Las acciones de baneo y warning se registran automáticamente con el ID del admin
- Los bloqueos de la IA se registran como "🤖 Bot Moderación"

### Refactorización SOLID
- `content.services.ts` ya no importa Prisma directamente
- La query de datos del usuario se movió a `RbacRepository.obtenerDatosUsuarioModeracion`

## [15-04-2026] — Alertas enriquecidas con datos del usuario

### Descripción
Las alertas de moderación en tiempo real ahora incluyen información
completa del usuario que generó el contenido inapropiado.

### Archivos modificados
- `backend/src/services/content.services.ts` — búsqueda de datos del usuario al generar la alerta
- `admin-panel/src/App.tsx` — visualización de datos del usuario en la alerta

### Datos añadidos a la alerta
- Username y email del usuario
- Rol (admin/editor/user) con color
- Membresía (free/vip/pro) con color
- Número de reportes previos — si tiene historial aparece destacado en rojo

## [15-04-2026] — Notificaciones de pagos via Socket.IO

### Descripción
Integración de notificaciones en tiempo real cuando Stripe procesa
eventos de pago. Los usuarios reciben alertas al instante cuando
su suscripción cambia de estado.

### Archivos modificados
- `backend/src/services/payments.services.ts` — notificaciones en webhooks de Stripe y validación de metadata
- `backend/prisma/schema.prisma` — nuevos tipos de notificación

### Añadido
- `payment_success` — notifica cuando la suscripción es activada o renovada
- `payment_failed` — notifica cuando el pago falla
- `subscription_cancelled` — notifica cuando la suscripción es cancelada
- Validación de metadata en `checkout.session.completed` — evita errores cuando faltan `userId` o `plan`

### Cuándo se emite cada notificación
- `checkout.session.completed` → payment_success
- `invoice.payment_succeeded` → payment_success (renovación mensual)
- `invoice.payment_failed` → payment_failed
- `customer.subscription.deleted` → subscription_cancelled

### BD
- Añadidos `payment_success`, `payment_failed`, `subscription_cancelled` al enum `notifications_type` via `npx prisma db push`

### Probado con Stripe CLI
- `stripe trigger checkout.session.completed` → webhook recibido con [200]
- Validación de metadata funciona correctamente
- En producción real el userId y plan llegan en los metadatos de la sesión

## [15-04-2026] — Baneo, warning y corrección de bugs

### Descripción
Sistema completo de acciones de moderación desde el panel de admin
con alertas en tiempo real via Socket.IO.

### Archivos modificados
- `backend/src/repositories/RbacRepository.ts` — métodos banearUsuario y crearWarning
- `backend/src/services/rbac.services.ts` — servicios banearUsuarioService y enviarWarningService
- `backend/src/controllers/RbacController.ts` — endpoints banearUsuario y enviarWarning
- `backend/src/routes/rbac.routes.ts` — rutas PATCH /users/:id/ban y POST /users/:id/warning
- `backend/src/services/auth.services.ts` — comprobación de locked_until en login
- `backend/src/errors/AppErrors.ts` — ContentModerationError restaurado
- `backend/prisma/schema.prisma` — añadido "warning" al enum notifications_type
- `admin-panel/src/App.tsx` — botones de baneo y warning en alertas

### Añadido
- `PATCH /api/rbac/users/:id/ban` — banea permanentemente a un usuario (locked_until = 2099)
- `POST /api/rbac/users/:id/warning` — envía notificación de aviso al usuario
- Comprobación de `locked_until` en el login — usuarios baneados no pueden entrar
- Botones de acción en las alertas del panel — Banear, Warning e Ignorar
- Las alertas desaparecen automáticamente después de realizar una acción

### BD
- Añadido `warning` al enum `notifications_type` via `npx prisma db push`

### Probado
✅ Usuario baneado → error 403 al intentar hacer login
✅ Warning enviado → notificación creada en BD
✅ Alerta desaparece tras realizar acción
✅ Socket.IO emite alerta al admin cuando la IA bloquea contenido

## [15-04-2026] — Socket.IO: alertas en tiempo real al admin

### Descripción
Implementación de alertas en tiempo real al panel de administración
cuando la IA detecta y bloquea contenido inapropiado.

### Archivos creados
- `backend/src/services/socket.services.ts` — lógica de emisión de eventos Socket.IO
- `admin-panel/src/socket.ts` — cliente Socket.IO para el panel de admin

### Archivos modificados
- `backend/src/config/socketio.config.ts` — tracking de admins y editores conectados
- `backend/src/services/content.services.ts` — emite alerta antes de bloquear contenido
- `backend/src/services/reviews.services.ts` — restaurada moderación en reseñas y comentarios
- `backend/src/errors/AppErrors.ts` — restaurado ContentModerationError
- `admin-panel/src/App.tsx` — escucha eventos y muestra alertas en tiempo real

### Cómo funciona

Usuario escribe contenido inapropiado
↓
OpenAI detecta: harassment, violence...
↓
Socket.IO emite "contenido_bloqueado" a todos los admins conectados
↓
Panel de admin muestra alerta en tiempo real con categorías y texto
↓
ContentModerationError bloquea la petición (422)

### Dependencias añadidas
- `socket.io-client` — cliente Socket.IO para el panel de admin

### Probado
✅ Contenido inapropiado → bloqueado y alerta en tiempo real al admin
✅ Admin desconectado → no recibe la alerta (correcto)
✅ Socket se desconecta al cerrar sesión

## [14-04-2026] — Mejoras visuales del panel de administración

### Descripción
Rediseño del panel de administración para mostrar los datos de forma
visual y amigable en vez de JSON crudo. Se han creado componentes React
reutilizables para cada sección, listos para ser integrados en el
frontend real de CineVault.

### Archivos creados
- `admin-panel/src/components/StatsCard.tsx` — tarjeta individual de estadística
- `admin-panel/src/components/StatsPanel.tsx` — panel de estadísticas generales
- `admin-panel/src/components/ReportsTable.tsx` — tabla de reportes con estado
- `admin-panel/src/components/UsersTable.tsx` — tabla de usuarios con rol y membresía
- `admin-panel/src/components/PaymentsTable.tsx` — tabla de pagos con estado
- `admin-panel/src/components/ActivityTable.tsx` — tabla de actividad de usuarios
- `admin-panel/src/components/SessionsChart.tsx` — visualización de sesiones con barras de progreso

### Archivos modificados
- `admin-panel/src/App.tsx` — conecta cada sección con su componente visual

### Componentes y secciones

| Sección | Componente | Endpoint |
|---|---|---|
| 📊 Estadísticas | StatsPanel | GET /api/rbac/stats |
| 🚨 Reportes | ReportsTable | GET /api/rbac/reports |
| 👥 Usuarios | UsersTable | GET /api/users |
| 💰 Pagos | PaymentsTable | GET /api/rbac/payments |
| 📋 Actividad | ActivityTable | GET /api/rbac/users/activity |
| 🌐 Sesiones | SessionsChart | GET /api/rbac/stats/sessions |

### Características de los componentes
- Tipados con TypeScript — listos para integrar en el frontend real
- Estilados con Tailwind CSS
- Badges de colores por estado (pending/resolved/rejected, admin/editor/user, free/vip/pro)
- Resúmenes con contadores en la cabecera de cada tabla
- Barras de progreso con porcentajes para sesiones
- Filas alternadas para mejor legibilidad
- Sidebar con sección activa resaltada

## [14-04-2026] — Reorganización del proyecto frontend

### Descripción
El panel de administración se ha movido a la carpeta correcta dentro
del repositorio para evitar duplicidades y simplificar el flujo de trabajo.

### Cambios
- `admin-panel/` ahora vive dentro de `cine-vault-v2/` — el repositorio principal
- Eliminada la carpeta `admin-panel` independiente fuera del repositorio
- A partir de ahora el frontend se arranca desde `cine-vault-v2/admin-panel`

### Cómo arrancar el panel
```bash
cd cine-vault-v2/admin-panel
npm install
npm run dev
# Acceder en http://localhost:5173
```

## [14-04-2026] — Estadísticas de sesiones por navegador y dispositivo

### Descripción
Implementación de un sistema para capturar y analizar desde qué navegadores
y dispositivos se conectan los usuarios de CineVault.

### Archivos modificados
- `backend/src/lib/tokens.ts`
- `backend/src/services/auth.services.ts`
- `backend/src/controllers/AuthController.ts`
- `backend/src/repositories/RbacRepository.ts`
- `backend/src/services/rbac.services.ts`
- `backend/src/controllers/RbacController.ts`
- `backend/src/routes/rbac.routes.ts`

### Añadido
- `GET /api/rbac/stats/sessions` — devuelve estadísticas de sesiones activas agrupadas por navegador y dispositivo
- `crearTokenRefresco` ahora acepta `userAgent` e `ipAddress` como parámetros opcionales y los guarda en la tabla `sessions`
- `iniciarSesionService` pasa el `userAgent` e `ipAddress` del contexto a `crearTokenRefresco`
- `AuthController` captura `req.ip` y `req.get("user-agent")` en cada login y los pasa al servicio
- Nuevo método `obtenerSesiones` en `RbacRepository` que devuelve sesiones con `user_agent` e `ip_address`
- Nuevo servicio `obtenerEstadisticasSessionsService` que parsea los `user_agent` con `ua-parser-js`

### Dependencias añadidas
- `ua-parser-js` — parsea strings de user_agent en datos estructurados (navegador, SO, dispositivo)
- `@types/ua-parser-js` — tipos TypeScript para ua-parser-js

### Ejemplo de respuesta
```json
{
  "sesiones_activas": 32,
  "navegadores": {
    "Chrome": 1,
    "Desconocido": 1
  },
  "dispositivos": {
    "desktop": 2
  }
}
```

---

## [13-04-2026] — Panel de administración (React + Tailwind)

### Descripción
Panel frontend independiente para gestionar y probar los endpoints RBAC
del backend. Construido con React, TypeScript, Vite y Tailwind CSS.

### Archivos
- `admin-panel/` — proyecto frontend completo

### Funcionalidades
- Login con credenciales de admin
- Sidebar con acceso a todas las secciones de administración
- Visualización de datos en tiempo real desde la API

### Secciones disponibles
- ✅ Estadísticas generales (`GET /api/rbac/stats`)
- ✅ Reportes (`GET /api/rbac/reports`)
- ✅ Usuarios (`GET /api/users`)
- ✅ Pagos (`GET /api/rbac/payments`)
- ✅ Actividad de usuarios (`GET /api/rbac/users/activity`)
- ✅ Sesiones por navegador y dispositivo (`GET /api/rbac/stats/sessions`) — añadido ## [14-04-2026]
- 🔲 Noticias — pendiente de implementar `GET /api/rbac/news`

### Configuración necesaria
Añadir al `.env` del backend para evitar bloqueo CORS:
FRONTEND_URLS="http://localhost:5000,http://localhost:4000,http://localhost:3000,http://localhost:5173"

### Cómo arrancar
```bash
cd admin-panel
npm install
npm run dev
# Acceder en http://localhost:5173
```

---

## [10-04-2026] — Moderación automática de contenido con OpenAI

### Descripción
Sistema de moderación automática que analiza reseñas y comentarios
antes de guardarlos en la BD. Si se detecta contenido inapropiado,
la petición se bloquea con un error descriptivo.

### Archivos modificados
- `backend/src/services/content.services.ts` — nuevo archivo
- `backend/src/services/reviews.services.ts`
- `backend/src/errors/AppErrors.ts`

### Añadido
- `content.services.ts` — servicio de moderación usando OpenAI Moderation API
- `ContentModerationError` (422) — nuevo tipo de error para contenido inapropiado
- `verificarContenido()` integrado en `crearResenaService` y `crearComentarioService`
- Verificación de `respuesta.ok` antes de parsear respuesta de OpenAI
- Guard en `datos.results[0]` para evitar errores silenciosos
- Constante `RESULTADO_LIMPIO` reutilizable para el fallback cuando la API falla

### Variable de entorno necesaria:
OPENAI_API_KEY=sk-... PREGUNTAR POR ELLA

### Ejemplo de respuesta cuando se detecta contenido inapropiado
```json
{
  "error": {
    "code": "CONTENT_MODERATION_ERROR",
    "message": "Contenido no permitido: harassment, sexual, violence"
  }
}
```

---

## [09-04-2026] — Refactorización RBAC siguiendo patrón SOLID

### Descripción
Separación de la lógica que estaba mezclada en `rbac.routes.ts` en capas
correctas siguiendo el patrón Routes → Controller → Service → Repository.

### Archivos creados
- `backend/src/controllers/RbacController.ts`
- `backend/src/services/rbac.services.ts`
- `backend/src/repositories/RbacRepository.ts`

### Archivos modificados
- `backend/src/routes/rbac.routes.ts`

### Endpoints refactorizados
- `GET /api/rbac/stats` — estadísticas generales
- `DELETE /api/rbac/comments/:id` — borrar comentario ajeno

### Principio aplicado
Single Responsibility (SOLID) — cada capa tiene una única responsabilidad:
- Routes: define endpoints y middlewares
- Controller: extrae datos del request y devuelve respuesta HTTP
- Service: aplica lógica de negocio
- Repository: ejecuta queries con Prisma

---

## [08-04-2026] — Sistema de permisos RBAC

### Descripción
Implementación y ampliación del sistema de control de acceso basado
en roles (RBAC) para el panel de administración.

### Archivos modificados
- `backend/src/config/permisos.ts`
- `backend/src/routes/rbac.routes.ts`

### Añadido

#### Nuevo permiso — borrar comentarios ajenos
- `BORRAR_COMENTARIOS_AJENOS` añadido a `permisos.ts` y asignado al rol `admin`
- `DELETE /api/rbac/comments/:id` — admin o propietario puede borrar un comentario

#### Estadísticas generales del panel
- `GET /api/rbac/stats` — solo accesible para admin
- Devuelve: total usuarios por rol, nuevos este mes, reseñas, reportes y comentarios
- Usa `Promise.all` para ejecutar todas las queries en paralelo

### Tabla de permisos
| Permiso | Admin | Editor | User |
|---|---|---|---|
| Borrar reviews ajenas | ✅ | ❌ | ❌ |
| Gestionar reportes | ✅ | ❌ | ❌ |
| Ver reportes | ✅ | ✅ | ❌ |
| Gestionar noticias | ✅ | ✅ | ❌ |
| Cambiar rol usuarios | ✅ | ❌ | ❌ |
| Ver actividad usuarios | ✅ | ❌ | ❌ |
| Ver pagos | ✅ | ❌ | ❌ |
| Borrar comentarios ajenos | ✅ | ❌ | ❌ |