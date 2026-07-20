// agy.ts — Icarus Code Adapter: Agy CLI
// Versão: 1.0 — 2026-07-20

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

export class AgyAdapter implements IAdapter {
  readonly name = 'agy'
  readonly role = 'EXECUTOR' as const

  async invoke(params: AdapterInvokeParams): Promise<AdapterInvokeResult> {
    guardDispatch('agy', params.task)
    const startMs = Date.now()

    const args: string[] = []

    if (params.modelFlag) {
      args.push(...params.modelFlag.trim().split(/\s+/))
    }

    if (params.bypassFlag) {
      args.push(...params.bypassFlag.trim().split(/\s+/))
    }

    let task = sanitizeInput(params.task)
    if (params.contextMessages && params.contextMessages.length > 0) {
      const prefix = params.contextMessages
        .map((m) => `[${m.role === 'user' ? 'Usuário' : 'IA'}]: ${m.content}`)
        .join('\n')
      task = `Contexto da conversa anterior:\n${prefix}\n\nMensagem atual:\n${task}`
    }
    args.push('-p', task)

    const content = await new Promise<string>((resolve, reject) => {
      const proc = spawn('agy', args, { shell: false })
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
              'Agy CLI not found. Make sure `agy` is in PATH.',
              'CLI_NOT_FOUND',
              'agy',
              false,
            ),
          )
        } else {
          reject(
            new AdapterError(
              err.message,
              'UNKNOWN',
              'agy',
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
          reject(new AdapterError('Cancelado pelo usuário.', 'UNKNOWN', 'agy', false))
          return
        }

        if (code === 1 && stderr.toLowerCase().includes('context length')) {
          reject(
            new AdapterError(
              `Agy context length exceeded: ${stderr.trim()}`,
              'CONTEXT_LENGTH_EXCEEDED',
              'agy',
              true,
            ),
          )
          return
        }

        const parsed = parseStderr(stderr)
        reject(
          new AdapterError(
            parsed.userMessage || `Agy exited with code ${code}`,
            'UNKNOWN',
            'agy',
            false,
            parsed.userMessage,
            parsed.rawOutput,
          ),
        )
      })
    })

    return {
      content,
      cli: 'agy',
      model: params.model ?? 'agy',
      latencyMs: Date.now() - startMs,
      routingMeta: {
        reason: 'adapter-invoke',
        toolRequirement: 'code_analysis',
      },
    }
  }

  async checkHealth(): Promise<AdapterHealthResult> {
    return new Promise((resolve) => {
      const proc = spawn('agy', ['--version'], { shell: false })
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
