import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { PtyManager } from '../src-electron/pty/pty-manager.js'
import { buildHandoffContext } from '../src-electron/canvas/handoff.js'
import { sanitizeInput } from '../src-electron/sanitize/index.js'

function cliAvailable(cmd: string): boolean {
  try { execSync(cmd, { stdio: 'pipe', timeout: 5000 }); return true } catch { return false }
}

const codexAvailable = cliAvailable('codex --version')
const agyAvailable = cliAvailable('agy --version')

const SECRET_CODE = 'KIWI77'
const BUSY_MARKERS = ['booting', 'starting', 'signing in', 'esc to interrupt', 'loading']

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitUntilSettled(getOutput: () => string, opts: { timeoutMs: number; stableChecks?: number }): Promise<void> {
  const stableChecksNeeded = opts.stableChecks ?? 3
  const deadline = Date.now() + opts.timeoutMs
  let lastLength = -1
  let stableCount = 0

  while (Date.now() < deadline) {
    await wait(1000)
    const current = getOutput()
    const recentTail = current.slice(-500).toLowerCase()
    const isBusy = BUSY_MARKERS.some((marker) => recentTail.includes(marker))
    const isStableLength = current.length === lastLength

    if (!isBusy && isStableLength) {
      stableCount++
      if (stableCount >= stableChecksNeeded) return
    } else {
      stableCount = 0
    }
    lastLength = current.length
  }
}

function extractResponse(fullOutput: string, baselineLength: number, typedMessage: string): string {
  const newContent = fullOutput.slice(baselineLength)
  const withoutEcho = newContent.split(typedMessage).join('')
  return sanitizeInput(withoutEcho)
}

describe('Herança de contexto entre CLIs (Canvas/PTY real, scrollback-prefix)', () => {
  it.skipIf(!codexAvailable || !agyAvailable)(
    'Agy -> Codex: scrollback do pai vira contexto do filho de verdade',
    { timeout: 180000 },
    async () => {
      const manager = new PtyManager()
      let parentOutput = ''
      manager.onData('parent-agy', (chunk) => { parentOutput += chunk })

      manager.create('parent-agy', 'agy', { bypass: true })
      await waitUntilSettled(() => parentOutput, { timeoutMs: 30000 })

      const parentBaseline = parentOutput.length
      const parentMessage = `Guarde o código secreto: ${SECRET_CODE}. Responda só ok.`
      manager.write('parent-agy', `${parentMessage}\r`)
      await waitUntilSettled(() => parentOutput, { timeoutMs: 45000 })
      manager.kill('parent-agy')

      const parentResponse = extractResponse(parentOutput, parentBaseline, parentMessage)
      const parentFullScrollback = sanitizeInput(parentOutput)

      const handoff = buildHandoffContext('agy', 'codex', undefined, parentFullScrollback)

      let childOutput = ''
      manager.onData('child-codex', (chunk) => { childOutput += chunk })
      manager.create('child-codex', 'codex', { bypass: true })
      await waitUntilSettled(() => childOutput, { timeoutMs: 100000 })

      const childBaseline = childOutput.length
      const childMessage = `${handoff.initialInput}Qual é o código secreto? Responda só o código.`
      manager.write('child-codex', `${childMessage}\r`)
      await waitUntilSettled(() => childOutput, { timeoutMs: 45000 })
      manager.kill('child-codex')

      const childResponse = extractResponse(childOutput, childBaseline, childMessage)

      console.log('--- Resposta do Agy (pai), eco removido ---')
      console.log(parentResponse.slice(0, 1500))
      console.log('--- Resposta do Codex (filho, com handoff), eco removido ---')
      console.log(childResponse.slice(0, 1500))

      expect(childResponse).toContain(SECRET_CODE)
    },
  )
})
