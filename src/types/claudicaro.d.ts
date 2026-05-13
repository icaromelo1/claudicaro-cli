export interface OrchestratorConfig {
  cli: 'claude' | 'gemini' | 'copilot'
  model: string
  agentFile: string | null  // ex: "dsg/.agent/tech-lead.md" ou null
  permissionMode: 'bypass' | 'normal' | 'ask'
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error'
  event: string
  cli?: string
  model?: string
  sessionId?: string
  latencyMs?: number
  error?: string
  metadata?: Record<string, unknown>
  timestamp: Date
}

export interface SessionBudget {
  sessionId: string
  totalTokens: number
  totalMessages: number
  avgLatencyMs: number
  byCliBreakdown: Record<string, { tokens: number; messages: number }>
}

export interface DispatchResult {
  content: string
  cli: string
  model: string
  tokens?: number
  latencyMs: number
  taskType: string
  failoverUsed: boolean
  routingMeta: {
    reason: string
    toolRequirement: string
  }
}

export interface SessionSummary {
  id: string
  title: string
  createdAt: Date
  messageCount: number
  orchestratorConfig?: string
}

export interface MessageRecord {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  cli?: string
  model?: string
  routingMeta?: { reason: string; toolRequirement: string }
  tokens?: number
  latencyMs?: number
  createdAt: Date
}

declare global {
  interface Window {
    claudicaro: {
      dispatch: (task: string, sessionId: string) => Promise<DispatchResult>
      onToken: (cb: (chunk: string, sessionId: string) => void) => () => void
      session: {
        create: (title?: string, orchestratorConfig?: string) => Promise<{ id: string; title: string; orchestratorConfig?: string }>
        list: () => Promise<SessionSummary[]>
        history: (sessionId: string) => Promise<MessageRecord[]>
      }
      tokens: {
        budget: (sessionId: string) => Promise<SessionBudget>
      }
      health: () => Promise<Record<string, { available: boolean; version?: string; error?: string }>>
      logs: (limit?: number) => Promise<LogEntry[]>
    }
  }
}
