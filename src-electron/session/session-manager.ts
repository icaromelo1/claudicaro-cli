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
  async createSession(title?: string, orchestratorConfig?: string): Promise<string> {
    const session = await prisma.session.create({
      data: {
        title: title ?? 'Nova conversa',
        orchestratorConfig: orchestratorConfig ?? null,
      }
    })
    return session.id
  }

  async listSessions(): Promise<SessionSummary[]> {
    const sessions = await prisma.session.findMany({
      where: { deletedAt: null },
      orderBy: [{ pinnedAt: 'desc' }, { updatedAt: 'desc' }],
      include: { _count: { select: { messages: true } } }
    })

    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      messageCount: s._count.messages,
      pinnedAt: s.pinnedAt ?? undefined,
      groupId: s.groupId ?? undefined,
      workingDir: s.workingDir ?? undefined,
    }))
  }

  async deleteSession(id: string): Promise<void> {
    await prisma.session.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async renameSession(id: string, title: string): Promise<void> {
    await prisma.session.update({ where: { id }, data: { title } })
  }

  async pinSession(id: string, pinned: boolean): Promise<void> {
    await prisma.session.update({ where: { id }, data: { pinnedAt: pinned ? new Date() : null } })
  }

  async createGroup(name: string, color?: string): Promise<{ id: string; name: string; color: string }> {
    return prisma.sessionGroup.create({ data: { name, color: color ?? '#3FCF8E' } })
  }

  async listGroups(): Promise<{ id: string; name: string; color: string }[]> {
    return prisma.sessionGroup.findMany({ orderBy: { createdAt: 'asc' } })
  }

  async moveToGroup(sessionId: string, groupId: string | null): Promise<void> {
    await prisma.session.update({ where: { id: sessionId }, data: { groupId } })
  }

  async searchSessions(query: string): Promise<SessionSummary[]> {
    const sessions = await prisma.session.findMany({
      where: { deletedAt: null, title: { contains: query } },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } }
    })
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      messageCount: s._count.messages,
      pinnedAt: s.pinnedAt ?? undefined,
      groupId: s.groupId ?? undefined,
      workingDir: s.workingDir ?? undefined,
    }))
  }

  async saveCliSession(icarusSessionId: string, cli: string, cliSessionId: string): Promise<void> {
    await prisma.cliSession.upsert({
      where: { icarusSessionId_cli: { icarusSessionId, cli } },
      create: { icarusSessionId, cli, cliSessionId },
      update: { cliSessionId, updatedAt: new Date() },
    })
  }

  async getCliSession(icarusSessionId: string, cli: string): Promise<string | null> {
    const cs = await prisma.cliSession.findUnique({
      where: { icarusSessionId_cli: { icarusSessionId, cli } }
    })
    return cs?.cliSessionId ?? null
  }

  async getLastNMessages(sessionId: string, n: number): Promise<MessageRecord[]> {
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: n,
    })
    return messages.reverse().map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      cli: m.cli ?? undefined,
      createdAt: m.createdAt,
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
