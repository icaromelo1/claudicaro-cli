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
        create: (title?: string) => Promise<{ id: string; title: string }>
        list: () => Promise<SessionSummary[]>
        history: (sessionId: string) => Promise<MessageRecord[]>
      }
      health: () => Promise<Record<string, { available: boolean; version?: string; error?: string }>>
    }
  }
}
