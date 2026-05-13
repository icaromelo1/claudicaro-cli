// claude.ts — Claudicaro Adapter: Claude Code CLI
// Versão: 1.0 — 2026-05-12

import { spawn } from 'child_process'
import type {
  IAdapter,
  AdapterInvokeParams,
  AdapterInvokeResult,
  AdapterHealthResult,
} from '../dispatcher/types.js'
import { AdapterError } from '../dispatcher/types.js'
import { sanitizeInput } from '../sanitize/index.js'
import { guardDispatch } from '../security/index.js'

function parseStderr(raw: string): { userMessage: string; rawOutput: string } {
  const noisePatterns = ['Warning:', 'If piping', 'redirect stdin', '< /dev/null']
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const meaningful = lines.filter(l => !noisePatterns.some(p => l.startsWith(p)))
  return { userMessage: meaningful[0] ?? raw.trim(), rawOutput: raw.trim() }
}

export class ClaudeAdapter implements IAdapter {
  readonly name = 'claude'
  readonly role = 'EXECUTOR' as const

  async invoke(params: AdapterInvokeParams): Promise<AdapterInvokeResult> {
    guardDispatch('claude', params.task)
    const startMs = Date.now()

    const args: string[] = ['--print']

    if (params.modelFlag) {
      // e.g. "--model claude-sonnet-4-6" → split into two tokens
      args.push(...params.modelFlag.trim().split(/\s+/))
    }

    if (params.bypassFlag) {
      args.push(...params.bypassFlag.trim().split(/\s+/))
    }

    args.push('-p', sanitizeInput(params.task))

    const content = await new Promise<string>((resolve, reject) => {
      const proc = spawn('claude', args, { shell: false })
      let stdout = ''
      let stderr = ''

      if (params.abortSignal) {
        params.abortSignal.addEventListener('abort', () => proc.kill('SIGTERM'), { once: true })
      }

      proc.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        stdout += text
        params.onToken?.(text)
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          reject(
            new AdapterError(
              'Claude CLI not found. Make sure `claude` is in PATH.',
              'CLI_NOT_FOUND',
              'claude',
              false,
            ),
          )
        } else {
          reject(
            new AdapterError(
              err.message,
              'UNKNOWN',
              'claude',
              false,
            ),
          )
        }
      })

      proc.on('close', (code, signal) => {
        if (code === 0) {
          resolve(stdout)
          return
        }

        if (code === null && signal) {
          reject(new AdapterError('Cancelado pelo usuário.', 'UNKNOWN', 'claude', false))
          return
        }

        if (code === 130) {
          reject(
            new AdapterError(
              'Claude context length exceeded.',
              'CONTEXT_LENGTH_EXCEEDED',
              'claude',
              true,
            ),
          )
          return
        }

        if (code === 1 && stderr.toLowerCase().includes('rate limit')) {
          reject(
            new AdapterError(
              `Claude rate limit exceeded: ${stderr.trim()}`,
              'RATE_LIMIT_EXCEEDED',
              'claude',
              true,
            ),
          )
          return
        }

        const parsed = parseStderr(stderr)
        reject(
          new AdapterError(
            parsed.userMessage || `Claude exited with code ${code}`,
            'UNKNOWN',
            'claude',
            false,
            parsed.userMessage,
            parsed.rawOutput,
          ),
        )
      })
    })

    return {
      content,
      cli: 'claude',
      model: params.model ?? 'claude-sonnet-4-6',
      latencyMs: Date.now() - startMs,
      routingMeta: {
        reason: 'adapter-invoke',
        toolRequirement: 'code_analysis',
      },
    }
  }

  async checkHealth(): Promise<AdapterHealthResult> {
    return new Promise((resolve) => {
      const proc = spawn('claude', ['--version'], { shell: false })
      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

      proc.on('error', (err: NodeJS.ErrnoException) => {
        resolve({ available: false, error: err.message })
      })

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ available: true, version: stdout.trim() })
        } else {
          resolve({ available: false, error: stderr.trim() || `exit code ${code}` })
        }
      })
    })
  }

  async dumpContext(_sessionId: string): Promise<string> {
    return ''
  }
}
