// copilot.ts — Claudicaro Adapter: GitHub Copilot CLI
// Versão: 1.0 — 2026-05-12

import { spawn } from 'child_process'
import type {
  IAdapter,
  AdapterInvokeParams,
  AdapterInvokeResult,
  AdapterHealthResult,
} from '../dispatcher/types.js'
import { AdapterError } from '../dispatcher/types.js'

export class CopilotAdapter implements IAdapter {
  readonly name = 'copilot'
  readonly role = 'CONSELHEIRO' as const

  async invoke(params: AdapterInvokeParams): Promise<AdapterInvokeResult> {
    const startMs = Date.now()

    // Route to explain or suggest based on task content
    const subcommand = params.task.toLowerCase().includes('explain') ? 'explain' : 'suggest'
    const args = ['copilot', subcommand, params.task]

    const content = await new Promise<string>((resolve, reject) => {
      const proc = spawn('gh', args, { shell: false })
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
              'gh CLI not found. Make sure `gh` is in PATH.',
              'CLI_NOT_FOUND',
              'copilot',
              false,
            ),
          )
        } else {
          reject(
            new AdapterError(
              err.message,
              'UNKNOWN',
              'copilot',
              false,
            ),
          )
        }
      })

      proc.on('close', (code) => {
        if (code === 0) {
          // CONSELHEIRO: capture output only, never execute suggested commands
          resolve(stdout)
          return
        }

        reject(
          new AdapterError(
            `gh copilot exited with code ${code}: ${stderr.trim()}`,
            'UNKNOWN',
            'copilot',
            false,
          ),
        )
      })
    })

    return {
      content,
      cli: 'copilot',
      model: params.model ?? 'copilot',
      latencyMs: Date.now() - startMs,
      routingMeta: {
        reason: 'conselheiro-suggestion',
        toolRequirement: 'copilot',
      },
    }
  }

  async checkHealth(): Promise<AdapterHealthResult> {
    return new Promise((resolve) => {
      // gh extension list | grep copilot
      const proc = spawn('sh', ['-c', 'gh extension list | grep copilot'], { shell: false })
      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

      proc.on('error', (err: NodeJS.ErrnoException) => {
        resolve({ available: false, error: err.message })
      })

      proc.on('close', (code) => {
        if (code === 0 && stdout.trim().length > 0) {
          resolve({ available: true, version: stdout.trim() })
        } else {
          resolve({
            available: false,
            error: stderr.trim() || 'gh-copilot extension not found',
          })
        }
      })
    })
  }

  async dumpContext(_sessionId: string): Promise<string> {
    return ''
  }
}
