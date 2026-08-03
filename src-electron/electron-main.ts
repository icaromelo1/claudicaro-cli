import { app, BrowserWindow } from 'electron'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { dispatcher } from './dispatcher/index.js'
import { ClaudeAdapter, AgyAdapter, CopilotAdapter } from './adapters/index.js'
import { SessionManager, TokenTracker } from './session/index.js'
import { logger } from './dispatcher/logger.js'
import { googleAuth } from './auth/index.js'
import { settingsStore } from './config/index.js'
import { setupIpcHandlers } from './ipc/index.js'
import { setupPtyHandlers } from './ipc/pty-handlers.js'
import { setupEscritorioHandlers } from './ipc/escritorio-handlers.js'
import { PtyManager } from './pty/pty-manager.js'
import { CanvasManager } from './canvas/canvas-manager.js'

const platform = process.platform || os.platform()
const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Suppress Chromium DevTools CDP noise (Autofill.enable / setAddresses not implemented)
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication')

// Register adapters at startup
dispatcher.register(new ClaudeAdapter())
dispatcher.register(new AgyAdapter())
dispatcher.register(new CopilotAdapter())

const sessionManager = new SessionManager()
const tokenTracker = new TokenTracker()
const ptyManager = new PtyManager()
const canvasManager = new CanvasManager()

let mainWindow: BrowserWindow | undefined

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

  setupEscritorioHandlers(mainWindow)

  mainWindow.on('closed', () => {
    mainWindow = undefined
  })
}

void app.whenReady().then(() => {
  setupIpcHandlers(sessionManager, tokenTracker, dispatcher, logger, googleAuth, settingsStore)
  setupPtyHandlers(ptyManager, canvasManager, settingsStore, dispatcher)
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
