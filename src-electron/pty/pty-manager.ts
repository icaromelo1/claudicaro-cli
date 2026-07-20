import * as pty from 'node-pty'
import type { IPty } from 'node-pty'

export interface PtyCreateOptions {
  cwd?: string
  resumeSessionId?: string
  initialInput?: string
  bypass?: boolean
}

interface CliSpawnSpec {
  file: string
  args: (opts: PtyCreateOptions) => string[]
}

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const SESSION_ID_CAPTURE_BUDGET = 4000

export const CLI_SPECS: Record<string, CliSpawnSpec> = {
  claude: {
    file: 'claude',
    args: (opts) => [
      ...(opts.bypass ? ['--dangerously-skip-permissions'] : []),
      ...(opts.resumeSessionId ? ['--resume', opts.resumeSessionId] : []),
    ],
  },
  agy: {
    file: 'agy',
    args: (opts) => [
      ...(opts.bypass ? ['--dangerously-skip-permissions'] : []),
      ...(opts.resumeSessionId ? ['--conversation', opts.resumeSessionId] : []),
    ],
  },
  codex: {
    file: 'codex',
    args: (opts) => (
      opts.resumeSessionId
        ? ['resume', opts.resumeSessionId]
        : (opts.bypass ? ['--dangerously-bypass-approvals-and-sandbox'] : [])
    ),
  },
  copilot: {
    file: 'copilot',
    args: (opts) => [
      ...(opts.bypass ? ['--allow-all'] : []),
      ...(opts.resumeSessionId ? [`--resume=${opts.resumeSessionId}`] : []),
    ],
  },
}

interface Session {
  proc: IPty
  capturedSessionId?: string
  capturedBytes: number
}

export class PtyManager {
  private sessions = new Map<string, Session>()
  private dataListeners = new Map<string, Set<(chunk: string) => void>>()

  create(cardId: string, cli: string, opts: PtyCreateOptions = {}): void {
    if (this.sessions.has(cardId)) {
      throw new Error(`PTY session já existe para o card ${cardId}`)
    }

    const spec = CLI_SPECS[cli]
    if (!spec) {
      throw new Error(`CLI desconhecido pro canvas: ${cli}`)
    }

    const cwd = opts.cwd ?? process.env.HOME
    const proc = pty.spawn(spec.file, spec.args(opts), {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      ...(cwd ? { cwd } : {}),
      env: process.env as Record<string, string>,
    })

    const session: Session = { proc, capturedBytes: 0 }
    this.sessions.set(cardId, session)

    proc.onData((chunk) => {
      if (session.capturedSessionId === undefined && session.capturedBytes < SESSION_ID_CAPTURE_BUDGET) {
        session.capturedBytes += chunk.length
        const match = UUID_REGEX.exec(chunk)
        if (match) session.capturedSessionId = match[0]
      }
      for (const cb of this.dataListeners.get(cardId) ?? []) cb(chunk)
    })

    proc.onExit(() => {
      this.sessions.delete(cardId)
      this.dataListeners.delete(cardId)
    })

    if (opts.initialInput) {
      proc.write(opts.initialInput)
    }
  }

  write(cardId: string, data: string): void {
    this.sessions.get(cardId)?.proc.write(data)
  }

  resize(cardId: string, cols: number, rows: number): void {
    this.sessions.get(cardId)?.proc.resize(cols, rows)
  }

  kill(cardId: string): void {
    const session = this.sessions.get(cardId)
    if (!session) return
    session.proc.kill()
    this.sessions.delete(cardId)
    this.dataListeners.delete(cardId)
  }

  onData(cardId: string, cb: (chunk: string) => void): () => void {
    if (!this.dataListeners.has(cardId)) this.dataListeners.set(cardId, new Set())
    this.dataListeners.get(cardId)!.add(cb)
    return () => this.dataListeners.get(cardId)?.delete(cb)
  }

  getCapturedSessionId(cardId: string): string | undefined {
    return this.sessions.get(cardId)?.capturedSessionId
  }

  isAlive(cardId: string): boolean {
    return this.sessions.has(cardId)
  }
}
