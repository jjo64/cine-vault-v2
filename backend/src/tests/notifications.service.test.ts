import { describe, it, expect, vi, beforeEach } from "vitest"

/* ==========================================================================
   UNIT TESTS — notifications.services
   Se mockea NotificationsRepository y socketio.config para aislar la lógica.
   ========================================================================== */

const mockEmit = vi.fn()
const mockTo = vi.fn(() => ({ emit: mockEmit }))

const redisMock = vi.hoisted(() => ({
  lpush: vi.fn(),
  ltrim: vi.fn(),
  lrange: vi.fn(),
  del: vi.fn(),
}))

vi.mock("../config/socketio.config.js", () => ({
  io: { to: mockTo },
  usuariosConectados: new Map<number, string>([[1, "socket-id-123"]]),
}))

vi.mock("../lib/redis.js", () => ({
  redis: redisMock,
}))

vi.mock("../repositories/NotificationsRepository.js", () => ({
  notificationsRepository: {
    create: vi.fn(),
    findByUserId: vi.fn(),
    findById: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}))

const { notificationsRepository } =
  await import("../repositories/NotificationsRepository.js")
const {
  emitirNotificacionService,
  obtenerNotificacionesService,
  marcarComoLeidaService,
  marcarTodasComoLeidasService,
  entregarPendientesService,
} = await import("../services/notifications.services.js")

beforeEach(() => {
  vi.clearAllMocks()
})

describe("emitirNotificacionService", () => {
  it("persiste la notificación y emite via Socket.IO si el usuario está conectado", async () => {
    const notif = { id: 1, user_id: 1, type: "like", read: false } as any
    vi.mocked(notificationsRepository.create).mockResolvedValue(notif)

    await emitirNotificacionService({ user_id: 1, sender_id: 2, type: "like" })

    expect(notificationsRepository.create).toHaveBeenCalledWith({
      user_id: 1,
      sender_id: 2,
      type: "like",
    })
    expect(mockTo).toHaveBeenCalledWith("socket-id-123")
    expect(mockEmit).toHaveBeenCalledWith("nueva_notificacion", notif)
  })

  it("persiste la notificación sin emitir si el usuario no está conectado", async () => {
    const notif = { id: 2, user_id: 99, type: "comment", read: false } as any
    vi.mocked(notificationsRepository.create).mockResolvedValue(notif)

    await emitirNotificacionService({
      user_id: 99,
      sender_id: 2,
      type: "comment",
    })

    expect(notificationsRepository.create).toHaveBeenCalled()
    expect(mockTo).not.toHaveBeenCalled()
    expect(redisMock.lpush).toHaveBeenCalledWith(
      "notif:queue:99",
      JSON.stringify(notif)
    )
    expect(redisMock.ltrim).toHaveBeenCalledWith("notif:queue:99", 0, 49)
  })
})

describe("obtenerNotificacionesService", () => {
  it("devuelve las notificaciones del usuario", async () => {
    const notifs = [{ id: 1, user_id: 1, is_read: false }] as any
    vi.mocked(notificationsRepository.findByUserId).mockResolvedValue(notifs)

    const resultado = await obtenerNotificacionesService(1)
    expect(resultado).toEqual(notifs)
    expect(notificationsRepository.findByUserId).toHaveBeenCalledWith(1)
  })
})

describe("marcarComoLeidaService", () => {
  it("llama al repositorio con los parámetros correctos", async () => {
    vi.mocked(notificationsRepository.markAsRead).mockResolvedValue({} as any)
    await marcarComoLeidaService(1, 5)
    expect(notificationsRepository.markAsRead).toHaveBeenCalledWith(5, 1)
  })
})

describe("marcarTodasComoLeidasService", () => {
  it("llama al repositorio para marcar todas como leídas", async () => {
    vi.mocked(notificationsRepository.markAllAsRead).mockResolvedValue(3)
    await marcarTodasComoLeidasService(1)
    expect(notificationsRepository.markAllAsRead).toHaveBeenCalledWith(1)
  })
})

describe("entregarPendientesService", () => {
  it("devuelve la cola y la limpia", async () => {
    redisMock.lrange.mockResolvedValue([
      JSON.stringify({ id: 1 }),
      "{malformed}",
    ])
    const pending = await entregarPendientesService(5)
    expect(redisMock.lrange).toHaveBeenCalledWith("notif:queue:5", 0, -1)
    expect(redisMock.del).toHaveBeenCalledWith("notif:queue:5")
    expect(pending).toEqual([{ id: 1 }])
  })
})
