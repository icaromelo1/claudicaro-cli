export { prisma } from './client'

export async function createSession(title?: string) {
  const { prisma } = await import('./client')
  return prisma.session.create({
    data: { title: title ?? 'Nova conversa' }
  })
}

export async function addMessage(params: {
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  cli?: string
  model?: string
  routingMeta?: object
  tokens?: number
  latencyMs?: number
}) {
  const { prisma } = await import('./client')
  return prisma.message.create({
    data: {
      ...params,
      routingMeta: params.routingMeta ? JSON.stringify(params.routingMeta) : null
    }
  })
}

export async function getSessions() {
  const { prisma } = await import('./client')
  return prisma.session.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { messages: true } } }
  })
}

export async function getMessages(sessionId: string) {
  const { prisma } = await import('./client')
  return prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' }
  })
}
