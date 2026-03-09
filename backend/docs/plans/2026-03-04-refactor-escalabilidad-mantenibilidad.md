# CineVault Backend — Plan de Refactor: Escalabilidad y Mantenibilidad

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Llevar el backend de CineVault a una arquitectura completamente uniforme (Repository + Service + DTO/Zod) que sea fácil de escalar, testear y mantener a lo largo del TFG y más allá.

**Architecture:** Capa de Repositorios para toda la persistencia, capa de Servicios para toda la lógica de negocio, validación Zod en punto de entrada de cada ruta. Controladores delgados que sólo orquestan Request→Service→Response.

**Tech Stack:** Node.js · TypeScript · Express 5 · Prisma ORM v7 · Zod · Vitest · MariaDB · Redis · Socket.IO

---

## Refactor Plan: Arquitectura uniforme Controller → Service → Repository + Zod DTOs

### Estado Actual

| Módulo | Problema detectado |
|---|---|
| `ReviewsController.ts` | Importa `prisma` directamente, sin Service ni Repository |
| `DiaryController.ts` | `try/catch` manual con `console.error` + `res.status(500)` en lugar del manejador global |
| `WatchlistController.ts` | Igual que Diary; lógica de negocio mezclada con HTTP response |
| `NotificationsController.ts` | `emitirNotificacion` (lógica de negocio) exportada desde un Controller |
| `FavoritiesController.ts` | Acceso directo a Prisma sin servicio |
| `PaymentsController.ts` | Revisar si delega correctamente (probablemente mezclado) |
| `SettingsController.ts` | Sin validación Zod de entradas |
| `schemas/` | Solo existe `user.ts`; el resto de controladores leen `req.body` sin parsear |
| `services/` | Solo `auth`, `security`, `user` — faltan para reviews, diary, watchlist, etc. |
| `repositories/` | Solo `User`, `AuthToken`, `Session` — faltan para el resto de entidades |
| Tests | Solo 2 archivos de test para un proyecto con 11 controladores |
| Naming | Mezcla de español/inglés en exports (e.g. `createDiary` vs `getReviews`) |

### Estado Destino

```
Request → Route → [Zod Middleware] → Controller → Service → Repository → Prisma
                                         ↓
                              AppErrors → manejadorErrores global
```

- **Controladores**: únicamente extraen datos validados y llaman al servicio.
- **Servicios**: contienen lógica de negocio, lanzan `AppErrors`.
- **Repositorios**: todas las queries de Prisma encapsuladas con interfaces.
- **Schemas**: un archivo Zod por recurso en `src/schemas/`.
- **Tests**: al menos un test de integración por servicio (con Vitest + mock del repositorio).

---

### Archivos Afectados

| Archivo | Tipo de Cambio | Depende de | Bloquea a |
|---|---|---|---|
| `src/schemas/reviews.ts` | Crear | — | ReviewsController, ReviewsService |
| `src/schemas/diary.ts` | Crear | — | DiaryController, DiaryService |
| `src/schemas/watchlist.ts` | Crear | — | WatchlistController, WatchlistService |
| `src/schemas/notifications.ts` | Crear | — | NotificationsService |
| `src/schemas/favorites.ts` | Crear | — | FavoritiesController, FavoritiesService |
| `src/schemas/settings.ts` | Crear | — | SettingsController, SettingsService |
| `src/repositories/ReviewsRepository.ts` | Crear | Prisma | ReviewsService |
| `src/repositories/DiaryRepository.ts` | Crear | Prisma | DiaryService |
| `src/repositories/WatchlistRepository.ts` | Crear | Prisma | WatchlistService |
| `src/repositories/NotificationsRepository.ts` | Crear | Prisma | NotificationsService |
| `src/repositories/FavoritiesRepository.ts` | Crear | Prisma | FavoritiesService |
| `src/repositories/PaymentsRepository.ts` | Crear | Prisma | PaymentsService |
| `src/repositories/SettingsRepository.ts` | Crear | Prisma | SettingsService |
| `src/services/reviews.services.ts` | Crear | ReviewsRepository, AppErrors | ReviewsController |
| `src/services/diary.services.ts` | Crear | DiaryRepository, AppErrors | DiaryController |
| `src/services/watchlist.services.ts` | Crear | WatchlistRepository, AppErrors | WatchlistController |
| `src/services/notifications.services.ts` | Crear / Extraer de Controller | NotificationsRepository, Socket.IO | NotificationsController |
| `src/services/favorites.services.ts` | Crear | FavoritiesRepository, AppErrors | FavoritiesController |
| `src/services/payments.services.ts` | Crear/Revisar | PaymentsRepository, Stripe | PaymentsController |
| `src/services/settings.services.ts` | Crear | SettingsRepository, AppErrors | SettingsController |
| `src/controllers/ReviewsController.ts` | Modificar | ReviewsService | — |
| `src/controllers/DiaryController.ts` | Modificar | DiaryService | — |
| `src/controllers/WatchlistController.ts` | Modificar | WatchlistService | — |
| `src/controllers/NotificationsController.ts` | Modificar (extraer helper) | NotificationsService | — |
| `src/controllers/FavoritiesController.ts` | Modificar | FavoritiesService | — |
| `src/controllers/PaymentsController.ts` | Revisar / Modificar | PaymentsService | — |
| `src/controllers/SettingsController.ts` | Modificar | SettingsService | — |
| `src/middlewares/validation.middleware.ts` | Crear | Zod | Todas las rutas |
| `src/routes/*.routes.ts` | Modificar (agregar middleware Zod) | validation.middleware | — |
| `src/tests/*.test.ts` | Crear (uno por servicio) | Vitest | — |

---

## Plan de Ejecución

### Fase 0: Preparación del entorno (no tocar código de producción aún)

- [ ] **0.1** Crear rama git de trabajo: `git checkout -b refactor/arquitectura-uniforme`
- [ ] **0.2** Verificar que el proyecto compila sin errores: `npm run build`
- [ ] **0.3** Ejecutar tests existentes y anotar estado base: `npm test`
- [ ] **0.4** Commit de baseline: `git commit -m "chore: baseline pre-refactor"`

---

### Fase 1: Tipos, Interfaces y Schemas Zod

> **Principio:** Tipos primero. Todo lo que se crea en fases siguientes depende de estos contratos.

#### Tarea 1: Middleware de validación Zod reutilizable

**Archivos:**
- Crear: `src/middlewares/validation.middleware.ts`

**Paso 1: Escribir el test**

```typescript
// src/tests/validation.middleware.test.ts
import { describe, it, expect, vi } from 'vitest'
import { validarBody } from '../middlewares/validation.middleware.js'
import { z } from 'zod'

describe('validarBody middleware', () => {
  it('pasa al siguiente cuando el body es válido', () => {
    const schema = z.object({ name: z.string() })
    const req = { body: { name: 'test' } } as any
    const res = {} as any
    const next = vi.fn()
    validarBody(schema)(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('lanza ValidationError cuando el body es inválido', () => {
    const schema = z.object({ name: z.string() })
    const req = { body: {} } as any
    const res = {} as any
    const next = vi.fn()
    expect(() => validarBody(schema)(req, res, next)).toThrow()
  })
})
```

**Paso 2:** Ejecutar test: `npm test -- validation.middleware`
Esperado: FAIL — `validarBody` no existe aún.

**Paso 3: Implementar**

```typescript
// src/middlewares/validation.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { ValidationError } from '../errors/AppErrors.js'

export const validarBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join('; ')
      throw new ValidationError(messages)
    }
    req.body = result.data
    next()
  }

export const validarQuery =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join('; ')
      throw new ValidationError(messages)
    }
    req.query = result.data as any
    next()
  }
```

**Paso 4:** Ejecutar test: `npm test -- validation.middleware`
Esperado: PASS

**Paso 5:** `git commit -m "feat: add Zod validation middleware"`

---

#### Tarea 2: Schemas Zod para Reviews, Diary, Watchlist, Favorites, Settings

**Archivos:**
- Crear: `src/schemas/reviews.ts`
- Crear: `src/schemas/diary.ts`
- Crear: `src/schemas/watchlist.ts`
- Crear: `src/schemas/favorites.ts`
- Crear: `src/schemas/settings.ts`

**Paso 1: Implementar `src/schemas/reviews.ts`**

```typescript
import { z } from 'zod'

export const crearResenaSchema = z.object({
  movie_id: z.number({ coerce: true }).int().positive(),
  content: z.string().min(1, 'El contenido no puede estar vacío').max(2000),
  rating: z.number({ coerce: true }).min(0).max(10),
})

export const actualizarResenaSchema = crearResenaSchema.partial().omit({ movie_id: true })

export type CrearResenaDTO = z.infer<typeof crearResenaSchema>
export type ActualizarResenaDTO = z.infer<typeof actualizarResenaSchema>
```

**Paso 2: Implementar `src/schemas/diary.ts`**

```typescript
import { z } from 'zod'

export const crearEntradaDiarioSchema = z.object({
  movie_id: z.number({ coerce: true }).int().positive(),
  watched_at: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
})

export type CrearEntradaDiarioDTO = z.infer<typeof crearEntradaDiarioSchema>
```

**Paso 3: Implementar `src/schemas/watchlist.ts`**

```typescript
import { z } from 'zod'

export const agregarWatchlistSchema = z.object({
  movie_id: z.number({ coerce: true }).int().positive(),
})

export type AgregarWatchlistDTO = z.infer<typeof agregarWatchlistSchema>
```

**Paso 4:** Implementar schemas similares para `favorites.ts` y `settings.ts` siguiendo el mismo patrón.

**Paso 5:** `git commit -m "feat: add Zod schemas for all resources"`

---

### Fase 2: Repositorios

> **Principio:** Cada repositorio implementa una interfaz. Esto permite mockear en tests sin tocar Prisma.

#### Tarea 3: ReviewsRepository

**Archivos:**
- Crear: `src/repositories/ReviewsRepository.ts`

**Paso 1: Escribir el test (con mock)**

```typescript
// src/tests/reviews.repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    reviews: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { reviewsRepository } from '../repositories/ReviewsRepository.js'
import { prisma } from '../lib/prisma.js'

describe('ReviewsRepository', () => {
  it('findByUserId llama a findMany con el user_id correcto', async () => {
    vi.mocked(prisma.reviews.findMany).mockResolvedValue([])
    await reviewsRepository.findByUserId(1)
    expect(prisma.reviews.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 1 } })
    )
  })
})
```

**Paso 2:** Ejecutar: `npm test -- reviews.repository`
Esperado: FAIL

**Paso 3: Implementar `ReviewsRepository`**

```typescript
// src/repositories/ReviewsRepository.ts
import { reviews, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { CrearResenaDTO } from '../schemas/reviews.js'

export interface IReviewsRepository {
  findByUserId(userId: number): Promise<reviews[]>
  findByMovieId(movieId: number): Promise<reviews[]>
  findById(id: number): Promise<reviews | null>
  create(userId: number, data: CrearResenaDTO): Promise<reviews>
  update(id: number, data: Partial<CrearResenaDTO>): Promise<reviews>
  delete(id: number): Promise<void>
  addLike(reviewId: number): Promise<reviews>
}

export class ReviewsRepository implements IReviewsRepository {
  async findByUserId(userId: number) {
    return prisma.reviews.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    })
  }

  async findByMovieId(movieId: number) {
    return prisma.reviews.findMany({
      where: { movie_id: movieId },
      orderBy: { created_at: 'desc' },
    })
  }

  async findById(id: number) {
    return prisma.reviews.findUnique({ where: { id } })
  }

  async create(userId: number, data: CrearResenaDTO) {
    return prisma.reviews.create({
      data: { user_id: userId, ...data },
    })
  }

  async update(id: number, data: Partial<CrearResenaDTO>) {
    return prisma.reviews.update({ where: { id }, data })
  }

  async delete(id: number) {
    await prisma.reviews.delete({ where: { id } })
  }

  async addLike(reviewId: number) {
    return prisma.reviews.update({
      where: { id: reviewId },
      data: { likes: { increment: 1 } },
    })
  }
}

export const reviewsRepository = new ReviewsRepository()
```

**Paso 4:** Ejecutar: `npm test -- reviews.repository`
Esperado: PASS

**Paso 5:** `git commit -m "feat: add ReviewsRepository"`

---

#### Tarea 4: DiaryRepository, WatchlistRepository, FavoritiesRepository, NotificationsRepository, SettingsRepository

Seguir el mismo patrón (interfaz → implementación → test con mock) para cada uno.  
Archivos a crear:
- `src/repositories/DiaryRepository.ts`
- `src/repositories/WatchlistRepository.ts`
- `src/repositories/FavoritiesRepository.ts`
- `src/repositories/NotificationsRepository.ts`
- `src/repositories/SettingsRepository.ts`

**Commit por cada repositorio:** `git commit -m "feat: add <Nombre>Repository"`

---

### Fase 3: Servicios

> **Principio:** Los servicios usan repositorios inyectados (o singletons). Lanzan `AppErrors`. Sin acceso directo a Prisma.

#### Tarea 5: ReviewsService

**Archivos:**
- Crear: `src/services/reviews.services.ts`

**Paso 1: Escribir el test**

```typescript
// src/tests/reviews.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reviewsRepository } from '../repositories/ReviewsRepository.js'
import { crearResenaService, eliminarResenaService } from '../services/reviews.services.js'
import { ForbiddenError, NotFoundError } from '../errors/AppErrors.js'

vi.mock('../repositories/ReviewsRepository.js', () => ({
  reviewsRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('crearResenaService', () => {
  it('crea una reseña si los datos son válidos', async () => {
    vi.mocked(reviewsRepository.create).mockResolvedValue({ id: 1 } as any)
    const result = await crearResenaService(1, { movie_id: 123, content: 'Buena', rating: 8 })
    expect(result).toEqual({ id: 1 })
  })
})

describe('eliminarResenaService', () => {
  it('lanza NotFoundError si la reseña no existe', async () => {
    vi.mocked(reviewsRepository.findById).mockResolvedValue(null)
    await expect(eliminarResenaService(1, 99)).rejects.toThrow(NotFoundError)
  })

  it('lanza ForbiddenError si el usuario no es propietario', async () => {
    vi.mocked(reviewsRepository.findById).mockResolvedValue({ id: 1, user_id: 5 } as any)
    await expect(eliminarResenaService(2, 1)).rejects.toThrow(ForbiddenError)
  })
})
```

**Paso 2:** Ejecutar: `npm test -- reviews.service`
Esperado: FAIL

**Paso 3: Implementar**

```typescript
// src/services/reviews.services.ts
import { reviewsRepository } from '../repositories/ReviewsRepository.js'
import { NotFoundError, ForbiddenError } from '../errors/AppErrors.js'
import { CrearResenaDTO, ActualizarResenaDTO } from '../schemas/reviews.js'

export const obtenerResenasPorUsuarioService = (userId: number) =>
  reviewsRepository.findByUserId(userId)

export const crearResenaService = (userId: number, data: CrearResenaDTO) =>
  reviewsRepository.create(userId, data)

export const eliminarResenaService = async (userId: number, reviewId: number) => {
  const resena = await reviewsRepository.findById(reviewId)
  if (!resena) throw new NotFoundError('Reseña no encontrada')
  if (resena.user_id !== userId) throw new ForbiddenError('No puedes eliminar esta reseña')
  await reviewsRepository.delete(reviewId)
}

export const actualizarResenaService = async (
  userId: number,
  reviewId: number,
  data: ActualizarResenaDTO
) => {
  const resena = await reviewsRepository.findById(reviewId)
  if (!resena) throw new NotFoundError('Reseña no encontrada')
  if (resena.user_id !== userId) throw new ForbiddenError('No puedes editar esta reseña')
  return reviewsRepository.update(reviewId, data)
}
```

**Paso 4:** Ejecutar: `npm test -- reviews.service`
Esperado: PASS

**Paso 5:** `git commit -m "feat: add reviews.services.ts with unit tests"`

---

#### Tarea 6: NotificationsService (extraer `emitirNotificacion`)

`emitirNotificacion` actualmente vive en `NotificationsController.ts` pero es lógica de negocio.

**Pas 1: Crear `src/services/notifications.services.ts`**

```typescript
// src/services/notifications.services.ts
import { notificationsRepository } from '../repositories/NotificationsRepository.js'
import { io, usuariosConectados } from '../config/socketio.config.js'

export const emitirNotificacionService = async ({
  user_id,
  sender_id,
  type,
}: {
  user_id: number
  sender_id: number
  type: 'follow' | 'like' | 'comment' | 'report_resolved'
}) => {
  const notificacion = await notificationsRepository.create({ user_id, sender_id, type })
  const socketId = usuariosConectados.get(user_id)
  if (socketId) {
    io.to(socketId).emit('nueva_notificacion', notificacion)
  }
  return notificacion
}

export const obtenerNotificacionesService = (userId: number) =>
  notificationsRepository.findByUserId(userId)

export const marcarNotificacionLeidaService = async (userId: number, notifId: number) => {
  return notificationsRepository.markAsRead(notifId, userId)
}
```

**Paso 2:** Actualizar importaciones en `ReviewsController.ts` de `emitirNotificacion` → `emitirNotificacionService` desde `../services/notifications.services.js`.

**Paso 3:** `git commit -m "feat: extract emitirNotificacion to notifications.services.ts"`

---

#### Tarea 7: DiaryService, WatchlistService, FavoritiesService, SettingsService

Mismo patrón (test → implementación → commit) para cada servicio faltante.

---

### Fase 4: Refactor de Controladores

> **Principio:** Controlador delgado. Solo: extraer datos → llamar servicio → return res.

#### Tarea 8: Refactor `ReviewsController.ts`

**Antes:**
```typescript
// ReviewsController.ts — mezclado con Prisma
import { prisma } from "../lib/prisma.js"
export const getReviews = async (req, res) => {
  const reviews = await prisma.reviews.findMany({ where: { user_id: req.user!.user_id } })
  res.status(200).json(reviews)
}
```

**Después:**
```typescript
// ReviewsController.ts — delegando al servicio
import * as reviewsService from '../services/reviews.services.js'

export const getReviews = async (req: Request, res: Response) => {
  const resenas = await reviewsService.obtenerResenasPorUsuarioService(req.user!.user_id)
  res.json(resenas)
}

export const addReview = async (req: Request, res: Response) => {
  const resena = await reviewsService.crearResenaService(req.user!.user_id, req.body)
  res.status(201).json(resena)
}
```

**Verificar:** `npm run build` → sin errores TypeScript.
`git commit -m "refactor: ReviewsController delegates to service"`

---

#### Tarea 9: Refactor `DiaryController.ts` — eliminar try/catch manuales

**Antes:**
```typescript
export const createDiary = async (req, res) => {
  try {
    // ...
  } catch (error) {
    console.error("Error createDiary:", error)
    res.status(500).json({ error: "Error al crear la entrada" })
  }
}
```

**Después:**
```typescript
// Sin try/catch — el manejadorErrores global ya los maneja
export const createDiary = async (req: Request, res: Response) => {
  const entry = await diaryService.crearEntradaDiarioService(req.user!.user_id, req.body)
  res.status(201).json(entry)
}
```

**Verificar:** `npm run build` → sin errores.
`git commit -m "refactor: DiaryController removes manual try/catch"`

---

#### Tarea 10: Refactor `WatchlistController.ts`, `FavoritiesController.ts`, `NotificationsController.ts`, `SettingsController.ts`

Mismo patrón para cada uno. Un commit por controlador.

---

### Fase 5: Conectar Zod a las Rutas

#### Tarea 11: Agregar middleware de validación a rutas

**Ejemplo en `src/routes/reviews.routes.ts`:**

```typescript
import { validarBody } from '../middlewares/validation.middleware.js'
import { crearResenaSchema, actualizarResenaSchema } from '../schemas/reviews.js'
import { middlewareAutenticacion } from '../middlewares/auth.middlewares.js'
import * as reviewsController from '../controllers/ReviewsController.js'
import { Router } from 'express'

const router = Router()

router.get('/', middlewareAutenticacion, reviewsController.getReviews)
router.post(
  '/',
  middlewareAutenticacion,
  validarBody(crearResenaSchema),   // ← Zod valida antes de llegar al controller
  reviewsController.addReview
)
router.patch(
  '/:reviewId',
  middlewareAutenticacion,
  validarBody(actualizarResenaSchema),
  reviewsController.updateReview
)
router.delete('/:reviewId', middlewareAutenticacion, reviewsController.removeReview)

export default router
```

**Repetir para rutas de:** `diary`, `watchlist`, `favorities`, `settings`.
`git commit -m "feat: add Zod validation to all routes"`

---

### Fase 6: Naming y Consistencia

#### Tarea 12: Unificar convención de naming

El ADR de la empresa y las rutas usan español. Mantener **español para funciones de negocio**, **inglés solo para interfaces públicas de SDK/API HTTP** (que ya están en las rutas).

| Archivo | Cambio |
|---|---|
| `NotificationsController.ts` | Renombrar exports en inglés→español si corresponde |
| `ReviewsController.ts` | Revisar que coincida con la ruta definida |

`git commit -m "style: unify naming conventions across controllers"`

---

### Fase 7: Tests de Integración

#### Tarea 13: Tests de servicios faltantes

**Archivos a crear:**
- `src/tests/diary.service.test.ts`
- `src/tests/watchlist.service.test.ts`
- `src/tests/notifications.service.test.ts`
- `src/tests/favorites.service.test.ts`

Seguir el mismo patrón de la Tarea 5 (mock del repositorio en Vitest).

**Ejecutar suite completa:** `npm test`
Esperado: todos en verde.

`git commit -m "test: add unit tests for all services"`

---

### Fase 8: Cleanup y Documentación

#### Tarea 14: Eliminar código deprecado y comentarios obsoletos

- Eliminar todos los `console.error` de controladores (el global handler logea).
- Eliminar `try/catch` que capturen y silencien errores de red (cualquier `res.status(500)` manual).
- Eliminar comentarios como `// Tomamos el ID del usuario de la request` si el código habla por sí mismo.

#### Tarea 15: Actualizar ADR 0002 a estado "Aceptado"

Actualizar [docs/adr/0002-validacion-dtos-zod.md](../adr/0002-validacion-dtos-zod.md) — cambiar estado de `Propuesto` a `Aceptado` con fecha y referencia a los schemas creados.

#### Tarea 16: Crear ADR 0004 — Extracción de lógica a servicios

```markdown
# ADR 0004: Controladores delgados — sin acceso directo a Prisma

## Estado
Aceptado — 2026-03-04

## Contexto
DiaryController, WatchlistController, ReviewsController y NotificationsController
accedían directamente a Prisma y capturaban errores manualmente, duplicando el patrón
del manejadorErrores global.

## Decisión
Todos los controladores delegan la lógica al servicio correspondiente.
Ningún controlador importa `prisma` directamente.

## Consecuencias
+ Error handling centralizado y consistente.
+ Controllers testables con mocks simples.
- Más archivos, pero cada uno con responsabilidad única.
```

`git commit -m "docs: update ADRs 0002 and add ADR 0004"`

---

## Plan de Rollback

Si alguna fase falla y no compila:

1. `git stash` para guardar cambios en curso.
2. `git checkout main` para volver al estado estable.
3. Revisar el error con `npm run build` en la rama de refactor.
4. Arreglar el problema puntual y continuar.

Nunca mezclar más de 2 archivos de controller en un solo commit — facilita el revert específico.

---

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| `emitirNotificacion` exportada desde Controller y usada en otros controllers | Alta | Migrar todos los imports en el mismo commit |
| Cambio en tipos de retorno de Prisma al agregar `select` en Repository | Media | Usar `Prisma.ReviewsGetPayload<...>` como tipo de retorno |
| Tests existentes (`payments.test.ts`, `reviews.test.ts`) rotos por cambio de imports | Media | Actualizar mocks en la misma tarea de refactor del servicio |
| Socket.IO acoplado a `NotificationsController` | Media | El servicio recibe el `io` como parámetro o usa el singleton importado |

---

## Orden de Ejecución Recomendado

```
Fase 0 (branch + baseline)
  → Fase 1 (Schemas + Middleware Zod)
    → Fase 2 (Repositorios)
      → Fase 3 (Servicios)
        → Fase 4 (Refactor Controllers)
          → Fase 5 (Rutas con Zod)
            → Fase 6 (Naming)
              → Fase 7 (Tests)
                → Fase 8 (Cleanup + Docs)
```

Tiempo estimado: ~8–12 horas de trabajo efectivo (distribuibles entre sesiones del TFG).

---

## Quick Wins (puedes hacer YA, antes del refactor completo)

1. **Eliminar `try/catch` manuales en `DiaryController` y `WatchlistController`** — 15 min, impacto inmediato en consistencia de errores.
2. **Crear `validation.middleware.ts`** — 30 min, desbloquea todo lo de Zod.
3. **Extraer `emitirNotificacion` a `notifications.services.ts`** — 30 min, elimina acoplamiento cruzado entre controllers.
