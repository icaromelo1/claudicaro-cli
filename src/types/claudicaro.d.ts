export interface CliSettings {
  enabled: boolean
  binaryPath: string
  defaultModel: string
  defaultBypass: boolean
}

export interface AppSettings {
  clis: {
    claude: CliSettings
    gemini: CliSettings
    copilot: CliSettings
  }
  tokenBudget: number
  defaultOrchestrator: {
    cli: string
    model: string
    agentFile: string | null
    permissionMode: 'bypass' | 'normal' | 'ask'
  }
}

export interface GoogleUser {
  email: string
  name: string
  picture: string
  sub: string
}

export interface AuthState {
  user: GoogleUser | null
  accessToken: string | null
  expiresAt: number | null
}

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

export interface SessionGroup {
  id: string
  name: string
  color: string
}

export interface SessionSummary {
  id: string
  title: string
  createdAt: Date
  messageCount: number
  orchestratorConfig?: string
  pinnedAt?: Date
  groupId?: string
  workingDir?: string
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

export interface UpdateStatus {
  current: string
  latest: string
  hasUpdate: boolean
}

declare global {
  interface Window {
    claudicaro: {
      dispatch: (task: string, sessionId: string, forceCli?: string) => Promise<DispatchResult>
      cancel: (sessionId: string) => Promise<void>
      onToken: (cb: (chunk: string, sessionId: string) => void) => () => void
      session: {
        create: (title?: string, orchestratorConfig?: string) => Promise<{ id: string; title: string; orchestratorConfig?: string }>
        list: () => Promise<SessionSummary[]>
        history: (sessionId: string) => Promise<MessageRecord[]>
        delete: (id: string) => Promise<null>
        rename: (id: string, title: string) => Promise<null>
        pin: (id: string, pinned: boolean) => Promise<null>
        search: (query: string) => Promise<SessionSummary[]>
        openDir: (sessionId: string) => Promise<null>
        moveGroup: (sessionId: string, groupId: string | null) => Promise<null>
      }
      group: {
        create: (name: string, color?: string) => Promise<SessionGroup>
        list: () => Promise<SessionGroup[]>
      }
      tokens: {
        budget: (sessionId: string) => Promise<SessionBudget>
      }
      health: () => Promise<Record<string, { available: boolean; version?: string; error?: string }>>
      logs: (limit?: number) => Promise<LogEntry[]>
      auth: {
        signIn: () => Promise<GoogleUser>
        signOut: () => Promise<null>
        getState: () => Promise<AuthState>
      }
      settings: {
        get: () => Promise<AppSettings>
        save: (s: AppSettings) => Promise<void>
      }
      maintenance: {
        backup: (destDir?: string) => Promise<string>
        listBackups: () => Promise<string[]>
        checkUpdate: () => Promise<UpdateStatus>
      }
    }
  }
}
