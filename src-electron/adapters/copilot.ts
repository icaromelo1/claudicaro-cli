// copilot.ts — Icarus Code Adapter: GitHub Copilot CLI
// Versão: 2.0 — 2026-07-19 — migrado de `gh copilot suggest/explain` (API legada, quebrada)
// para o binário standalone `copilot` com --output-format json e --session-id nativo.

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

export class CopilotAdapter implements IAdapter {
  readonly name = 'copilot'
  readonly role = 'CONSELHEIRO' as const

  async invoke(params: AdapterInvokeParams): Promise<AdapterInvokeResult> {
    guardDispatch('copilot', params.task)
    const startMs = Date.now()

    const args: string[] = ['-p', sanitizeInput(params.task), '--allow-all', '--output-format', 'json']

    if (params.cliSessionId) {
      args.push('--session-id', params.cliSessionId)
    }

    if (params.modelFlag) {
      args.push(...params.modelFlag.trim().split(/\s+/))
    }

    const { content, sessionId, tokens } = await new Promise<{ content: string; sessionId?: string; tokens?: number }>((resolve, reject) => {
      const proc = spawn('copilot', args, { shell: false })
      let lineBuffer = ''
      let finalContent = ''
      let foundSessionId: string | undefined
      let outputTokens: number | undefined
      let stderr = ''

      if (params.abortSignal) {
        params.abortSignal.addEventListener('abort', () => proc.kill('SIGTERM'), { once: true })
      }

      proc.stdout.on('data', (chunk: Buffer) => {
        lineBuffer += chunk.toString()
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as Record<string, unknown>
            if (event.type === 'assistant.message_delta') {
              const data = event.data as Record<string, unknown> | undefined
              const delta = typeof data?.deltaContent === 'string' ? data.deltaContent : ''
              if (delta) params.onToken?.(delta)
            } else if (event.type === 'assistant.message') {
              const data = event.data as Record<string, unknown> | undefined
              if (typeof data?.content === 'string') finalContent = data.content
              if (typeof data?.outputTokens === 'number') outputTokens = data.outputTokens
            } else if (event.type === 'result') {
              if (typeof event.sessionId === 'string') foundSessionId = event.sessionId
            }
          } catch {
            // ignore non-JSON lines
          }
        }
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          reject(new AdapterError('Copilot CLI not found. Make sure `copilot` is in PATH.', 'CLI_NOT_FOUND', 'copilot', false))
        } else {
          reject(new AdapterError(err.message, 'UNKNOWN', 'copilot', false))
        }
      })

      proc.on('close', (code, signal) => {
        if (code === 0) {
          resolve({ content: finalContent, sessionId: foundSessionId, tokens: outputTokens })
          return
        }

        if (code === null && signal) {
          reject(new AdapterError('Cancelado pelo usuário.', 'UNKNOWN', 'copilot', false))
          return
        }

        if (stderr.toLowerCase().includes('rate limit')) {
          reject(new AdapterError(`Copilot rate limit exceeded: ${stderr.trim()}`, 'RATE_LIMIT_EXCEEDED', 'copilot', true))
          return
        }

        const parsed = parseStderr(stderr)
        reject(new AdapterError(
          parsed.userMessage || `Copilot exited with code ${code}`,
          'UNKNOWN', 'copilot', false, parsed.userMessage, parsed.rawOutput,
        ))
      })
    })

    return {
      content,
      cli: 'copilot',
      model: params.model ?? 'copilot',
      tokens,
      latencyMs: Date.now() - startMs,
      cliSessionId: sessionId,
      routingMeta: {
        reason: 'conselheiro-suggestion',
        toolRequirement: 'copilot',
      },
    }
  }

  async checkHealth(): Promise<AdapterHealthResult> {
    return new Promise((resolve) => {
      const proc = spawn('copilot', ['--version'], { shell: false })
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
}
