import { prisma } from '../../src/db/client.js'

export interface TokenUsage {
  sessionId: string
  cli: string
  tokens: number
  latencyMs: number
  timestamp: Date
}

export interface SessionBudget {
  sessionId: string
  totalTokens: number
  totalMessages: number
  avgLatencyMs: number
  byCliBreakdown: Record<string, { tokens: number; messages: number }>
}

const DEFAULT_TOKEN_LIMIT = 100_000

export class TokenTracker {
  async track(usage: TokenUsage): Promise<void> {
    const budget = await this.getSessionBudget(usage.sessionId)

    if (budget.totalTokens > DEFAULT_TOKEN_LIMIT) {
      await prisma.auditLog.create({
        data: {
          action: 'token_budget_exceeded',
          actor: usage.cli,
          metadata: JSON.stringify({ sessionId: usage.sessionId, total: budget.totalTokens }),
        },
      })
    }
  }

  async getSessionBudget(sessionId: string): Promise<SessionBudget> {
    const messages = await prisma.message.findMany({ where: { sessionId } })

    let totalTokens = 0
    let totalLatency = 0
    let latencyCount = 0
    const byCliBreakdown: Record<string, { tokens: number; messages: number }> = {}

    for (const msg of messages) {
      const tokens = msg.tokens ?? 0
      const latency = msg.latencyMs ?? 0
      const cli = msg.cli ?? 'unknown'

      totalTokens += tokens

      if (msg.latencyMs != null) {
        totalLatency += latency
        latencyCount++
      }

      if (!byCliBreakdown[cli]) {
        byCliBreakdown[cli] = { tokens: 0, messages: 0 }
      }
      byCliBreakdown[cli].tokens += tokens
      byCliBreakdown[cli].messages += 1
    }

    return {
      sessionId,
      totalTokens,
      totalMessages: messages.length,
      avgLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
      byCliBreakdown,
    }
  }

  async isOverBudget(sessionId: string, limitTokens: number = DEFAULT_TOKEN_LIMIT): Promise<boolean> {
    const budget = await this.getSessionBudget(sessionId)
    return budget.totalTokens > limitTokens
  }
}
