import { prisma } from '../../src/db/client.js'

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

const RING_BUFFER_SIZE = 500

const AUDIT_EVENTS: Record<string, string> = {
  'failover.triggered': 'failover',
  'dispatch.error': 'dispatch_error',
  'health.degraded': 'health_check_failed',
}

export class DispatcherLogger {
  private buffer: LogEntry[] = []

  log(entry: Omit<LogEntry, 'timestamp'>): void {
    const fullEntry: LogEntry = { ...entry, timestamp: new Date() }

    this.buffer.push(fullEntry)
    if (this.buffer.length > RING_BUFFER_SIZE) {
      this.buffer.shift()
    }

    const auditAction = AUDIT_EVENTS[entry.event]
    if (auditAction) {
      prisma.auditLog
        .create({
          data: {
            action: auditAction,
            actor: entry.cli ?? 'dispatcher',
            phase: entry.event,
            reason: entry.error,
            metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
          },
        })
        .catch((err: unknown) => {
          console.error('[DispatcherLogger] Failed to persist AuditLog:', err)
        })
    }
  }

  getLogs(limit = 100): LogEntry[] {
    return this.buffer.slice(-limit)
  }

  clear(): void {
    this.buffer = []
  }
}

export const logger = new DispatcherLogger()
