export interface CliSettings {
  enabled: boolean
  binaryPath: string
  defaultModel: string
  defaultBypass: boolean
}

export interface AppSettings {
  clis: {
    claude: CliSettings
    agy: CliSettings
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
  cli: 'claude' | 'agy' | 'copilot'
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

export interface EstadoEscritorio {
  presentes: string[]
  threadsAbertas: { id: string; assunto: string; dono: string; hops: number }[]
  claims: { recurso: string; dono: string; intencao: string }[]
}

export type CardEngine = 'pty' | 'headless-task' | 'headless-peer'
export type PeerTurnOrder = 'round-robin' | 'roundtable'
export type PeerGroupStatus = 'running' | 'stopped' | 'done'

export interface CanvasCard {
  id: string
  sessionId: string
  cli: string
  label: string | null
  engine: CardEngine
  x: number
  y: number
  width: number
  height: number
  ptyAlive: boolean
  createdAt: Date
}

export interface CanvasLink {
  id: string
  sessionId: string
  fromCardId: string
  toCardId: string
  contextSummary: string
  createdAt: Date
}

export interface PeerGroup {
  id: string
  sessionId: string
  turnOrder: PeerTurnOrder
  maxRounds: number
  currentRound: number
  status: PeerGroupStatus
  createdAt: Date
}

export interface PeerGroupMember {
  id: string
  groupId: string
  cardId: string
  turnIndex: number
}

export interface PeerTurn {
  id: string
  groupId: string
  cardId: string
  round: number
  content: string
  createdAt: Date
}

declare global {
  interface Window {
    icarus: {
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
      canvas: {
        listCards: (sessionId: string) => Promise<CanvasCard[]>
        listLinks: (sessionId: string) => Promise<CanvasLink[]>
        createCard: (sessionId: string, cli: string, x: number, y: number) => Promise<CanvasCard>
        createLinkedCard: (sessionId: string, parentCardId: string, childCli: string, x: number, y: number) => Promise<{ card: CanvasCard; link: CanvasLink }>
        moveCard: (cardId: string, x: number, y: number) => Promise<null>
        deleteCard: (cardId: string) => Promise<null>
        createTask: (sessionId: string, cli: string, x: number, y: number, task: string) => Promise<CanvasCard>
        onTaskToken: (cb: (cardId: string, chunk: string) => void) => () => void
        onTaskDone: (cb: (cardId: string, content: string) => void) => () => void
        createPeerGroup: (
          sessionId: string,
          members: { cli: string; label: string }[],
          turnOrder: PeerTurnOrder,
          maxRounds: number,
          openingPrompt: string,
          positions: { x: number; y: number }[],
        ) => Promise<{ group: PeerGroup; cards: CanvasCard[] }>
        stopPeerGroup: (groupId: string) => Promise<null>
        setPeerTurnOrder: (groupId: string, turnOrder: PeerTurnOrder) => Promise<null>
        listPeerGroups: (sessionId: string) => Promise<{ group: PeerGroup; members: PeerGroupMember[] }[]>
        listPeerTurns: (cardId: string) => Promise<PeerTurn[]>
        onPeerTurn: (cb: (cardId: string, round: number, content: string) => void) => () => void
      }
      pty: {
        write: (cardId: string, data: string) => Promise<null>
        resize: (cardId: string, cols: number, rows: number) => Promise<null>
        kill: (cardId: string) => Promise<null>
        onData: (cb: (cardId: string, chunk: string) => void) => () => void
      }
      escritorio: {
        disponivel: () => Promise<boolean>
        estado: () => Promise<unknown | null>
        onEvento: (cb: (evento: unknown) => void) => () => void
      }
    }
  }
}
