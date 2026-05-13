import { contextBridge, ipcRenderer } from 'electron'

const claudicaro = {
  dispatch: (task: string, sessionId: string, forceCli?: string): Promise<unknown> =>
    ipcRenderer.invoke('cc:dispatch', { task, sessionId, forceCli }),

  cancel: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('cc:dispatch:cancel', { sessionId }),

  onToken: (cb: (chunk: string, sessionId: string) => void): (() => void) => {
    const handler = (_: unknown, data: { chunk: string; sessionId: string }) =>
      cb(data.chunk, data.sessionId)
    ipcRenderer.on('cc:token', handler)
    return () => ipcRenderer.off('cc:token', handler)
  },

  session: {
    create: (title?: string, orchestratorConfig?: string): Promise<{ id: string; title: string; orchestratorConfig?: string }> =>
      ipcRenderer.invoke('cc:session:create', { title, orchestratorConfig }),
    list: (): Promise<unknown[]> =>
      ipcRenderer.invoke('cc:session:list'),
    history: (sessionId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('cc:session:history', { sessionId }),
    delete: (id: string): Promise<null> =>
      ipcRenderer.invoke('cc:session:delete', { id }),
    rename: (id: string, title: string): Promise<null> =>
      ipcRenderer.invoke('cc:session:rename', { id, title }),
    pin: (id: string, pinned: boolean): Promise<null> =>
      ipcRenderer.invoke('cc:session:pin', { id, pinned }),
    search: (query: string): Promise<unknown[]> =>
      ipcRenderer.invoke('cc:session:search', { query }),
    openDir: (sessionId: string): Promise<null> =>
      ipcRenderer.invoke('cc:session:open-dir', { sessionId }),
    moveGroup: (sessionId: string, groupId: string | null): Promise<null> =>
      ipcRenderer.invoke('cc:session:move-group', { sessionId, groupId }),
  },

  group: {
    create: (name: string, color?: string): Promise<{ id: string; name: string; color: string }> =>
      ipcRenderer.invoke('cc:group:create', { name, color }),
    list: (): Promise<{ id: string; name: string; color: string }[]> =>
      ipcRenderer.invoke('cc:group:list'),
  },

  tokens: {
    budget: (sessionId: string): Promise<unknown> =>
      ipcRenderer.invoke('cc:tokens:budget', { sessionId }),
  },

  health: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('cc:health'),

  logs: (limit?: number): Promise<unknown[]> =>
    ipcRenderer.invoke('cc:logs', { limit }),

  auth: {
    signIn: () => ipcRenderer.invoke('cc:auth:signin'),
    signOut: () => ipcRenderer.invoke('cc:auth:signout'),
    getState: () => ipcRenderer.invoke('cc:auth:state'),
  },

  settings: {
    get: (): Promise<unknown> => ipcRenderer.invoke('cc:settings:get'),
    save: (s: unknown): Promise<void> => ipcRenderer.invoke('cc:settings:save', s),
  },

  maintenance: {
    backup: (destDir?: string) => ipcRenderer.invoke('cc:maintenance:backup', { destDir }),
    listBackups: () => ipcRenderer.invoke('cc:maintenance:backups'),
    checkUpdate: () => ipcRenderer.invoke('cc:maintenance:update-check'),
  },
}

contextBridge.exposeInMainWorld('claudicaro', claudicaro)

export type ClaudicaroBridge = typeof claudicaro
