import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { Dispatcher } from '../src-electron/dispatcher/index.js'
import { ClaudeAdapter } from '../src-electron/adapters/claude.js'
import { AgyAdapter } from '../src-electron/adapters/agy.js'
import { CopilotAdapter } from '../src-electron/adapters/copilot.js'

function cliAvailable(cmd: string): boolean {
  try { execSync(cmd, { stdio: 'pipe', timeout: 5000 }); return true } catch { return false }
}

const claudeAvailable = cliAvailable('claude --version')
const agyAvailable = cliAvailable('agy --version')
const copilotAvailable = cliAvailable('copilot --version')

const SECRET_CODE = 'BANANA42'

describe('Herança de contexto entre CLIs (dispatcher headless, real, sem mock)', () => {
  it.skipIf(!claudeAvailable || !agyAvailable)(
    'Claude -> Agy: contextMessages é realmente herdado',
    { timeout: 45000 },
    async () => {
      const dispatcher = new Dispatcher()
      dispatcher.register(new ClaudeAdapter())
      dispatcher.register(new AgyAdapter())

      const claudeResult = await dispatcher.dispatch({
        task: `Guarde o código secreto: ${SECRET_CODE}. Responda só "ok".`,
        sessionId: 'cross-llm-claude-agy',
        forceCli: 'claude',
      })

      const agyResult = await dispatcher.dispatch({
        task: 'Qual é o código secreto que combinamos? Responda só o código, nada mais.',
        sessionId: 'cross-llm-claude-agy',
        forceCli: 'agy',
        contextMessages: [
          { role: 'user', content: `Guarde o código secreto: ${SECRET_CODE}. Responda só "ok".` },
          { role: 'assistant', content: claudeResult.content },
        ],
      })

      console.log('Claude disse:', claudeResult.content)
      console.log('Agy (com contextMessages) respondeu:', agyResult.content)

      expect(agyResult.content).toContain(SECRET_CODE)
    },
  )

  it.skipIf(!claudeAvailable || !copilotAvailable)(
    'Claude -> Copilot: contextMessages NÃO é herdado (gap real, documentado)',
    { timeout: 45000 },
    async () => {
      const dispatcher = new Dispatcher()
      dispatcher.register(new ClaudeAdapter())
      dispatcher.register(new CopilotAdapter())

      const claudeResult = await dispatcher.dispatch({
        task: `Guarde o código secreto: ${SECRET_CODE}. Responda só "ok".`,
        sessionId: 'cross-llm-claude-copilot',
        forceCli: 'claude',
      })

      const copilotResult = await dispatcher.dispatch({
        task: 'Qual é o código secreto que combinamos? Se você não souber, diga apenas "não sei".',
        sessionId: 'cross-llm-claude-copilot',
        forceCli: 'copilot',
        contextMessages: [
          { role: 'user', content: `Guarde o código secreto: ${SECRET_CODE}. Responda só "ok".` },
          { role: 'assistant', content: claudeResult.content },
        ],
      })

      console.log('Claude disse:', claudeResult.content)
      console.log('Copilot (com contextMessages, mas ignorado pelo adapter) respondeu:', copilotResult.content)

      expect(copilotResult.content).not.toContain(SECRET_CODE)
    },
  )
})
