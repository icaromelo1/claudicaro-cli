import { ipcMain, shell } from 'electron'
import os from 'os'
import type { Dispatcher } from '../dispatcher/index.js'
import type { SessionManager } from '../session/session-manager.js'
import type { TokenTracker } from '../session/token-tracker.js'
import type { DispatcherLogger } from '../dispatcher/logger.js'
import type { GoogleAuth } from '../auth/google.js'
import type { SettingsStore, AppSettings } from '../config/settings-store.js'

export function setupIpcHandlers(
  sessionManager: SessionManager,
  tokenTracker: TokenTracker,
  dispatcher: Dispatcher,
  logger: DispatcherLogger,
  googleAuth: GoogleAuth,
  settingsStore: SettingsStore,
): void {
  const controllers = new Map<string, AbortController>()

  ipcMain.handle('cc:dispatch', async (event, { task, sessionId, forceCli }: { task: string; sessionId: string; forceCli?: string }) => {
    await sessionManager.persistMessage(sessionId, { role: 'user', content: task })

    const cli = forceCli ?? 'claude'
    const cliSessionId = await sessionManager.getCliSession(sessionId, cli) ?? undefined

    const recentMessages = await sessionManager.getLastNMessages(sessionId, 10)
    const contextMessages = recentMessages.map((m) => ({ role: m.role, content: m.content }))

    const controller = new AbortController()
    controllers.set(sessionId, controller)

    try {
      const result = await dispatcher.dispatch({
        task,
        sessionId,
        forceCli,
        cliSessionId,
        contextMessages,
        abortSignal: controller.signal,
        onToken: (chunk) => event.sender.send('cc:token', { chunk, sessionId }),
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

      if (result.tokens != null) {
        await tokenTracker.track({
          sessionId,
          cli: result.cli,
          tokens: result.tokens,
          latencyMs: result.latencyMs,
          timestamp: new Date(),
        })
      }

      return result
    } finally {
      controllers.delete(sessionId)
    }
  })

  ipcMain.handle('cc:dispatch:cancel', async (_, { sessionId }: { sessionId: string }) => {
    const controller = controllers.get(sessionId)
    if (controller) {
      controller.abort()
      controllers.delete(sessionId)
    }
    return null
  })

  ipcMain.handle('cc:session:create', async (_, { title, orchestratorConfig }: { title?: string; orchestratorConfig?: string }) => {
    const id = await sessionManager.createSession(title, orchestratorConfig)
    return { id, title: title ?? 'Nova conversa', orchestratorConfig }
  })

  ipcMain.handle('cc:session:list', async () => {
    return sessionManager.listSessions()
  })

  ipcMain.handle('cc:session:history', async (_, { sessionId }: { sessionId: string }) => {
    return sessionManager.getHistory(sessionId)
  })

  ipcMain.handle('cc:tokens:budget', async (_, { sessionId }: { sessionId: string }) => {
    return tokenTracker.getSessionBudget(sessionId)
  })

  ipcMain.handle('cc:health', async () => {
    return dispatcher.checkHealth()
  })

  ipcMain.handle('cc:logs', async (_, { limit }: { limit?: number } = {}) => {
    return logger.getLogs(limit)
  })

  ipcMain.handle('cc:auth:signin', async () => googleAuth.signIn())
  ipcMain.handle('cc:auth:signout', () => { googleAuth.signOut(); return null })
  ipcMain.handle('cc:auth:state', () => googleAuth.getState())

  ipcMain.handle('cc:settings:get', async () => settingsStore.get())
  ipcMain.handle('cc:settings:save', async (_, settings: AppSettings) => {
    try {
      await settingsStore.save(settings)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('cc:session:delete', async (_, { id }: { id: string }) => {
    await sessionManager.deleteSession(id)
    return null
  })

  ipcMain.handle('cc:session:rename', async (_, { id, title }: { id: string; title: string }) => {
    await sessionManager.renameSession(id, title)
    return null
  })

  ipcMain.handle('cc:session:pin', async (_, { id, pinned }: { id: string; pinned: boolean }) => {
    await sessionManager.pinSession(id, pinned)
    return null
  })

  ipcMain.handle('cc:session:search', async (_, { query }: { query: string }) => {
    return sessionManager.searchSessions(query)
  })

  ipcMain.handle('cc:session:open-dir', async (_, { sessionId }: { sessionId: string }) => {
    const sessions = await sessionManager.listSessions()
    const session = sessions.find((s) => s.id === sessionId)
    const dir = (session as { workingDir?: string })?.workingDir ?? os.homedir()
    await shell.openPath(dir)
    return null
  })

  ipcMain.handle('cc:group:create', async (_, { name, color }: { name: string; color?: string }) => {
    return sessionManager.createGroup(name, color)
  })

  ipcMain.handle('cc:group:list', async () => {
    return sessionManager.listGroups()
  })

  ipcMain.handle('cc:session:move-group', async (_, { sessionId, groupId }: { sessionId: string; groupId: string | null }) => {
    await sessionManager.moveToGroup(sessionId, groupId)
    return null
  })

  ipcMain.handle('cc:maintenance:backup', async (_, { destDir }: { destDir?: string } = {}) => {
    const { BackupManager } = await import('../maintenance/backup.js')
    return new BackupManager().createBackup(destDir)
  })
  ipcMain.handle('cc:maintenance:backups', async () => {
    const { BackupManager } = await import('../maintenance/backup.js')
    return new BackupManager().listBackups()
  })
  ipcMain.handle('cc:maintenance:update-check', async () => {
    const { UpdateChecker } = await import('../maintenance/update-checker.js')
    return new UpdateChecker().checkLatest()
  })
}
