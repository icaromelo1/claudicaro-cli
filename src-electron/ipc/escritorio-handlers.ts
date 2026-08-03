import { ipcMain, type BrowserWindow } from 'electron'
import { EscritorioWatcher } from '../escritorio/watcher.js'
import type { EventoEscritorio } from '../escritorio/consultas.js'

export function setupEscritorioHandlers(janela: BrowserWindow): EscritorioWatcher {
  const watcher = new EscritorioWatcher()

  watcher.iniciar((ev: EventoEscritorio) => {
    if (!janela.isDestroyed()) {
      janela.webContents.send('escritorio:evento', ev)
    }
  })

  ipcMain.handle('escritorio:disponivel', async () => watcher.disponivel)
  ipcMain.handle('escritorio:estado', async () => watcher.estado())

  janela.on('closed', () => watcher.parar())

  return watcher
}
