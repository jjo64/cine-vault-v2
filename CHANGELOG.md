# CHANGELOG — CineVault Backend

Registro de cambios realizados por **Thcito** durante el desarrollo del TFG.
Rama de trabajo: `desarrollo`

---

## [20-05-2026] — Corrección de bugs en sistema de moderación y alertas

### Descripción
Sesión de corrección de bugs detectados durante las pruebas del panel de
administración. Los bugs afectaban al sistema de strikes, al modal de
moderación y a las alertas en tiempo real del Dashboard.

---

### Bug 1 — Strikes infinitos desde el modal de moderación ✅

**Problema:** El modal de moderación permitía añadir strikes ilimitados
aunque el usuario ya hubiera sido baneado automáticamente al alcanzar
el límite de 3 strikes.

**Causa:** Los botones usaban `esBaneado(user)` que lee `user.locked_until`
del objeto de React, pero ese dato no se actualizaba en tiempo real cuando
el ban era automático por strikes.

**Fix backend — `RbacRepository.ts`:**
- Añadido método `obtenerEstadoBaneo` que verifica si el usuario está
  actualmente baneado antes de añadir un strike.

**Fix backend — `rbac.services.ts`:**
- `añadirStrikeService` verifica al inicio si el usuario ya está baneado.
  Si lo está, devuelve `{ bloqueado: true, total_strikes: 0, mensaje: '...' }`
  sin añadir el strike.
- El service ahora devuelve `{ message, total_strikes, bloqueado }` en todos
  los casos para que el frontend pueda reaccionar.

**Fix backend — `RbacController.ts`:**
- `añadirStrike` maneja correctamente ambos tipos de respuesta del service
  (objeto con `bloqueado` o número de strikes).

**Fix frontend — `ModerationPanel.tsx`:**
- Añadido estado local `baneado` inicializado con `!!esBaneado(user)`.
- Al aplicar ban temporal, ban permanente o al recibir `bloqueado: true`
  en la respuesta de un strike, se actualiza `setBaneado(true)`.
- Al desbanear, se actualiza `setBaneado(false)`.
- Todos los botones de strike y ban usan `baneado` en lugar de
  `esBaneado(user)` para reaccionar en tiempo real.

**Fix frontend — `ReportsTable.tsx`:**
- Añadido estado local `usuarioBaneado` en `ManageModal`.
- Los cases de strike actualizan `setUsuarioBaneado(true)` si
  `resultado.bloqueado === true`.
- Los botones de strike usan `usuarioBaneado` en lugar de
  `!!report.reviews?.users?.locked_until`.

---

### Bug 2 — Botón "Banear usuario" activo en alertas ya baneadas ✅

**Problema:** En las alertas en tiempo real del Dashboard, el botón
"Banear usuario" seguía activo aunque el usuario ya hubiera sido baneado
(tanto por ban manual como por ban automático por 3 strikes), lo que
provocaba un error 500 al intentar banear de nuevo.

**Fix frontend — `App.tsx`:**
- Añadido estado `usuariosBaneados: Set<number>` que trackea los IDs
  de usuarios baneados durante la sesión.
- `banearUsuario` actualiza el set al completar el baneo correctamente.
- El listener de Socket.IO `ban_automatico` actualiza `usuariosBaneados`
  automáticamente cuando el sistema banea por strikes.
- `usuariosBaneados` se pasa como prop al componente `Dashboard`.

**Fix frontend — `Dashboard.tsx`:**
- Añadida prop `usuariosBaneados: Set<number>`.
- El botón "Banear usuario" en las alertas tiene `disabled` cuando:
  - `alerta.tipo === "ban_automatico"` (ya baneado por IA/strikes), o
  - `usuariosBaneados.has(alerta.userId)` (baneado en esta sesión).
- El botón muestra "Ya baneado" cuando está deshabilitado.
- El `title` del botón muestra "Usuario ya baneado" al hacer hover.

---

### Bug 3 — Alertas duplicadas del mismo usuario ✅

**Problema:** Si el mismo usuario generaba múltiples eventos de moderación
en poco tiempo, las alertas se acumulaban en el Dashboard.

**Fix frontend — `App.tsx`:**
- Los listeners de `contenido_bloqueado` y `ban_automatico` filtran por
  `userId` antes de añadir la nueva alerta, reemplazando la anterior.
- El listener de `nuevo_reporte` filtra por `reporteId` para evitar
  duplicados del mismo reporte.

---

### Archivos modificados

| Archivo | Cambios |
|---|---|
| `backend/src/repositories/RbacRepository.ts` | Nuevo método `obtenerEstadoBaneo` |
| `backend/src/services/rbac.services.ts` | Verificación de baneo al inicio de `añadirStrikeService` |
| `backend/src/controllers/RbacController.ts` | Manejo de respuesta objeto/número en `añadirStrike` |
| `admin-panel/src/App.tsx` | Estado `usuariosBaneados`, listener `ban_automatico` actualizado |
| `admin-panel/src/components/Dashboard.tsx` | Prop `usuariosBaneados`, botón "Banear" con disabled dinámico |
| `admin-panel/src/components/ModerationPanel.tsx` | Estado local `baneado`, botones con `disabled` reactivo |
| `admin-panel/src/components/ReportsTable.tsx` | Estado local `usuarioBaneado`, cases de strike actualizados |

---

### Comportamiento esperado tras los fixes

- Al aplicar el 3er strike, el usuario se banea automáticamente y los
  botones del modal se deshabilitan inmediatamente sin necesidad de cerrar
  y reabrir el modal.
- El aviso "⛔ Usuario baneado — acciones de moderación deshabilitadas"
  aparece en el modal con un enlace directo al perfil completo.
- En el Dashboard, el botón "Banear usuario" de las alertas en tiempo real
  se deshabilita automáticamente al recibir el evento `ban_automatico`
  via Socket.IO, mostrando "Ya baneado".
- Al hacer hover sobre botones deshabilitados aparece el tooltip
  "Usuario baneado — desbanea primero para aplicar esta acción".

## [22-04-2026] — Panel dinámico por roles, dashboard mejorado y UX

### Descripción
Implementación de vistas diferenciadas por rol en el panel de administración.
El sidebar, el dashboard y las secciones disponibles se adaptan automáticamente
según el rol del usuario autenticado (admin, editor, user).
Mejoras de UX: sidebar colapsable, paginación en listas de usuarios,
tarjetas clickables en el dashboard y truncado responsive en todas las tablas.

---

## [22-04-2026] — Panel dinámico por roles

### Archivos modificados
- `admin-panel/src/App.tsx` — sidebar dinámico por rol, toggle colapsable, estado de rol

### Añadido

#### Detección de rol tras login
El payload del JWT se decodifica y el rol se guarda en estado.
El sidebar y el contenido se renderizan condicionalmente según el rol.

#### Sidebar por rol
| Rol | Secciones disponibles |
|---|---|
| admin | Dashboard, Moderación, Actividad, Reportes, Noticias, Sesiones |
| editor | Dashboard, Noticias |
| user | Mi perfil, Mis reseñas, Notificaciones, Mi suscripción |

#### Badge de rol en el header
El header muestra el rol del usuario con color diferenciado:
- 🔴 Admin
- 🟡 Editor
- 🔵 User

#### Sidebar colapsable
Botón ☰ en el header colapsa y expande el sidebar con animación suave.
Al colapsar el sidebar desaparece completamente — sin iconos intermedios.

#### Dashboard por rol
- **Admin** — dashboard completo con estadísticas, alertas y accesos rápidos
- **Editor** — panel editorial con accesos a Noticias y Estadísticas de contenido
- **User** — bienvenida con menú de navegación personal

#### Vistas "Próximamente" para usuario
- 👤 Mi perfil
- 📝 Mis reseñas
- 🔔 Notificaciones
- 💰 Mi suscripción

#### Corregido
- Actividad eliminada del sidebar del editor — el endpoint requiere permisos de admin
- Limpieza del rol al cerrar sesión

---

## [22-04-2026] — Dashboard admin mejorado con usuarios clickables y paginación

### Archivos modificados
- `admin-panel/src/components/Dashboard.tsx` — tarjetas clickables, paginación, nuevos usuarios
- `backend/src/repositories/RbacRepository.ts` — obtenerUsuariosPorRol acepta createdAfter
- `backend/src/services/rbac.services.ts` — obtenerUsuariosPorRolService acepta createdAfter
- `backend/src/controllers/RbacController.ts` — obtenerUsuariosPorRol acepta query param createdAfter
- `backend/src/routes/rbac.routes.ts` — GET /rbac/users con filtros opcionales

### Añadido

#### Tarjetas de usuarios clickables
Las 4 tarjetas de usuarios (Total, Admins, Editores, Usuarios) son ahora
botones que al pulsarse muestran la lista filtrada directamente en el dashboard.

#### Botón "nuevos este mes →"
El sublabel de la tarjeta "Total usuarios" es clickable y filtra los usuarios
registrados desde el inicio del mes actual.

#### Endpoint con filtros
```
GET /api/rbac/users                        → todos los usuarios
GET /api/rbac/users?role=admin             → solo admins
GET /api/rbac/users?role=editor            → solo editores
GET /api/rbac/users?role=user              → solo usuarios
GET /api/rbac/users?createdAfter=ISO_DATE  → nuevos desde esa fecha
```

#### Paginación en lista de usuarios
- 15 usuarios por página
- Navegación Anterior / Siguiente
- Contador "X–Y de Z usuarios"
- La página se resetea al cambiar el filtro

#### Columnas de la lista
ID, Usuario, Email (truncado), Rol, Membresía, Verificado, Fecha de registro

---

## [22-04-2026] — Truncado responsive en todas las tablas

### Descripción
Componente `TruncatedCell` reutilizable aplicado en todas las tablas del panel.
Evita que el contenido largo desconfigue el layout. Comportamiento diferenciado
por dispositivo: tooltip en desktop, expandible en móvil.

### Archivos creados
- `admin-panel/src/components/ui/TruncatedCell.tsx` — componente reutilizable

### Archivos modificados
- `admin-panel/src/components/ReportsTable.tsx` — columna Detalle
- `admin-panel/src/components/ModerationPanel.tsx` — columna Motivo en historial
- `admin-panel/src/components/ActivityFeedTable.tsx` — columna Detalle
- `admin-panel/src/components/UserProfilePanel.tsx` — contenido de comentarios
- `admin-panel/src/components/UserCommentsTable.tsx` — contenido del comentario
- `admin-panel/src/components/Dashboard.tsx` — columna Email en lista de usuarios

### Comportamiento
| Dispositivo | Comportamiento |
|---|---|
| Desktop | Texto truncado con `...`, tooltip nativo al hacer hover |
| Móvil | Texto truncado con botón "ver más" / "ver menos" |

### Props
| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| text | string \| null | — | Texto a mostrar |
| maxChars | number | 60 | Máximo de caracteres antes de truncar |
| className | string | "" | Clases adicionales |

### Tabla con ancho fijo
`ReportsTable` usa `table-layout: fixed` con `<colgroup>` para garantizar
anchos estables independientemente del contenido.

---

## Resumen de archivos nuevos — [22-04-2026]

| Archivo | Descripción |
|---|---|
| `admin-panel/src/components/ui/TruncatedCell.tsx` | Celda truncada responsive |

## Resumen de endpoints nuevos — [22-04-2026]

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/rbac/users | Lista de usuarios con filtros opcionales (role, createdAfter) |

## Probado
✅ Admin ve el panel completo
✅ Editor ve solo Dashboard y Noticias
✅ User ve su panel personal
✅ Sidebar se colapsa y expande con ☰
✅ Tarjetas de usuarios muestran lista filtrada al pulsar
✅ "Nuevos este mes →" filtra correctamente por fecha
✅ Paginación funciona correctamente con 15 usuarios por página
✅ TruncatedCell trunca en desktop y expande en móvil


## [21-04-2026] — Dashboard de inicio con alertas en tiempo real

### Descripción
Implementación de un dashboard que carga automáticamente al entrar al panel.
Combina estadísticas generales, alertas en tiempo real con niveles de prioridad
y accesos rápidos a las secciones principales. Las alertas se muestran con
colores según su gravedad y un badge en el sidebar indica las no leídas.

### Archivos creados
- `admin-panel/src/components/Dashboard.tsx` — dashboard principal
- `admin-panel/src/types/alertas.ts` — interfaz compartida de alertas

### Archivos modificados
- `admin-panel/src/components/StatsCard.tsx` — mejorado con sublabel y formato numérico
- `admin-panel/src/App.tsx` — dashboard como vista por defecto, gestión de alertas tipadas

### Añadido
- Vista de inicio automática al entrar al panel
- Estadísticas generales cargadas automáticamente (usuarios, reseñas, moderación)
- Sistema de alertas con 4 niveles de prioridad:
  - 🔴 Crítico — baneo automático por IA, ban automático por strikes
  - 🟠 Alto — reportes de acoso, lenguaje ofensivo, contenido inapropiado
  - 🟡 Medio — reportes de spam, spoiler
  - 🔵 Info — reservado para futuras notificaciones
- Badge en sidebar con color dinámico según prioridad de alertas sin leer
- Accesos rápidos a Reportes, Moderación, Actividad y Sesiones

### Eventos Socket.IO añadidos
| Evento | Cuándo se emite | Prioridad |
|---|---|---|
| `contenido_bloqueado` | IA detecta contenido grave | Crítico |
| `nuevo_reporte` | Usuario crea un reporte | Alto/Medio según motivo |
| `ban_automatico` | Usuario acumula 3 strikes | Crítico |

---

## [21-04-2026] — Perfil completo de usuario para el admin

### Descripción
Vista detallada de cada usuario accesible desde el panel de moderación.
Centraliza toda la información de un usuario en un único punto: datos de cuenta,
actividad, pagos y sesiones activas. Reemplaza las secciones independientes
de Usuarios y Pagos del sidebar.

### Archivos creados
- `admin-panel/src/components/UserProfilePanel.tsx` — perfil completo con tabs

### Archivos modificados
- `backend/src/repositories/RbacRepository.ts` — obtenerPerfilUsuario, obtenerSesionesUsuario, invalidarSesion
- `backend/src/services/rbac.services.ts` — obtenerPerfilUsuarioService, obtenerSesionesUsuarioService, invalidarSesionService
- `backend/src/controllers/RbacController.ts` — obtenerPerfilUsuario, obtenerSesionesUsuario, invalidarSesion
- `backend/src/routes/rbac.routes.ts` — nuevas rutas de perfil y sesiones
- `admin-panel/src/components/ModerationPanel.tsx` — botón "Ver perfil completo" en modal

### Endpoints añadidos
- `GET /api/rbac/users/:id/profile` — perfil completo del usuario
- `GET /api/rbac/users/:id/sessions` — sesiones activas del usuario
- `DELETE /api/rbac/users/:id/sessions/:sessionId` — invalidar sesión específica

### Tabs del perfil
| Tab | Contenido |
|---|---|
| 🔐 Cuenta | Estado, suscripción, strikes, reportes recibidos, 2FA, verificación |
| 📋 Actividad | Últimas reseñas, comentarios, likes dados |
| 💰 Pagos | Historial de transacciones, total gastado, plan activo |
| 🔗 Sesiones | Sesiones activas con navegador, SO, IP y botón invalidar |

### Respuesta del endpoint de perfil
```json
{
  "usuario": { "id", "username", "email", "role", "membership", ... },
  "cuenta": {
    "esta_baneado": false,
    "es_baneo_permanente": false,
    "strikes_activos": 0,
    "strikes_historial": [],
    "reportes_recibidos": 16,
    "suscripcion": { "plan", "status", "start_date", "end_date" }
  },
  "actividad": { "resenas", "comentarios", "likes_dados" },
  "pagos": [],
  "total_gastado": "0.00"
}
```

### Probado
✅ Perfil carga correctamente con todos los datos
✅ Tab Sesiones muestra sesiones activas con info de dispositivo
✅ Invalidar sesión elimina la sesión y desaparece de la lista
✅ Botón "Ver perfil completo" desde modal de gestión

---

## [21-04-2026] — Limpieza del sidebar y eliminación de código obsoleto

### Descripción
Eliminación de secciones redundantes del panel de administración.
La información de usuarios y pagos ahora se gestiona desde el perfil
de usuario en el panel de moderación.

### Archivos modificados
- `admin-panel/src/App.tsx` — eliminadas secciones Usuarios, Pagos y Estadísticas del sidebar
- `admin-panel/src/components/Dashboard.tsx` — estadísticas integradas en el dashboard

### Eliminado
- Sección "👥 Usuarios" del sidebar — reemplazada por Moderación → perfil de usuario
- Sección "💰 Pagos" del sidebar — reemplazada por perfil de usuario → tab Pagos
- Sección "📊 Estadísticas" del sidebar — integrada en el Dashboard

### Archivos eliminados
- `admin-panel/src/components/UsersTable.tsx`
- `admin-panel/src/components/PaymentsTable.tsx`
- `admin-panel/src/components/StatsPanel.tsx`
- `admin-panel/src/components/ActivityTable.tsx`

### Nota
Los endpoints del backend (`GET /api/users`, `GET /api/rbac/payments`,
`GET /api/rbac/stats`) se mantienen — el frontend real de CineVault los necesitará.

---

## [21-04-2026] — Sistema de reportes con enum, agrupación y rechazo con motivo

### Descripción
Rediseño completo del sistema de reportes. El campo `reason` pasa de texto
libre a un enum tipado. Los reportes se agrupan visualmente por sección en
el panel. El rechazo incluye motivo predefinido, texto personalizado y
notificación automática al reporter.

### Archivos modificados
- `backend/prisma/schema.prisma` — nuevo enum `reports_reason`, campo `reason_detail`
- `backend/src/schemas/reviews.ts` — `reportarResenaSchema` usa `z.enum`
- `backend/src/repositories/ReviewsRepository.ts` — `createReport` acepta `reason_detail`
- `backend/src/services/reviews.services.ts` — pasa `reason_detail`, emite `nuevo_reporte`
- `backend/src/services/rbac.services.ts` — `actualizarReporteService` notifica al reporter
- `backend/src/controllers/RbacController.ts` — `actualizarReporte` acepta `mensaje_personalizado`
- `admin-panel/src/components/ReportsTable.tsx` — agrupación por sección, filtros, modal mejorado

### Enum de motivos
```prisma
enum reports_reason {
  lenguaje_ofensivo
  spam
  spoiler
  contenido_inapropiado
  acoso
  otro
}
```

### Nuevo campo
```prisma
reason_detail String? @db.VarChar(500) // texto libre opcional del reporter
```

### Nuevo enum de notificaciones
```prisma
report_rejected // notificación al reporter cuando se rechaza su reporte
```

### Flujo de rechazo con motivo
```
Admin pulsa "Rechazar reporte"
↓
Se despliega formulario inline con opciones predefinidas:
  - No viola las normas de la comunidad
  - El reporte está fuera de contexto
  - No hay evidencia suficiente
  - Contenido ya revisado anteriormente
  - Reporte duplicado
  - Otro motivo (texto libre)
↓
Admin puede añadir mensaje personalizado adicional (opcional)
↓
PATCH /rbac/reports/:id { status: "rejected", resolution_note, mensaje_personalizado }
↓
Backend envía notificación automática al reporter con el motivo
↓
Si el reporter está conectado → Socket.IO emite en tiempo real
```

### Mensajes automáticos al reporter
El mensaje incluye siempre: motivo del rechazo + mensaje personalizado del admin (si existe).

### Confirmación para acciones graves
Ban temporal y ban permanente requieren confirmación inline antes de ejecutarse.

### Probado
✅ Reporte creado con enum y reason_detail guardado en BD
✅ Tabla agrupa reportes por sección con badges de colores
✅ Filtro por estado (Todos / Pendiente / Resuelto / Rechazado)
✅ Modal muestra motivo detallado del reporter
✅ Formulario de rechazo con motivos predefinidos y texto libre
✅ Notificación llega al reporter al rechazar

---

## [21-04-2026] — Moderación directa desde panel sin reporte previo

### Descripción
El panel de moderación permite ahora gestionar usuarios directamente
desde el buscador sin necesidad de un reporte previo. Útil para fallos
de la IA o contenido antiguo que requiera acción manual.

### Archivos modificados
- `admin-panel/src/components/ModerationPanel.tsx` — modal de gestión con todas las acciones

### Acciones disponibles desde el modal de usuario
- Cambiar rol (user / editor / admin) con rol actual resaltado
- Strike por tipo (spoiler / spam / acoso)
- Enviar warning
- Ban temporal (30 días)
- Ban permanente
- Desbanear

### Reglas de UI
- Ban temporal y ban permanente se deshabilitan si el usuario ya está baneado
- Desbanear se deshabilita si el usuario no está baneado
- El rol actual aparece resaltado en índigo
- Botón "Ver perfil completo →" en el header del modal abre el perfil detallado

---

## [21-04-2026] — Sesiones por usuario con invalidación

### Descripción
Las sesiones activas de un usuario son visibles desde su perfil y el admin
puede invalidarlas individualmente. Las estadísticas globales de navegadores
y dispositivos se mantienen en la sección "Sesiones" del sidebar.

### Archivos modificados
- `backend/src/repositories/RbacRepository.ts` — obtenerSesionesUsuario, invalidarSesion
- `backend/src/services/rbac.services.ts` — obtenerSesionesUsuarioService, invalidarSesionService
- `backend/src/controllers/RbacController.ts` — obtenerSesionesUsuario, invalidarSesion
- `backend/src/routes/rbac.routes.ts` — GET y DELETE de sesiones por usuario
- `admin-panel/src/components/UserProfilePanel.tsx` — tab Sesiones

### Información por sesión
- Navegador y versión (parseado con ua-parser-js)
- Sistema operativo
- Tipo de dispositivo (desktop / mobile / tablet)
- Dirección IP
- Fecha de inicio y fecha de expiración

### Acción registrada en historial
Cuando el admin invalida una sesión queda registrado como `session_invalidated`
en `user_activity` con el ID de la sesión y el admin que la invalidó.

---

## Resumen de endpoints nuevos — [21-04-2026]

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/rbac/users/:id/profile | Perfil completo del usuario |
| GET | /api/rbac/users/:id/sessions | Sesiones activas del usuario |
| DELETE | /api/rbac/users/:id/sessions/:sessionId | Invalidar sesión |

## Resumen de archivos creados — [21-04-2026]

| Archivo | Descripción |
|---|---|
| `admin-panel/src/components/Dashboard.tsx` | Dashboard de inicio |
| `admin-panel/src/components/UserProfilePanel.tsx` | Perfil completo de usuario |
| `admin-panel/src/types/alertas.ts` | Interfaz compartida de alertas |

## Archivos eliminados — [21-04-2026]

| Archivo | Motivo |
|---|---|
| `admin-panel/src/components/UsersTable.tsx` | Reemplazado por perfil de usuario |
| `admin-panel/src/components/PaymentsTable.tsx` | Integrado en perfil de usuario |
| `admin-panel/src/components/StatsPanel.tsx` | Integrado en Dashboard |
| `admin-panel/src/components/ActivityTable.tsx` | Reemplazado por ActivityFeedTable |

## [20-04-2026] — Feed de actividad real de usuarios

### Descripción
Rediseño completo del apartado de actividad del panel de administración.
Se reemplaza la tabla `ActivityTable` que mostraba registros mezclados de
`user_activity` (incluyendo acciones de moderación) por un feed unificado
que cruza múltiples tablas reales de la base de datos, mostrando únicamente
acciones de los usuarios: reseñas, likes, comentarios, follows, watchlist,
favoritos, vault y pagos.

El endpoint está diseñado para ser consumido directamente por el frontend
real de CineVault sin necesidad de cambios — devuelve un formato normalizado
y ordenado por fecha.

### Archivos modificados
- `backend/src/repositories/RbacRepository.ts` — nuevo método: obtenerActividadUsuarios
- `backend/src/services/rbac.services.ts` — nuevo servicio: obtenerActividadUsuariosService
- `backend/src/controllers/RbacController.ts` — nuevo handler: obtenerActividadUsuariosFeed
- `backend/src/routes/rbac.routes.ts` — nueva ruta: GET /rbac/users/activity/feed
- `admin-panel/src/components/ActivityFeedTable.tsx` — nuevo componente
- `admin-panel/src/App.tsx` — integración de ActivityFeedTable, reemplaza ActivityTable

### Añadido

#### Endpoint
```
GET /api/rbac/users/activity/feed
GET /api/rbac/users/activity/feed?userId=7
GET /api/rbac/users/activity/feed?userId=7&limit=25
```
Parámetros opcionales:
- `userId` — filtra la actividad de un usuario específico
- `limit` — número máximo de registros (por defecto 50)

#### Tablas cruzadas
| Acción | Tabla origen |
|---|---|
| review_created | reviews |
| review_liked | review_likes |
| comment_created | review_comments |
| user_followed | follows |
| watchlist_added | watchlist |
| favorite_added | favorites |
| vault_created | vault_social_entries |
| payment_completed | payments (status: paid) |

#### Formato de respuesta normalizado
```json
[
  {
    "user": { "id": 1, "username": "josue" },
    "action": "review_created",
    "detail": "Valoró la película #56 con 4.5★ (modo: RAPIDO)",
    "created_at": "2026-04-20T12:00:00.000Z"
  }
]
```

#### Componente ActivityFeedTable
- Buscador por username con llamada a `/rbac/users/search`
- Selector de límite (25 / 50 / 100)
- Badges de colores por tipo de acción
- Botón "Ver todo" para limpiar el filtro
- Carga bajo demanda — no hace fetch hasta pulsar "Buscar"

### Patrón aplicado
Route → Controller → Service → Repository (SOLID completo)
- Repository: 8 queries en paralelo con `Promise.all`
- Service: normalización y ordenación del feed, sin Prisma
- Controller: extrae `userId` y `limit` del query string
- Route: ruta estática `/users/activity/feed` definida antes de `/users/:id/...`

### Probado
✅ Feed global devuelve actividad de todos los usuarios ordenada por fecha
✅ Filtro por userId devuelve solo actividad del usuario indicado
✅ Buscador por username resuelve el userId automáticamente
✅ Límite funciona correctamente
✅ Badges de colores por tipo de acción

## [20-04-2026] — Sistema de gestión de reportes completo

### Descripción
Rediseño completo del flujo de gestión de reportes en el panel de administración.
Se reemplaza el sistema de dos botones (Resolver/Rechazar) por un modal de gestión
completa que permite al admin ver el contenido reportado, los datos del usuario
afectado y tomar la acción de moderación apropiada desde un único punto.

### Archivos modificados
- `backend/src/repositories/RbacRepository.ts` — nuevos métodos: obtenerReportes, actualizarReporte
- `backend/src/services/rbac.services.ts` — nuevos servicios: obtenerReportesService, actualizarReporteService; corrección banearUsuarioService; fix strikes en historial; mensajes automáticos de warning
- `backend/src/controllers/RbacController.ts` — nuevos endpoints: obtenerReportes, actualizarReporte; corrección banearUsuario acepta locked_until del body
- `backend/src/routes/rbac.routes.ts` — rutas de reportes refactorizadas a patrón SOLID; eliminadas 3 rutas duplicadas
- `admin-panel/src/components/ReportsTable.tsx` — rediseño completo con modal de gestión

### Añadido

#### Modal de gestión de reportes
Al pulsar "Gestionar" en un reporte pendiente se abre un modal con:
- Contenido completo de la reseña reportada
- Datos del usuario afectado (rol, membresía)
- Acciones disponibles: Strike (spoiler/spam/acoso), Warning, Ban temporal 30d, Ban permanente, Rechazar reporte, Resolver sin acción

#### Tabla de reportes simplificada
La tabla ahora muestra solo: ID, usuario que reporta, motivo, estado.
El botón "Gestionar" únicamente aparece en reportes pendientes.
Los reportes resueltos/rechazados no muestran acciones.

#### Mensajes automáticos de warning
Al enviar un warning el usuario recibe un mensaje personalizado según el tipo
de infracción detectada automáticamente del contenido del reporte:

| Tipo detectado | Criterio de detección |
|---|---|
| spoiler | contenido contiene "spoiler" |
| spam | contenido contiene "spam" o "publicidad" |
| acoso | contenido contiene "acoso" u "ofensivo" |
| inapropiado | fallback genérico |

Todos los mensajes incluyen el aviso:
"Un comportamiento reiterado puede acarrear desde un strike hasta un baneo
permanente de tu cuenta."

#### Strikes en historial de moderación
Los strikes ahora quedan registrados en el historial de moderación.
Acción registrada: `strike_added` con el tipo y el total de strikes activos.

### Corregido

#### SOLID — rutas de reportes
`GET /rbac/reports` y `PATCH /rbac/reports/:id` tenían queries Prisma inline
en las rutas, saltándose las capas Controller → Service → Repository.
Refactorizadas al patrón correcto.

#### Rutas duplicadas eliminadas
Las siguientes rutas estaban definidas dos veces en `rbac.routes.ts`:
- `POST /users/:id/warning`
- `GET /users/:id/comments`
- `GET /moderation/history`

#### Ban temporal no funcionaba
`banearUsuario` en el controller ignoraba el body y siempre hacía ban permanente.
Ahora lee `locked_until` del body — si viene fecha es temporal, si no es permanente.

#### `reviews.users` incluido en GET /rbac/reports
El endpoint ahora devuelve el autor de la reseña (usuario reportado) dentro de
`reviews.users` para que el modal pueda identificarlo y aplicar acciones.

### Flujo completo de gestión de un reporte
```
Admin abre panel → selecciona Reportes
→ tabla muestra ID, reporter, motivo, estado
→ pulsa "Gestionar" en reporte pendiente
→ modal muestra contenido + datos usuario afectado
→ admin elige acción:
    Strike    → POST /rbac/users/:id/strikes + PATCH /rbac/reports/:id (resolved)
    Warning   → POST /rbac/users/:id/warning + PATCH /rbac/reports/:id (resolved)
    Ban temp  → PATCH /rbac/users/:id/ban { locked_until: +30d } + PATCH /rbac/reports/:id (resolved)
    Ban perm  → PATCH /rbac/users/:id/ban { locked_until: 2099 } + PATCH /rbac/reports/:id (resolved)
    Rechazar  → PATCH /rbac/reports/:id (rejected)
    Resolver  → PATCH /rbac/reports/:id (resolved)
→ modal se cierra, tabla se actualiza automáticamente
→ acción queda registrada en historial de moderación
```

### Probado
✅ Modal abre con contenido y datos del usuario afectado
✅ Warning enviado → notificación creada en BD (type: warning, read: false)
✅ Warning enviado → mensaje personalizado emitido via Socket.IO
✅ Strike añadido → aparece en historial de moderación
✅ Reporte resuelto → desaparece el botón "Gestionar" en la tabla
✅ Ban temporal → acepta fecha desde el body correctamente
✅ Historial de moderación registra: strike_added, warning_sent, user_banned

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