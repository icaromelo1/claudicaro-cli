import { contextBridge, ipcRenderer } from 'electron'

const icarus = {
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

  canvas: {
    listCards: (sessionId: string): Promise<unknown[]> => ipcRenderer.invoke('canvas:card:list', { sessionId }),
    listLinks: (sessionId: string): Promise<unknown[]> => ipcRenderer.invoke('canvas:link:list', { sessionId }),
    createCard: (sessionId: string, cli: string, x: number, y: number): Promise<unknown> =>
      ipcRenderer.invoke('canvas:card:create', { sessionId, cli, x, y }),
    createLinkedCard: (sessionId: string, parentCardId: string, childCli: string, x: number, y: number): Promise<unknown> =>
      ipcRenderer.invoke('canvas:card:create-linked', { sessionId, parentCardId, childCli, x, y }),
    moveCard: (cardId: string, x: number, y: number): Promise<null> =>
      ipcRenderer.invoke('canvas:card:move', { cardId, x, y }),
    deleteCard: (cardId: string): Promise<null> =>
      ipcRenderer.invoke('canvas:card:delete', { cardId }),
    createTask: (sessionId: string, cli: string, x: number, y: number, task: string): Promise<unknown> =>
      ipcRenderer.invoke('canvas:card:create-task', { sessionId, cli, x, y, task }),
    onTaskToken: (cb: (cardId: string, chunk: string) => void): (() => void) => {
      const handler = (_: unknown, data: { cardId: string; chunk: string }) => cb(data.cardId, data.chunk)
      ipcRenderer.on('task:token', handler)
      return () => ipcRenderer.off('task:token', handler)
    },
    onTaskDone: (cb: (cardId: string, content: string) => void): (() => void) => {
      const handler = (_: unknown, data: { cardId: string; content: string }) => cb(data.cardId, data.content)
      ipcRenderer.on('task:done', handler)
      return () => ipcRenderer.off('task:done', handler)
    },
    createPeerGroup: (
      sessionId: string,
      members: { cli: string; label: string }[],
      turnOrder: 'round-robin' | 'roundtable',
      maxRounds: number,
      openingPrompt: string,
      positions: { x: number; y: number }[],
    ): Promise<unknown> =>
      ipcRenderer.invoke('canvas:peer:create', { sessionId, members, turnOrder, maxRounds, openingPrompt, positions }),
    stopPeerGroup: (groupId: string): Promise<null> => ipcRenderer.invoke('canvas:peer:stop', { groupId }),
    setPeerTurnOrder: (groupId: string, turnOrder: 'round-robin' | 'roundtable'): Promise<null> =>
      ipcRenderer.invoke('canvas:peer:set-turn-order', { groupId, turnOrder }),
    listPeerGroups: (sessionId: string): Promise<unknown[]> => ipcRenderer.invoke('canvas:peer:list', { sessionId }),
    listPeerTurns: (cardId: string): Promise<unknown[]> => ipcRenderer.invoke('canvas:peer:turns', { cardId }),
    onPeerTurn: (cb: (cardId: string, round: number, content: string) => void): (() => void) => {
      const handler = (_: unknown, data: { cardId: string; round: number; content: string }) =>
        cb(data.cardId, data.round, data.content)
      ipcRenderer.on('peer:turn', handler)
      return () => ipcRenderer.off('peer:turn', handler)
    },
  },

  pty: {
    write: (cardId: string, data: string): Promise<null> =>
      ipcRenderer.invoke('pty:write', { cardId, data }),
    resize: (cardId: string, cols: number, rows: number): Promise<null> =>
      ipcRenderer.invoke('pty:resize', { cardId, cols, rows }),
    kill: (cardId: string): Promise<null> =>
      ipcRenderer.invoke('pty:kill', { cardId }),
    onData: (cb: (cardId: string, chunk: string) => void): (() => void) => {
      const handler = (_: unknown, data: { cardId: string; chunk: string }) =>
        cb(data.cardId, data.chunk)
      ipcRenderer.on('pty:data', handler)
      return () => ipcRenderer.off('pty:data', handler)
    },
  },

  escritorio: {
    disponivel: (): Promise<boolean> => ipcRenderer.invoke('escritorio:disponivel'),
    estado: (): Promise<unknown | null> => ipcRenderer.invoke('escritorio:estado'),
    onEvento: (cb: (evento: unknown) => void): (() => void) => {
      const handler = (_: unknown, evento: unknown) => cb(evento)
      ipcRenderer.on('escritorio:evento', handler)
      return () => ipcRenderer.off('escritorio:evento', handler)
    },
  },
}

contextBridge.exposeInMainWorld('icarus', icarus)

export type IcarusBridge = typeof icarus
