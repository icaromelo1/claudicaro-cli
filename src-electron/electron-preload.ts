import { contextBridge, ipcRenderer } from 'electron'

const claudicaro = {
  dispatch: (task: string, sessionId: string): Promise<unknown> =>
    ipcRenderer.invoke('cc:dispatch', { task, sessionId }),

  onToken: (cb: (chunk: string, sessionId: string) => void): (() => void) => {
    const handler = (_: unknown, data: { chunk: string; sessionId: string }) =>
      cb(data.chunk, data.sessionId)
    ipcRenderer.on('cc:token', handler)
    return () => ipcRenderer.off('cc:token', handler)
  },

  session: {
    create: (title?: string): Promise<{ id: string; title: string }> =>
      ipcRenderer.invoke('cc:session:create', { title }),
    list: (): Promise<unknown[]> =>
      ipcRenderer.invoke('cc:session:list'),
    history: (sessionId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('cc:session:history', { sessionId }),
  },

  health: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('cc:health'),
}

contextBridge.exposeInMainWorld('claudicaro', claudicaro)

export type ClaudicaroBridge = typeof claudicaro
