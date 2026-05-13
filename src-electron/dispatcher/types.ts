// types.ts — Claudicaro Dispatcher Interface Contracts
// Versão: 1.0 — 2026-05-12

export interface AdapterInvokeParams {
  task: string              // descrição da task em linguagem natural
  model?: string            // ex: "claude-sonnet-4-6"
  modelFlag?: string        // ex: "--model claude-sonnet-4-6"
  bypassFlag?: string       // ex: "--dangerously-skip-permissions"
  context?: string[]        // caminhos de arquivos .agent/*.md para injetar
  sessionId: string         // ID da sessão atual
  cliSessionId?: string     // ID de sessão do CLI para retomada (ex: --resume do Claude)
  contextMessages?: Array<{ role: 'user' | 'assistant'; content: string }> // histórico para CLIs sem resume nativo
  onToken?: (chunk: string) => void  // streaming callback
  abortSignal?: AbortSignal
}

export interface AdapterInvokeResult {
  content: string           // resposta completa
  cli: string               // "claude" | "gemini" | "copilot"
  model: string             // modelo que respondeu
  tokens?: number           // tokens consumidos (se disponível)
  latencyMs: number         // tempo total de resposta
  cliSessionId?: string     // ID de sessão do CLI para retomada futura
  routingMeta: {
    reason: string          // motivo do roteamento
    toolRequirement: string // ferramenta usada para decidir
  }
}

export interface AdapterHealthResult {
  available: boolean
  version?: string
  error?: string
}

export interface IAdapter {
  readonly name: string     // "claude" | "gemini" | "copilot"
  readonly role: 'EXECUTOR' | 'CONSELHEIRO'

  invoke(params: AdapterInvokeParams): Promise<AdapterInvokeResult>
  dumpContext(sessionId: string): Promise<string>  // serializa contexto da sessão
  checkHealth(): Promise<AdapterHealthResult>
}

export type AdapterErrorCode =
  | 'CLI_NOT_FOUND'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'MODEL_OVERLOADED'
  | 'TIMEOUT'
  | 'AUTH_ERROR'
  | 'UNKNOWN'

export interface DispatchRequest {
  task: string
  sessionId: string
  forceTaskType?: string
  forceCli?: string
  cliSessionId?: string
  contextMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
  onToken?: (chunk: string) => void
  abortSignal?: AbortSignal
}

export interface DispatchResult extends AdapterInvokeResult {
  taskType: string
  failoverUsed: boolean
}

export class AdapterError extends Error {
  constructor(
    message: string,
    public code: AdapterErrorCode,
    public cli: string,
    public retryable: boolean,
    public userMessage?: string,
    public rawOutput?: string,
  ) {
    super(message)
    this.name = 'AdapterError'
  }
}
