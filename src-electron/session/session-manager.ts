import { EventEmitter } from 'events'
import { prisma } from '../../src/db/client.js'

export interface SessionSummary {
  id: string
  title: string
  createdAt: Date
  messageCount: number
}

export interface MessagePayload {
  role: 'user' | 'assistant'
  content: string
  cli?: string
  model?: string
  routingMeta?: { reason: string; toolRequirement: string }
  tokens?: number
  latencyMs?: number
}

export interface MessageRecord extends MessagePayload {
  id: string
  sessionId: string
  createdAt: Date
}

export class SessionManager extends EventEmitter {
  async createSession(title?: string): Promise<string> {
    const session = await prisma.session.create({
      data: { title: title ?? 'Nova conversa' }
    })
    return session.id
  }

  async listSessions(): Promise<SessionSummary[]> {
    const sessions = await prisma.session.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } }
    })

    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      messageCount: s._count.messages
    }))
  }

  async persistMessage(sessionId: string, msg: MessagePayload): Promise<void> {
    const record = await prisma.message.create({
      data: {
        sessionId,
        role: msg.role,
        content: msg.content,
        cli: msg.cli ?? null,
        model: msg.model ?? null,
        routingMeta: msg.routingMeta ? JSON.stringify(msg.routingMeta) : null,
        tokens: msg.tokens ?? null,
        latencyMs: msg.latencyMs ?? null
      }
    })

    const messageRecord: MessageRecord = {
      id: record.id,
      sessionId: record.sessionId,
      role: record.role as 'user' | 'assistant',
      content: record.content,
      cli: record.cli ?? undefined,
      model: record.model ?? undefined,
      routingMeta: record.routingMeta
        ? (JSON.parse(record.routingMeta) as { reason: string; toolRequirement: string })
        : undefined,
      tokens: record.tokens ?? undefined,
      latencyMs: record.latencyMs ?? undefined,
      createdAt: record.createdAt
    }

    this.emit('message', messageRecord)
  }

  async getHistory(sessionId: string): Promise<MessageRecord[]> {
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    })

    return messages.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      cli: m.cli ?? undefined,
      model: m.model ?? undefined,
      routingMeta: m.routingMeta
        ? (JSON.parse(m.routingMeta) as { reason: string; toolRequirement: string })
        : undefined,
      tokens: m.tokens ?? undefined,
      latencyMs: m.latencyMs ?? undefined,
      createdAt: m.createdAt
    }))
  }

  async closeSession(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    })
  }
}
