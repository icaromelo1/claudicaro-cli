import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { CopilotAdapter } from '../src-electron/adapters/copilot.js'

const copilotAvailable = (() => {
  try { execSync('copilot --version', { stdio: 'pipe', timeout: 5000 }); return true } catch { return false }
})()

describe('CopilotAdapter (E2E, real binary)', () => {
  it.skipIf(!copilotAvailable)('checkHealth reports available against the standalone binary', async () => {
    const adapter = new CopilotAdapter()
    const health = await adapter.checkHealth()
    expect(health.available).toBe(true)
    expect(health.version).toMatch(/Copilot/i)
  })

  it.skipIf(!copilotAvailable)('invoke() parses JSONL output and returns content + a real cliSessionId', { timeout: 30000 }, async () => {
    const adapter = new CopilotAdapter()
    const result = await adapter.invoke({
      task: 'Responda apenas com a palavra OK, sem mais nada.',
      sessionId: 'test-session',
    })

    expect(result.content.toUpperCase()).toContain('OK')
    expect(result.cliSessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.cli).toBe('copilot')
  })

  it.skipIf(!copilotAvailable)('invoke() with cliSessionId resumes the same session id', { timeout: 60000 }, async () => {
    const adapter = new CopilotAdapter()
    const first = await adapter.invoke({
      task: 'Lembre o número 42. Responda apenas: memorizado.',
      sessionId: 'test-session',
    })

    const second = await adapter.invoke({
      task: 'Qual número eu pedi pra você lembrar? Responda só o número.',
      sessionId: 'test-session',
      cliSessionId: first.cliSessionId,
    })

    expect(second.content).toContain('42')
  })
})
