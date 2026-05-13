import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { dispatcher } from './dispatcher/index.js'
import { ClaudeAdapter, GeminiAdapter, CopilotAdapter } from './adapters/index.js'
import { SessionManager, TokenTracker } from './session/index.js'
import { logger } from './dispatcher/logger.js'
import { googleAuth } from './auth/index.js'
import { settingsStore } from './config/index.js'
import type { AppSettings } from './config/index.js'

const platform = process.platform || os.platform()
const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Suppress Chromium DevTools CDP noise (Autofill.enable / setAddresses not implemented)
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication')

// Register adapters at startup
dispatcher.register(new ClaudeAdapter())
dispatcher.register(new GeminiAdapter())
dispatcher.register(new CopilotAdapter())

const sessionManager = new SessionManager()
const tokenTracker = new TokenTracker()

let mainWindow: BrowserWindow | undefined

function setupIpcHandlers(): void {
  ipcMain.handle('cc:dispatch', async (event, { task, sessionId }: { task: string; sessionId: string }) => {
    await sessionManager.persistMessage(sessionId, { role: 'user', content: task })

    const result = await dispatcher.dispatch({
      task,
      sessionId,
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
  ipcMain.handle('cc:settings:save', async (_, settings: AppSettings) => settingsStore.save(settings))
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'),
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    useContentSize: true,
    titleBarStyle: platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0B0B0E',
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER ?? '',
          'electron-preload' + (process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION ?? '.cjs'),
        ),
      ),
    },
  })

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL ?? '')
  } else {
    await mainWindow.loadFile('index.html')
  }

  // DevTools only on explicit --devtools flag to avoid CDP noise (Autofill errors)
  if (process.env.DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined
  })
}

void app.whenReady().then(() => {
  setupIpcHandlers()
  void createWindow()
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === undefined) {
    void createWindow()
  }
})
