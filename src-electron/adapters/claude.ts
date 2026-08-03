// claude.ts — Icarus Code Adapter: Claude Code CLI
// Versão: 1.0 — 2026-05-12

import { spawn } from 'child_process'
import { envComIdentidade } from '../escritorio/identidade.js'
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

    const args: string[] = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
    ]

    if (params.cliSessionId) {
      args.push('--resume', params.cliSessionId)
    }

    if (params.modelFlag) {
      args.push(...params.modelFlag.trim().split(/\s+/))
    }

    if (params.bypassFlag) {
      args.push(...params.bypassFlag.trim().split(/\s+/))
    }

    args.push('-p', sanitizeInput(params.task))

    const { content, sessionId, tokens } = await new Promise<{ content: string; sessionId?: string; tokens?: number }>((resolve, reject) => {
      const proc = spawn('claude', args, { shell: false, env: envComIdentidade(params.escritorioId) })
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
            if (!foundSessionId && typeof event.session_id === 'string') {
              foundSessionId = event.session_id
            }
            if (event.type === 'assistant') {
              const msg = event.message as Record<string, unknown> | undefined
              const content = msg?.content as Array<{ type: string; text?: string }> | undefined
              if (content) {
                for (const block of content) {
                  if (block.type === 'text' && block.text) {
                    finalContent += block.text
                    params.onToken?.(block.text)
                  }
                }
              }
            } else if (event.type === 'result') {
              const usage = event.usage as Record<string, unknown> | undefined
              outputTokens = typeof usage?.output_tokens === 'number' ? usage.output_tokens : undefined
              if (typeof event.result === 'string' && !finalContent) {
                finalContent = event.result
              }
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
          reject(new AdapterError('Claude CLI not found. Make sure `claude` is in PATH.', 'CLI_NOT_FOUND', 'claude', false))
        } else {
          reject(new AdapterError(err.message, 'UNKNOWN', 'claude', false))
        }
      })

      proc.on('close', (code, signal) => {
        if (code === 0) {
          resolve({ content: finalContent, sessionId: foundSessionId, tokens: outputTokens })
          return
        }

        if (code === null && signal) {
          reject(new AdapterError('Cancelado pelo usuário.', 'UNKNOWN', 'claude', false))
          return
        }

        if (code === 130) {
          reject(new AdapterError('Claude context length exceeded.', 'CONTEXT_LENGTH_EXCEEDED', 'claude', true))
          return
        }

        if (code === 1 && stderr.toLowerCase().includes('rate limit')) {
          reject(new AdapterError(`Claude rate limit exceeded: ${stderr.trim()}`, 'RATE_LIMIT_EXCEEDED', 'claude', true))
          return
        }

        const parsed = parseStderr(stderr)
        reject(new AdapterError(
          parsed.userMessage || `Claude exited with code ${code}`,
          'UNKNOWN', 'claude', false, parsed.userMessage, parsed.rawOutput,
        ))
      })
    })

    return {
      content,
      cli: 'claude',
      model: params.model ?? 'claude-sonnet-4-6',
      tokens,
      latencyMs: Date.now() - startMs,
      cliSessionId: sessionId,
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
}
