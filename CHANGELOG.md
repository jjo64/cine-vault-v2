# CHANGELOG — CineVault Backend

Registro de cambios realizados por **Thcito** durante el desarrollo del TFG.
Rama de trabajo: `desarrollo`

---

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