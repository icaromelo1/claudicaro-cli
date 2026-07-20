import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { Dispatcher } from '../src-electron/dispatcher/index.js'
import { ClaudeAdapter } from '../src-electron/adapters/claude.js'
import { SessionManager } from '../src-electron/session/session-manager.js'

const claudeAvailable = (() => {
  try { execSync('claude --version', { stdio: 'pipe', timeout: 5000 }); return true } catch { return false }
})()

describe('Chat dispatch (E2E, mesmo caminho que a UI usa)', () => {
  it.skipIf(!claudeAvailable)('dispatches a real message through ClaudeAdapter and gets a real response', { timeout: 30000 }, async () => {
    const dispatcher = new Dispatcher()
    dispatcher.register(new ClaudeAdapter())

    const result = await dispatcher.dispatch({
      task: 'Responda apenas com a palavra: funcionando',
      sessionId: 'chat-dispatch-e2e',
      forceCli: 'claude',
    })

    expect(result.content.toLowerCase()).toContain('funcionando')
    expect(result.cli).toBe('claude')
    expect(result.model).toBeTruthy()
    expect(result.cliSessionId).toBeTruthy()
  })

  // Só roda com better-sqlite3 recompilado pro Node do sistema (`npm rebuild better-sqlite3`),
  // não pro Electron — os dois ABIs conflitam. Pulado por padrão pra não quebrar `npm test`.
  // Pra rodar: npm rebuild better-sqlite3 && RUN_REAL_DB_TEST=1 npx vitest run tests/chat-dispatch.test.ts
  // (depois `npx electron-rebuild -f -w better-sqlite3 -w node-pty` pra devolver o app ao normal)
  it.skipIf(!claudeAvailable || !process.env.RUN_REAL_DB_TEST)('creates a real Session, dispatches, persists and reads it back exactly like the app does', { timeout: 30000 }, async () => {
    const dispatcher = new Dispatcher()
    dispatcher.register(new ClaudeAdapter())
    const sessionManager = new SessionManager()

    const sessionId = await sessionManager.createSession('Teste E2E de chat')
    await sessionManager.persistMessage(sessionId, { role: 'user', content: 'Responda apenas com a palavra: funcionando' })

    const result = await dispatcher.dispatch({
      task: 'Responda apenas com a palavra: funcionando',
      sessionId,
      forceCli: 'claude',
    })

    await sessionManager.persistMessage(sessionId, {
      role: 'assistant',
      content: result.content,
      cli: result.cli,
      model: result.model,
      routingMeta: result.routingMeta,
      tokens: result.tokens,
      latencyMs: result.latencyMs,
    })
    if (result.cliSessionId) {
      await sessionManager.saveCliSession(sessionId, result.cli, result.cliSessionId)
    }

    const history = await sessionManager.getHistory(sessionId)
    const sessions = await sessionManager.listSessions()
    const persistedSession = sessions.find((s) => s.id === sessionId)

    console.log('SESSÃO REAL PERSISTIDA:', JSON.stringify({ session: persistedSession, history }, null, 2))

    expect(persistedSession).toBeDefined()
    expect(persistedSession?.messageCount).toBe(2)
    expect(history).toHaveLength(2)
    expect(history[0]?.role).toBe('user')
    expect(history[1]?.role).toBe('assistant')
    expect(history[1]?.content.toLowerCase()).toContain('funcionando')

    // Sem cleanup de propósito — a sessão fica visível no app (sidebar/Histórico) pra inspeção real.
  })
})
