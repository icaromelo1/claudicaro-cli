// metrics/index.ts — Claudicaro Metrics Collector
// Versão: 1.0 — 2026-05-12

export interface MetricEntry {
  cli: string
  model?: string
  latencyMs: number
  tokens?: number
  error?: boolean
  timestamp: Date
}

export interface MetricStats {
  calls: number
  avgLatencyMs: number
  p95LatencyMs: number
  errorRate: number
  totalTokens: number
}

const RING_BUFFER_SIZE = 1000

export class MetricsCollector {
  private buffer: MetricEntry[] = []
  private head = 0
  private count = 0

  record(entry: MetricEntry): void {
    if (this.count < RING_BUFFER_SIZE) {
      this.buffer[this.head] = entry
      this.count++
    } else {
      this.buffer[this.head] = entry
    }
    this.head = (this.head + 1) % RING_BUFFER_SIZE
  }

  getStats(cli?: string): MetricStats {
    const entries = cli
      ? this.buffer.slice(0, this.count).filter(e => e.cli === cli)
      : this.buffer.slice(0, this.count)

    if (entries.length === 0) {
      return { calls: 0, avgLatencyMs: 0, p95LatencyMs: 0, errorRate: 0, totalTokens: 0 }
    }

    const latencies = entries.map(e => e.latencyMs).sort((a, b) => a - b)
    const errors = entries.filter(e => e.error).length
    const totalTokens = entries.reduce((sum, e) => sum + (e.tokens ?? 0), 0)
    const avgLatencyMs = latencies.reduce((sum, v) => sum + v, 0) / latencies.length
    const p95Index = Math.ceil(latencies.length * 0.95) - 1
    const p95LatencyMs = latencies[Math.max(0, p95Index)] ?? 0

    return {
      calls: entries.length,
      avgLatencyMs,
      p95LatencyMs,
      errorRate: errors / entries.length,
      totalTokens,
    }
  }

  getSummary(): Record<string, MetricStats> {
    const clis = [...new Set(this.buffer.slice(0, this.count).map(e => e.cli))]
    const summary: Record<string, MetricStats> = {}
    for (const cli of clis) {
      summary[cli] = this.getStats(cli)
    }
    return summary
  }

  clear(): void {
    this.buffer = []
    this.head = 0
    this.count = 0
  }
}

export const metrics = new MetricsCollector()
