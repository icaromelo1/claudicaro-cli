// gemini.ts — Claudicaro Adapter: Gemini CLI
// Versão: 1.0 — 2026-05-12

import { spawn } from 'child_process'
import type {
  IAdapter,
  AdapterInvokeParams,
  AdapterInvokeResult,
  AdapterHealthResult,
} from '../dispatcher/types.js'
import { AdapterError } from '../dispatcher/types.js'

export class GeminiAdapter implements IAdapter {
  readonly name = 'gemini'
  readonly role = 'EXECUTOR' as const

  async invoke(params: AdapterInvokeParams): Promise<AdapterInvokeResult> {
    const startMs = Date.now()

    const args: string[] = []

    if (params.modelFlag) {
      // e.g. "-m flash" → split into tokens
      args.push(...params.modelFlag.trim().split(/\s+/))
    }

    if (params.bypassFlag) {
      args.push(...params.bypassFlag.trim().split(/\s+/))
    }

    args.push('-p', params.task)

    const content = await new Promise<string>((resolve, reject) => {
      const proc = spawn('gemini', args, { shell: false })
      let stdout = ''
      let stderr = ''

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
              'Gemini CLI not found. Make sure `gemini` is in PATH.',
              'CLI_NOT_FOUND',
              'gemini',
              false,
            ),
          )
        } else {
          reject(
            new AdapterError(
              err.message,
              'UNKNOWN',
              'gemini',
              false,
            ),
          )
        }
      })

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
          return
        }

        if (code === 1 && stderr.toLowerCase().includes('context length')) {
          reject(
            new AdapterError(
              `Gemini context length exceeded: ${stderr.trim()}`,
              'CONTEXT_LENGTH_EXCEEDED',
              'gemini',
              true,
            ),
          )
          return
        }

        reject(
          new AdapterError(
            `Gemini exited with code ${code}: ${stderr.trim()}`,
            'UNKNOWN',
            'gemini',
            false,
          ),
        )
      })
    })

    return {
      content,
      cli: 'gemini',
      model: params.model ?? 'gemini',
      latencyMs: Date.now() - startMs,
      routingMeta: {
        reason: 'adapter-invoke',
        toolRequirement: 'code_analysis',
      },
    }
  }

  async checkHealth(): Promise<AdapterHealthResult> {
    return new Promise((resolve) => {
      const proc = spawn('gemini', ['--version'], { shell: false })
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
