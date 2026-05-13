import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so the mock object is available when vi.mock factory runs
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    session: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('../src/db/client.js', () => ({
  prisma: mockPrisma,
}))

import { SessionManager } from '../src-electron/session/session-manager.js'

describe('SessionManager', () => {
  let manager: SessionManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new SessionManager()
  })

  describe('createSession', () => {
    it('returns session id on creation', async () => {
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-abc-123',
        title: 'Nova conversa',
        orchestratorConfig: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const id = await manager.createSession()

      expect(id).toBe('session-abc-123')
      expect(mockPrisma.session.create).toHaveBeenCalledOnce()
    })

    it('creates session with custom title', async () => {
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-xyz',
        title: 'My custom session',
        orchestratorConfig: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const id = await manager.createSession('My custom session')

      expect(id).toBe('session-xyz')
      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: 'My custom session' }),
      })
    })

    it('uses default title when none provided', async () => {
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-default',
        title: 'Nova conversa',
        orchestratorConfig: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await manager.createSession()

      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: 'Nova conversa' }),
      })
    })
  })

  describe('persistMessage', () => {
    it('saves message fields correctly', async () => {
      const now = new Date()
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'Hello world',
        cli: 'claude',
        model: 'claude-sonnet-4-6',
        routingMeta: null,
        tokens: 10,
        latencyMs: 100,
        createdAt: now,
      })

      await manager.persistMessage('session-1', {
        role: 'user',
        content: 'Hello world',
        cli: 'claude',
        model: 'claude-sonnet-4-6',
        tokens: 10,
        latencyMs: 100,
      })

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'session-1',
          role: 'user',
          content: 'Hello world',
          cli: 'claude',
          model: 'claude-sonnet-4-6',
          tokens: 10,
          latencyMs: 100,
        }),
      })
    })

    it('serializes routingMeta as JSON string', async () => {
      const now = new Date()
      const routingMeta = { reason: 'debug', toolRequirement: 'code_analysis' }

      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-2',
        sessionId: 'session-1',
        role: 'assistant',
        content: 'Here is the fix',
        cli: 'claude',
        model: 'claude-sonnet-4-6',
        routingMeta: JSON.stringify(routingMeta),
        tokens: 50,
        latencyMs: 200,
        createdAt: now,
      })

      await manager.persistMessage('session-1', {
        role: 'assistant',
        content: 'Here is the fix',
        cli: 'claude',
        model: 'claude-sonnet-4-6',
        routingMeta,
      })

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          routingMeta: JSON.stringify(routingMeta),
        }),
      })
    })

    it('emits message event after persisting', async () => {
      const now = new Date()
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-3',
        sessionId: 'session-1',
        role: 'user',
        content: 'Test content',
        cli: null,
        model: null,
        routingMeta: null,
        tokens: null,
        latencyMs: null,
        createdAt: now,
      })

      const emittedMessages: unknown[] = []
      manager.on('message', (msg) => emittedMessages.push(msg))

      await manager.persistMessage('session-1', {
        role: 'user',
        content: 'Test content',
      })

      expect(emittedMessages).toHaveLength(1)
      expect(emittedMessages[0]).toMatchObject({
        id: 'msg-3',
        sessionId: 'session-1',
        role: 'user',
        content: 'Test content',
      })
    })
  })

  describe('getHistory', () => {
    it('returns messages ordered by createdAt asc', async () => {
      const now = new Date()
      const messages = [
        { id: 'msg-1', sessionId: 'session-1', role: 'user', content: 'Hi', cli: null, model: null, routingMeta: null, tokens: null, latencyMs: null, createdAt: new Date(now.getTime() - 1000) },
        { id: 'msg-2', sessionId: 'session-1', role: 'assistant', content: 'Hello', cli: 'claude', model: 'sonnet', routingMeta: null, tokens: 20, latencyMs: 80, createdAt: now },
      ]

      mockPrisma.message.findMany.mockResolvedValue(messages)

      const history = await manager.getHistory('session-1')

      expect(history).toHaveLength(2)
      expect(history[0].id).toBe('msg-1')
      expect(history[1].id).toBe('msg-2')
      expect(history[0].role).toBe('user')
      expect(history[1].role).toBe('assistant')
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        orderBy: { createdAt: 'asc' },
      })
    })

    it('maps null fields to undefined in MessageRecord', async () => {
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-1', sessionId: 'session-1', role: 'user', content: 'Hi', cli: null, model: null, routingMeta: null, tokens: null, latencyMs: null, createdAt: new Date() },
      ])

      const history = await manager.getHistory('session-1')

      expect(history[0].cli).toBeUndefined()
      expect(history[0].model).toBeUndefined()
      expect(history[0].routingMeta).toBeUndefined()
      expect(history[0].tokens).toBeUndefined()
    })

    it('parses routingMeta JSON string back to object', async () => {
      const routingMeta = { reason: 'debug', toolRequirement: 'code_analysis' }
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-1', sessionId: 'session-1', role: 'assistant', content: 'Fixed', cli: 'claude', model: 'sonnet', routingMeta: JSON.stringify(routingMeta), tokens: 30, latencyMs: 100, createdAt: new Date() },
      ])

      const history = await manager.getHistory('session-1')

      expect(history[0].routingMeta).toEqual(routingMeta)
    })
  })

  describe('listSessions', () => {
    it('returns sessions with messageCount', async () => {
      const now = new Date()
      mockPrisma.session.findMany.mockResolvedValue([
        {
          id: 'session-1',
          title: 'Debug session',
          createdAt: now,
          updatedAt: now,
          orchestratorConfig: null,
          _count: { messages: 5 },
        },
        {
          id: 'session-2',
          title: 'Feature session',
          createdAt: new Date(now.getTime() - 5000),
          updatedAt: new Date(now.getTime() - 5000),
          orchestratorConfig: null,
          _count: { messages: 2 },
        },
      ])

      const sessions = await manager.listSessions()

      expect(sessions).toHaveLength(2)
      expect(sessions[0]).toMatchObject({
        id: 'session-1',
        title: 'Debug session',
        messageCount: 5,
      })
      expect(sessions[1]).toMatchObject({
        id: 'session-2',
        messageCount: 2,
      })
    })

    it('returns empty array when no sessions exist', async () => {
      mockPrisma.session.findMany.mockResolvedValue([])

      const sessions = await manager.listSessions()

      expect(sessions).toHaveLength(0)
    })
  })
})
