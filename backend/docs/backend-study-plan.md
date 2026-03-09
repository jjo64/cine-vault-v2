# Libro Teórico de Backend para CineVault

Guía extensa para estudiar con enfoque Senior Engineer + Tech Lead.

Base principal de este libro:
- backend/docs/backend-architecture.md
- backend/docs/backend-domains.md
- backend/docs/backend-howto.md
- backend/docs/backend-tutorial-auth.md
- backend/docs/openapi.yaml
- backend/docs/api-standards.md

---

## Parte I — Cómo estudiar este libro

### Capítulo 0. Método de aprendizaje profesional

Este documento no es un resumen: es un programa de formación técnica. La idea es que estudies cada capítulo en tres capas:

1. **Capa conceptual**: entender por qué existe cada decisión.
2. **Capa de implementación**: ubicarla en el código real de CineVault.
3. **Capa operativa**: saber cómo se comporta en producción, bajo carga y bajo fallos.

#### Regla de lectura
- 45–60 minutos de teoría por capítulo.
- 60–90 minutos de laboratorio.
- Cierre con autoevaluación.

#### Regla de madurez técnica
No memorices “cómo se hace”; aprende “cuándo conviene” y “qué costo tiene”.

---

## Parte II — Fundamentos de diseño backend

### Capítulo 1. Entorno reproducible y contratos de configuración

Un backend serio es reproducible. Si dos entornos (local/staging/prod) no comparten el mismo contrato de configuración, aparecen bugs fantasmas.

#### Conceptos clave
- **Contrato de configuración**: variables obligatorias, opcionales y defaults explícitos.
- **Separación de secretos**: nunca mezclar credenciales con código.
- **Fail fast**: si falta una variable crítica, el proceso debe fallar al inicio.

#### Aplicación en CineVault
Variables relevantes:
- DB: `DATABASE_URL`
- Redis: `REDIS_URL` o `REDIS_HOST` + `REDIS_PORT` + `REDIS_PASSWORD` + `REDIS_USERNAME`
- Auth/Email/Pagos: JWT, Resend, Stripe

#### Riesgo de arquitectura
Cuando un servicio intenta inferir defaults inseguros, oculta errores reales. Ejemplo clásico: conectar Redis sin password en un entorno que sí lo exige.

#### Laboratorio
1. Lista todas las variables del backend.
2. Clasifícalas en crítica/importante/accesoria.
3. Diseña un checklist de boot para evitar despliegues rotos.

---

### Capítulo 2. TypeScript para modelar negocio, no solo tipos

TypeScript en backend no se usa para “que compile”; se usa para codificar invariantes del dominio.

#### Principios senior
- Tipa **casos de uso**, no solo utilidades.
- Evita `any`; usa `unknown` y refina.
- Define DTOs de entrada/salida con intención semántica.

#### Patrones recomendados
- `type` para composición de datos.
- `interface` para contratos extendibles de objetos/servicios.
- `Result`/errores tipados para caminos de negocio esperables.

#### Anti-patrones
- Tipos gigantes para “todo” el dominio.
- Reutilizar un DTO de escritura como DTO de lectura.
- Hacer cast para silenciar errores en vez de modelarlos.

#### Laboratorio
Toma un endpoint de Auth y separa:
- Tipo de input validado.
- Tipo interno de servicio.
- Tipo de respuesta pública.

---

### Capítulo 3. HTTP y pipeline de Express

Una request no “llega al controller”: atraviesa un pipeline de responsabilidades.

#### Cadena mental
`request → middlewares transversales → controller → service → repository → response`

#### Qué debe vivir en cada capa
- **Middleware**: concerns transversales (auth, rate-limit, validación estructural).
- **Controller**: traducción HTTP ↔ caso de uso.
- **Service**: reglas de negocio.
- **Repository**: persistencia.

#### Regla Tech Lead
Si un bug requiere abrir 7 archivos para entenderse, tu separación de responsabilidades está rota.

#### Laboratorio
Traza en diagrama el flujo de `/auth/login` y marca qué validación sucede en cada capa.

---

### Capítulo 4. ADRs y arquitectura evolutiva

Un equipo senior no decide “por costumbre”, decide con contexto y registra decisiones.

#### Estructura mínima de un ADR
1. Contexto del problema.
2. Opciones evaluadas.
3. Decisión elegida y razones.
4. Consecuencias positivas/negativas.

#### Uso en CineVault
Tus ADRs ya reflejan decisiones clave: repository pattern, DTOs con Zod, Swagger/OpenAPI, controladores delgados.

#### Laboratorio
Escribe un ADR corto: “¿Conviene spec-first o code-first para OpenAPI en este proyecto?”.

---

## Parte III — Seguridad e identidad

### Capítulo 5. Threat modeling para API social

Antes de escribir auth, modela amenazas:
- robo de tokens
- brute force
- account takeover
- abuso de endpoints públicos
- manipulación de permisos

#### Modelo práctico
- Activo protegido (sesión, identidad, datos privados)
- Vector de ataque
- Impacto
- Mitigación técnica

#### Laboratorio
Construye una tabla de amenazas para Auth y Reviews.

---

### Capítulo 6. Auth I — Registro, verificación y login

Objetivo: identidad confiable y verificable.

#### Flujo correcto
1. Registro.
2. Verificación de email.
3. Login con credenciales.
4. Entrega de access token + refresh cookie.

#### Decisiones importantes
- Nunca revelar si un email existe en flujos sensibles.
- Expirar tokens de verificación.
- Loggear eventos de seguridad sin datos sensibles.

#### Referencias
- backend/docs/backend-tutorial-auth.md
- backend/docs/openapi.yaml

---

### Capítulo 7. Auth II — Refresh token rotation y revocación

Refresh rotation reduce impacto de token leak, pero exige disciplina de estado.

#### Reglas de oro
- Cada refresh invalida el anterior.
- Reuso de refresh inválido = evento sospechoso.
- Revocación global ante incidente.

#### Trade-off
Más seguridad implica mayor complejidad de sesión y almacenamiento.

#### Laboratorio
Simula robo de refresh y define respuesta operativa (bloqueo, notificación, revoke-all).

---

### Capítulo 8. Auth III — 2FA con TOTP

2FA agrega una capa de seguridad basada en posesión del autenticador.

#### Buenas prácticas
- Confirmación inicial obligatoria del código.
- Cifrado/almacenamiento seguro de secretos TOTP.
- Proceso de recovery definido por producto.

#### Error común
Activar 2FA sin plan de recuperación: terminas secuestrando usuarios legítimos.

---

### Capítulo 9. RBAC + membresías

No mezcles rol con plan comercial.

#### Modelo recomendado
- **Rol**: qué puede hacer técnicamente (admin/editor/user).
- **Plan**: qué beneficios de negocio tiene (VIP/PRO).

#### Ejemplo
Un usuario `user` puede tener plan PRO, sin ser admin.

#### Laboratorio
Construye matriz endpoint × permiso × plan.

---

## Parte IV — Datos, dominio y consistencia

### Capítulo 10. Diseño de dominio y fronteras

Los dominios de CineVault (Auth, Users, Diary, Reviews, etc.) deben evitar acoplamientos circulares.

#### Señal de frontera sana
Cada dominio puede cambiar su implementación interna sin romper otros, si respeta contrato.

#### Señal de frontera enferma
Services de un dominio importan repositories internos de otro para saltarse reglas.

---

### Capítulo 11. Prisma y persistencia consciente

Prisma acelera, pero no reemplaza criterio de modelado.

#### Temas que debes dominar
- índices y selectividad
- paginación estable
- errores de unicidad
- transacciones para invariantes cruzados

#### Laboratorio
Analiza una consulta de reseñas con paginación y diseña índice para mejorar latencia.

---

### Capítulo 12. Patrón repository y servicios ricos

Repository no es “capa extra por moda”, es una frontera para aislar persistencia.

#### Regla
Si cambias DB/ORM y explota medio dominio, entonces los límites estaban mal.

#### Diseño recomendado
- Repository: query + persist.
- Service: reglas, políticas, side effects.
- Controller: protocolo HTTP.

---

### Capítulo 13. Errores de negocio vs errores técnicos

Un backend profesional distingue:
- errores esperables del dominio (409, 404, 422)
- errores inesperados de infraestructura (500)

#### Objetivo
No ocultar fallos reales, ni filtrar detalles internos al cliente.

#### Laboratorio
Toma 5 endpoints y clasifica errores posibles en dominio/técnico.

---

## Parte V — Redis, caché y performance

### Capítulo 14. Redis como infraestructura de decisión

Redis no es “poner cache y listo”. Es gestión de latencia, costo y consistencia.

#### Patrones de uso en CineVault
- cache-aside para lecturas repetidas
- rate limiting
- colas/listas ligeras para notificaciones pendientes

#### Diseño de keys
Una key buena codifica contexto: recurso + identidad + variante.

Ejemplo: `tmdb:search:{query_normalizada}:p{page}`

---

### Capítulo 15. Invalidación: el problema real de la caché

Cachear es fácil; invalidar correctamente no.

#### Estrategia práctica
1. Identifica qué escrituras afectan qué lecturas.
2. Centraliza invalidación por dominio.
3. Usa TTL como red de seguridad, no como estrategia principal.

#### Anti-patrones
- invalidar “todo” por comodidad
- TTL larguísimo para datos mutables
- no instrumentar hit/miss

#### Laboratorio
Diseña invalidación para favorites + watchlist + perfil.

---

### Capítulo 16. Ingeniería de rendimiento en APIs

Rendimiento no es solo DB:
- serialización JSON
- tamaño de payload
- fan-out a servicios externos
- bloqueo por I/O

#### Método senior
1. Mide.
2. Encuentra cuello real.
3. Optimiza lo crítico.
4. Vuelve a medir.

---

## Parte VI — Integraciones externas

### Capítulo 17. TMDB y diseño de anti-corruption layer

No acoples tu dominio al shape externo de TMDB.

#### Patrón
Adaptador interno:
- normaliza respuesta
- aplica fallback
- maneja timeout/retry
- oculta peculiaridades de proveedor

#### Beneficio
Si cambia TMDB, cambias adaptador, no todo el backend.

---

### Capítulo 18. Stripe y consistencia eventual de pagos

Pagos son event-driven: la verdad final suele llegar por webhook.

#### Reglas críticas
- validar firma del webhook
- idempotencia por event id
- reconciliación periódica

#### Error típico
Actualizar membresía solo con respuesta del checkout y no con webhook confirmado.

---

### Capítulo 19. Cloudinary y gestión de assets

Subir archivos implica políticas:
- límites de tamaño y tipo
- control de URLs
- ciclo de vida de assets reemplazados

#### Decisión de negocio
Define si eliminarás assets previos al actualizar avatar o mantendrás historial.

---

### Capítulo 20. Resend y comunicación transaccional

Email es parte de seguridad operativa: verificación, reset, alertas.

#### Buenas prácticas
- no filtrar tokens en logs
- expiración corta de enlaces
- textos claros para reducir soporte

---

## Parte VII — Dominios de producto en CineVault

### Capítulo 21. Social graph (users/settings/follow)

Diseña ownership claro:
- qué puede editar el dueño
- qué es visible públicamente
- qué requiere autenticación

#### Riesgo
Permitir update parcial sin validación puede corromper perfil o abrir vector de abuso.

---

### Capítulo 22. Diary/watchlist/favorites

Este grupo exige coherencia funcional.

#### Invariantes sugeridas
- no duplicar item en watchlist/favorites
- ownership obligatorio en delete/update
- respuestas consistentes entre dominios similares

#### Laboratorio
Diseña pruebas de concurrencia para añadir/eliminar elementos rápidamente.

---

### Capítulo 23. Reviews/comments/reports

Aquí convergen calidad de contenido, moderación y engagement.

#### Preguntas de diseño
- ¿Cómo evitas spam de comentarios?
- ¿Qué semántica tiene un report?
- ¿Cómo auditas acciones de moderación?

#### Trade-off
Más fricción reduce abuso, pero también participación legítima.

---

### Capítulo 24. Notificaciones en tiempo real + pendientes

Diseño híbrido recomendado:
- persistencia en DB
- push en tiempo real cuando hay conexión
- replay de pendientes cuando el usuario vuelve

#### Métrica útil
“Tiempo de entrega percibida” para notificaciones activas.

---

## Parte VIII — Calidad, operación y liderazgo técnico

### Capítulo 25. Testing estratégico

No todo se testea igual.

#### Pirámide pragmática
- unit tests para reglas de negocio
- integration para rutas críticas
- e2e/smoke para flujo completo de auth y pagos

#### Regla
Prioriza pruebas donde el costo de fallo es más alto.

---

### Capítulo 26. Observabilidad: de logs a SLOs

Un sistema sin observabilidad te obliga a adivinar.

#### Base mínima
- logs estructurados
- métricas de latencia por endpoint
- tasa de error por dominio
- ratio cache hit/miss

#### Nivel Tech Lead
Definir SLI/SLO por journeys críticos (login, crear reseña, checkout).

---

### Capítulo 27. Gestión de incidentes y runbooks

La calidad real se prueba en incidente.

#### Runbook mínimo
1. detección
2. contención
3. mitigación
4. comunicación
5. postmortem sin culpables

---

### Capítulo 28. Gobierno de API y OpenAPI como contrato vivo

`openapi.yaml` no es documento decorativo, es contrato de integración.

#### Política recomendada
- toda ruta nueva debe aparecer en OpenAPI
- breaking changes con versionado explícito
- validación de spec en CI

---

### Capítulo 29. De Senior a Tech Lead

Ser lead no es “codificar menos”; es ampliar el radio de impacto.

#### Responsabilidades crecientes
- visión de arquitectura
- gestión de deuda técnica
- calidad de decisiones del equipo
- mentoring técnico

#### Indicador real
Tu equipo entrega mejor incluso cuando tú no tocas cada PR.

---

## Parte IX — Programa de estudio guiado

### Ruta de 8 semanas (recomendada)

#### Semana 1
- Capítulos 1–4
- Entregable: mapa de arquitectura y pipeline real de una request.

#### Semana 2
- Capítulos 5–9
- Entregable: threat model + matriz RBAC/planes.

#### Semana 3
- Capítulos 10–13
- Entregable: propuesta de invariantes de dominio y taxonomía de errores.

#### Semana 4
- Capítulos 14–16
- Entregable: diseño de cache + invalidación + benchmark simple.

#### Semana 5
- Capítulos 17–20
- Entregable: documento de integración robusta con TMDB/Stripe/Resend/Cloudinary.

#### Semana 6
- Capítulos 21–24
- Entregable: análisis de consistencia por dominios sociales.

#### Semana 7
- Capítulos 25–28
- Entregable: estrategia de testing + observabilidad + runbook.

#### Semana 8
- Capítulo 29 + repaso general
- Entregable: roadmap técnico trimestral de evolución backend.

---

## Parte X — Laboratorios capstone

### Capstone A. Endurecer Auth
- Objetivo: elevar seguridad práctica sin romper UX.
- Tareas:
	1. revisar rate limit login
	2. auditar refresh rotation
	3. validar ruta de recuperación de 2FA

### Capstone B. Cache coherente
- Objetivo: mejorar p95 sin servir datos obsoletos críticos.
- Tareas:
	1. medir endpoint base
	2. aplicar cache-aside
	3. diseñar invalidación por eventos de escritura

### Capstone C. Gobierno OpenAPI
- Objetivo: eliminar drift entre código y contrato.
- Tareas:
	1. inventariar rutas reales
	2. comparar con `openapi.yaml`
	3. proponer política de CI

---

## Apéndice A — Checklists de revisión técnica

### Checklist de endpoint nuevo
- input validado con Zod
- auth/rbac correcto
- service sin lógica HTTP
- repository sin lógica de negocio
- errores mapeados
- OpenAPI actualizado
- test mínimo agregado

### Checklist de cambio con caché
- clave diseñada con contexto
- TTL razonado
- invalidación definida
- fallback seguro si Redis falla
- métrica hit/miss observada

### Checklist de integración externa
- timeout y retry configurados
- idempotencia definida
- errores externos normalizados
- secretos protegidos
- documentación operativa escrita

---

## Apéndice B — Glosario técnico

- **Access Token**: JWT de corta vida para autorización en request.
- **Refresh Token**: token de mayor vida para renovar access token.
- **Rotation**: invalidación del refresh anterior al emitir uno nuevo.
- **TOTP**: código temporal para segundo factor.
- **Cache-Aside**: patrón de lectura con consulta previa a caché.
- **Idempotencia**: múltiples llamadas equivalentes sin efectos duplicados.
- **SLO**: objetivo de nivel de servicio.
- **SLI**: indicador medible para evaluar el SLO.

---

## Cierre

Si estudias este libro como un check de tareas, mejorarás poco.
Si lo estudias como entrenamiento de criterio, pasarás de ejecutar tickets a diseñar sistemas.

Siguiente paso sugerido: usar este libro junto con backend/docs/backend-howto.md para convertir cada capítulo en una iteración real del código (teoría + entrega).

---

## Apéndice C — Manual de Estudio Medible

| Semana | Capítulos | Objetivo medible | Lectura (min) | Laboratorio (min) | Prerrequisitos | Entregable | Criterio de aprobación |
|---|---|---|---:|---:|---|---|---|
| S1 | 0–3 | Entender arquitectura y pipeline HTTP completo en CineVault. | 240 | 420 | Entorno local funcionando | Mapa de arquitectura + checklist de configuración | Cubre 100% del flujo request→response y variables críticas validadas |
| S2 | 4–7 | Diseñar base de seguridad/auth con threat model y rotación de sesiones. | 240 | 450 | S1 aprobada | Threat model + diagrama auth + política refresh | Riesgos priorizados con mitigación y revocación validada |
| S3 | 8–11 | Formalizar RBAC, fronteras de dominio y persistencia estable. | 240 | 450 | S2 aprobada | Matriz RBAC + propuesta de índices + invariantes | Cobertura de endpoints críticos y mejora de consulta justificada |
| S4 | 12–15 | Separar capas correctamente y definir errores/caché coherentes. | 240 | 480 | S3 aprobada | Refactor por capas + taxonomía de errores + plan invalidación | Sin lógica HTTP en services y sin stale crítico en lecturas clave |
| S5 | 16–19 | Robustecer rendimiento e integraciones externas (TMDB/Stripe/Cloudinary). | 240 | 480 | S4 aprobada | Benchmark + anti-corruption layer + webhook idempotente | Mejora p95 medible y flujo de pago consistente por webhook |
| S6 | 20–23 | Garantizar consistencia en dominios sociales y moderación. | 240 | 450 | S5 aprobada | Matriz de invariantes sociales + política de moderación | 0 violaciones críticas de ownership/duplicidad en pruebas |
| S7 | 24–27 | Establecer baseline operacional (testing, observabilidad, incidentes). | 240 | 510 | S6 aprobada | Estrategia de tests + SLI/SLO + runbook | Cobertura de rutas críticas y runbook validado en simulación |
| S8 | 28–29 | Consolidar gobierno de API y roadmap tech lead trimestral. | 180 | 420 | S7 aprobada | Política OpenAPI + roadmap 90 días | Sin drift crítico API/contrato y roadmap con métricas de éxito |

---

## Apéndice D — Manual Detallado por Capítulo (0–29)

| Capítulo | Semana | Objetivo medible | Lectura (min) | Laboratorio (min) | Entregable | Criterio de aprobación |
|---|---|---|---:|---:|---|---|
| 0 | S1 | Definir sistema personal de estudio y evaluación. | 35 | 45 | Plan de estudio 8 semanas | Incluye calendario, métricas y ritual semanal |
| 1 | S1 | Inventariar y clasificar configuración crítica del backend. | 55 | 75 | Matriz de variables | 100% de vars críticas con validación fail-fast |
| 2 | S1 | Separar DTOs de entrada, dominio y salida en Auth. | 55 | 85 | Refactor tipado de endpoint | Sin `any` ni casts inseguros en el flujo |
| 3 | S1 | Mapear pipeline request→response en Express. | 50 | 80 | Diagrama de flujo técnico | Responsabilidades por capa sin solape |
| 4 | S2 | Redactar ADR con trade-offs verificables. | 45 | 75 | ADR spec-first vs code-first | Incluye contexto, opciones y consecuencias |
| 5 | S2 | Construir threat model de Auth/Reviews. | 55 | 90 | Matriz de amenazas priorizada | ≥8 amenazas con mitigación concreta |
| 6 | S2 | Validar registro/verificación/login seguro. | 55 | 90 | Checklist Auth I | Sin fuga de existencia de cuenta ni tokens |
| 7 | S2 | Diseñar refresh rotation y revocación operativa. | 50 | 90 | Diagrama de sesiones | Detecta reuso y revoca sesiones correctamente |
| 8 | S3 | Diseñar onboarding y recovery de 2FA. | 45 | 85 | Especificación 2FA | Activación + recuperación sin lockout injusto |
| 9 | S3 | Formalizar RBAC y planes comerciales. | 50 | 85 | Matriz endpoint×permiso×plan | Cobertura de endpoints críticos al 100% |
| 10 | S3 | Delimitar fronteras de dominio sanas. | 50 | 85 | Mapa de dominios y contratos | Sin dependencias circulares críticas |
| 11 | S3 | Optimizar consulta Prisma con índice razonado. | 55 | 95 | Propuesta de optimización | Mejora de latencia justificada y estable |
| 12 | S4 | Verificar patrón repository/service/controller. | 50 | 85 | Auditoría de capas | Lógica de negocio fuera de controller/repo |
| 13 | S4 | Definir taxonomía de errores de dominio/técnicos. | 45 | 75 | Matriz de errores por endpoint | Códigos HTTP coherentes y consistentes |
| 14 | S4 | Diseñar claves Redis por contexto y variante. | 50 | 85 | Catálogo de keys/TTL | Naming consistente y sin colisiones |
| 15 | S4 | Diseñar invalidación por evento de escritura. | 55 | 95 | Mapa de invalidación | Sin stale crítico en lecturas derivadas |
| 16 | S5 | Ejecutar ciclo medir→optimizar→remedir. | 45 | 95 | Benchmark antes/después | Evidencia de mejora p95 en endpoint crítico |
| 17 | S5 | Definir anti-corruption layer para TMDB. | 50 | 85 | Contrato interno de integración | No expone shape externo al dominio |
| 18 | S5 | Diseñar pagos idempotentes por webhook Stripe. | 55 | 95 | Diagrama de estados de pago | Firma + deduplicación + reconciliación |
| 19 | S5 | Establecer ciclo de vida de assets en Cloudinary. | 45 | 75 | Política de assets | Reglas de reemplazo/borrado operables |
| 20 | S6 | Diseñar emails transaccionales seguros. | 45 | 70 | Guía de plantillas y expiración | Sin secretos en logs ni enlaces débiles |
| 21 | S6 | Definir ownership y visibilidad social graph. | 50 | 85 | Matriz de ownership | Reglas claras para lectura/edición |
| 22 | S6 | Formalizar invariantes Diary/Watchlist/Favorites. | 50 | 90 | Suite de invariantes | 0 duplicidad/ownership roto en pruebas |
| 23 | S6 | Diseñar moderación trazable de reviews/comments. | 50 | 90 | Protocolo de reportes | Anti-spam y auditoría mínima definidos |
| 24 | S7 | Diseñar entrega híbrida de notificaciones. | 50 | 90 | Flujo online/offline + replay | Entrega pendiente sin pérdida de eventos |
| 25 | S7 | Priorizar estrategia de testing por riesgo. | 50 | 90 | Plan de pruebas por dominio | Cobertura de journeys críticos definida |
| 26 | S7 | Definir SLI/SLO y alertas accionables. | 55 | 85 | Matriz de observabilidad | Incluye latencia/error/cache hit-miss |
| 27 | S7 | Crear runbook ejecutable para incidentes. | 45 | 85 | Runbook de incidente | Secuencia completa detección→postmortem |
| 28 | S8 | Gobernar OpenAPI como contrato vivo. | 50 | 90 | Política API + control de drift | Rutas críticas alineadas con spec |
| 29 | S8 | Sintetizar roadmap Tech Lead trimestral. | 50 | 110 | Roadmap técnico de 90 días | Objetivos medibles, riesgos y dependencias |

---

## Apéndice E — Ejecución y seguimiento real

Para convertir este libro en progreso verificable, usa estos archivos:

- Plantilla reusable: `backend/docs/plans/2026-03-05-study-tracker-template.md`
- Tablero inicial (Josue): `backend/docs/plans/2026-03-05-study-tracker-josue.md`

Regla operativa:
1. No avanzar de semana sin evidencia en entregables.
2. Si el score final semanal < 85, entra en modo `refuerzo`.
3. Cada semana debe registrar al menos 1 trade-off técnico y 1 deuda detectada.

---

## Apéndice F — Playbook de ejecución diaria

Archivo recomendado de operación:

- `backend/docs/plans/2026-03-05-study-playbook.md`

Uso sugerido:
1. Abrir playbook al iniciar sesión de estudio.
2. Ejecutar ritual diario (lectura + laboratorio + evidencia).
3. Cerrar semana con score y estado (`aprobada` o `refuerzo`).
