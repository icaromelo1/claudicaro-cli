import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { dispatcher } from './dispatcher/index.js'
import { ClaudeAdapter, GeminiAdapter, CopilotAdapter } from './adapters/index.js'
import { SessionManager } from './session/index.js'

const platform = process.platform || os.platform()
const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Register adapters at startup
dispatcher.register(new ClaudeAdapter())
dispatcher.register(new GeminiAdapter())
dispatcher.register(new CopilotAdapter())

const sessionManager = new SessionManager()

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

    return result
  })

  ipcMain.handle('cc:session:create', async (_, { title }: { title?: string }) => {
    const id = await sessionManager.createSession(title)
    return { id, title: title ?? 'Nova conversa' }
  })

  ipcMain.handle('cc:session:list', async () => {
    return sessionManager.listSessions()
  })

  ipcMain.handle('cc:session:history', async (_, { sessionId }: { sessionId: string }) => {
    return sessionManager.getHistory(sessionId)
  })

  ipcMain.handle('cc:health', async () => {
    return dispatcher.checkHealth()
  })
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

  if (process.env.DEBUGGING) {
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools()
    })
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
