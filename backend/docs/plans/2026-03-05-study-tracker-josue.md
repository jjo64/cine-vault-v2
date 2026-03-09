# Seguimiento de Estudio — Josue (CineVault Backend)

## Estado global
- Alumno: Josue
- Semana actual: S1
- Fecha inicio: 2026-03-05
- Fecha fin estimada: 2026-04-30
- Objetivo macro (8 semanas): completar capítulos 0–29 con entregables auditables y criterio Senior/Tech Lead
- Estado general: `on-track`

## Semáforo
- Arquitectura/TS: `amarillo`
- Seguridad/Auth: `amarillo`
- Dominio/DB: `amarillo`
- Redis/Performance: `amarillo`
- Integraciones externas: `amarillo`
- Testing/Observabilidad: `amarillo`
- API Governance/Tech Lead: `amarillo`

---

## Semana S1 (Capítulos 0–3)
### 1) Plan semanal
- Objetivo: dominar pipeline HTTP y contrato de configuración en backend real
- Horas planificadas: 11
- Riesgo principal: avanzar en lectura sin producir evidencia técnica
- Mitigación: cerrar cada capítulo con entregable concreto en docs/plans

### 2) Tabla de ejecución
| Capítulo | Objetivo medible | Lectura (real min) | Lab (real min) | Entregable | Evidencia | Estado |
|---|---|---:|---:|---|---|---|
| 0 | Definir sistema de estudio y evaluación semanal | 35 | 45 | Plan 8 semanas | backend/docs/backend-study-plan.md (Apéndice C/D) | done |
| 1 | Inventariar variables críticas y fail-fast | 0 | 0 | Matriz de variables | pendiente | partial |
| 2 | Separar DTO input/domain/output | 0 | 0 | Refactor 1 endpoint | pendiente | partial |
| 3 | Mapear pipeline request→response | 0 | 0 | Diagrama técnico | pendiente | partial |

### 3) Evaluación semanal
- Score teórico (0-100): 70
- Score práctico (0-100): 35
- Score operacional (0-100): 40
- Score final (promedio): 48
- Estado de semana: `refuerzo`

### 4) Hallazgos senior
- Trade-off 1: más seguridad (refresh rotation/2FA) aumenta complejidad operativa
- Trade-off 2: más caché reduce latencia pero incrementa costo de consistencia
- Error de diseño detectado: gap entre teoría y evidencia práctica semanal
- Decisión técnica tomada: usar tablero obligatorio con evidencia por capítulo

### 5) Deuda técnica detectada
| Deuda | Impacto | Urgencia | Acción sugerida | Due date |
|---|---|---|---|---|
| Falta de evidencia para capítulos 1–3 | Alta | Alta | completar entregables antes de pasar a S2 | 2026-03-10 |
| Sin benchmark base de endpoint crítico | Media | Media | definir endpoint y baseline en S4 | 2026-03-20 |

### 6) Plan de la siguiente semana
- Capítulos: S1 (refuerzo), luego S2
- Entregable esperado: mapa de arquitectura + ADR + threat model
- Bloqueadores abiertos: ninguno

---

## Plan diario prearmado (S2–S8)

### Semana S2 (Capítulos 4–7) — Seguridad y Auth
- Lunes: Cap.4 (ADR) + borrador de decisión OpenAPI.
- Martes: Cap.5 (threat model) + tabla de riesgos Auth/Reviews.
- Miércoles: Cap.6 (registro/login) + checklist de no-leak.
- Jueves: Cap.7 (refresh/session) + diagrama de revocación.
- Viernes: integración y revisión cruzada contra `openapi.yaml`.
- Sábado: laboratorio de incidente (refresh comprometido).
- Domingo: evaluación semanal + deuda técnica + plan S3.

**Definition of Done S2**
- ADR aprobado, threat model con prioridades y protocolo de revocación validado.

### Semana S3 (Capítulos 8–11) — 2FA, RBAC y Persistencia
- Lunes: Cap.8 (2FA/recovery) + flujo completo.
- Martes: Cap.9 (RBAC + planes) + matriz endpoint×permiso×plan.
- Miércoles: Cap.10 (fronteras de dominio) + mapa de dependencias.
- Jueves: Cap.11 (Prisma/índices) + propuesta de optimización.
- Viernes: revisión de consistencia dominio/DB.
- Sábado: mini-lab de paginación e índice.
- Domingo: evaluación semanal y plan S4.

**Definition of Done S3**
- Matriz RBAC completa, fronteras claras y optimización de consulta justificada.

### Semana S4 (Capítulos 12–15) — Capas, Errores, Redis
- Lunes: Cap.12 + auditoría repository/service/controller.
- Martes: Cap.13 + taxonomía de errores por endpoint.
- Miércoles: Cap.14 + catálogo de claves Redis/TTL.
- Jueves: Cap.15 + mapa de invalidación por escritura.
- Viernes: validación end-to-end de consistencia cache.
- Sábado: benchmark básico de lectura cacheada.
- Domingo: evaluación semanal y plan S5.

**Definition of Done S4**
- Arquitectura por capas sin mezcla + invalidación sin stale crítico.

### Semana S5 (Capítulos 16–19) — Performance e Integraciones
- Lunes: Cap.16 + baseline p95/p99.
- Martes: Cap.17 + anti-corruption layer TMDB.
- Miércoles: Cap.18 + flujo idempotente Stripe webhook.
- Jueves: Cap.19 + política lifecycle de assets.
- Viernes: pruebas de resiliencia (timeouts/retry).
- Sábado: consolidación de documento de integración robusta.
- Domingo: evaluación semanal y plan S6.

**Definition of Done S5**
- Mejora medible de rendimiento y contratos externos robustos documentados.

### Semana S6 (Capítulos 20–23) — Dominios sociales
- Lunes: Cap.20 + políticas de email seguro.
- Martes: Cap.21 + ownership y visibilidad.
- Miércoles: Cap.22 + invariantes Diary/Watchlist/Favorites.
- Jueves: Cap.23 + moderación/reportes y auditoría.
- Viernes: casos límite y concurrencia.
- Sábado: hardening de reglas de negocio.
- Domingo: evaluación semanal y plan S7.

**Definition of Done S6**
- Reglas sociales consistentes, auditables y sin huecos críticos.

### Semana S7 (Capítulos 24–27) — Operación y confiabilidad
- Lunes: Cap.24 + diseño online/offline de notificaciones.
- Martes: Cap.25 + plan de testing por riesgo.
- Miércoles: Cap.26 + matriz SLI/SLO.
- Jueves: Cap.27 + runbook de incidente.
- Viernes: simulacro de incidente.
- Sábado: ajuste de alertas y runbook.
- Domingo: evaluación semanal y plan S8.

**Definition of Done S7**
- Baseline operacional activa: pruebas, métricas y runbook ejecutable.

### Semana S8 (Capítulos 28–29) — Gobierno API y Roadmap
- Lunes: Cap.28 + política OpenAPI (drift/breaking changes).
- Martes: auditoría rutas vs contrato.
- Miércoles: Cap.29 + borrador roadmap 90 días.
- Jueves: priorización por impacto/riesgo/esfuerzo.
- Viernes: revisión final tipo Tech Lead.
- Sábado: cierre de deuda técnica detectada.
- Domingo: evaluación final + dossier de aprendizaje.

**Definition of Done S8**
- Contrato API gobernado y roadmap trimestral aprobado.
