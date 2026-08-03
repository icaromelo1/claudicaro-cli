import { ipcMain } from 'electron'
import type { PtyManager } from '../pty/pty-manager.js'
import type { CanvasManager, CanvasCardRecord, PeerTurnOrder } from '../canvas/canvas-manager.js'
import { buildHandoffContext } from '../canvas/handoff.js'
import { PeerGroupManager, type PeerMemberInput } from '../canvas/peer-group-manager.js'
import type { SettingsStore } from '../config/settings-store.js'
import type { Dispatcher } from '../dispatcher/index.js'
import { identidadeDoCard, opcoesDeSpawnDoCard } from '../escritorio/identidade.js'
import { prisma } from '../../src/db/client.js'

const SCROLLBACK_CHUNK_LIMIT = 200
const scrollbackBuffers = new Map<string, string[]>()

async function opcoesDoCard(
  card: { label?: string | null },
  sessionId: string,
): Promise<{ escritorioId?: string; cwd?: string }> {
  const sessao = (await prisma.session.findUnique({ where: { id: sessionId } })) as
    | { workingDir?: string | null }
    | null
  return opcoesDeSpawnDoCard(card, sessao?.workingDir)
}

function trackScrollback(cardId: string, chunk: string): void {
  const chunks = scrollbackBuffers.get(cardId) ?? []
  chunks.push(chunk)
  if (chunks.length > SCROLLBACK_CHUNK_LIMIT) chunks.shift()
  scrollbackBuffers.set(cardId, chunks)
}

export function setupPtyHandlers(
  ptyManager: PtyManager,
  canvasManager: CanvasManager,
  settingsStore: SettingsStore,
  dispatcher: Dispatcher,
): void {
  const peerGroupManager = new PeerGroupManager(canvasManager, dispatcher)

  function attachSession(cardId: string, event: Electron.IpcMainInvokeEvent): void {
    ptyManager.onData(cardId, (chunk) => {
      trackScrollback(cardId, chunk)
      event.sender.send('pty:data', { cardId, chunk })
    })
  }

  ipcMain.handle('canvas:card:list', async (_, { sessionId }: { sessionId: string }) => canvasManager.listCards(sessionId))
  ipcMain.handle('canvas:link:list', async (_, { sessionId }: { sessionId: string }) => canvasManager.listLinks(sessionId))

  ipcMain.handle('canvas:card:create', async (event, { sessionId, cli, x, y }: { sessionId: string; cli: string; x: number; y: number }) => {
    const card = await canvasManager.createCard(sessionId, cli, x, y)
    const bypass = (await settingsStore.get()).defaultOrchestrator.permissionMode === 'bypass'
    ptyManager.create(card.id, cli, {
      bypass,
      ...(await opcoesDoCard(card, sessionId)),
    })
    attachSession(card.id, event)
    return card
  })

  ipcMain.handle('canvas:card:create-linked', async (
    event,
    { sessionId, parentCardId, childCli, x, y }: { sessionId: string; parentCardId: string; childCli: string; x: number; y: number },
  ) => {
    const cards = await canvasManager.listCards(sessionId)
    const parentCard = cards.find((c) => c.id === parentCardId)
    if (!parentCard) throw new Error(`Card pai ${parentCardId} não encontrado`)

    const parentCliSessionId = ptyManager.getCapturedSessionId(parentCardId)
    const parentScrollback = scrollbackBuffers.get(parentCardId)?.join('') ?? ''
    const handoff = buildHandoffContext(parentCard.cli, childCli, parentCliSessionId, parentScrollback)

    const childCard = await canvasManager.createCard(sessionId, childCli, x, y)
    await canvasManager.createLink(sessionId, parentCardId, childCard.id, handoff.contextSummary)

    const bypass = (await settingsStore.get()).defaultOrchestrator.permissionMode === 'bypass'
    ptyManager.create(childCard.id, childCli, {
      bypass,
      ...(await opcoesDoCard(childCard, sessionId)),
      ...(handoff.resumeSessionId ? { resumeSessionId: handoff.resumeSessionId } : {}),
      ...(handoff.initialInput ? { initialInput: handoff.initialInput } : {}),
    })
    attachSession(childCard.id, event)

    return { card: childCard, link: { sessionId, fromCardId: parentCardId, toCardId: childCard.id, contextSummary: handoff.contextSummary } }
  })

  ipcMain.handle('canvas:card:move', async (_, { cardId, x, y }: { cardId: string; x: number; y: number }) => {
    await canvasManager.updatePosition(cardId, x, y)
    return null
  })

  ipcMain.handle('canvas:card:delete', async (_, { cardId }: { cardId: string }) => {
    ptyManager.kill(cardId)
    scrollbackBuffers.delete(cardId)
    await canvasManager.deleteCard(cardId)
    return null
  })

  ipcMain.handle('pty:write', async (_, { cardId, data }: { cardId: string; data: string }) => {
    ptyManager.write(cardId, data)
    return null
  })

  ipcMain.handle('pty:resize', async (_, { cardId, cols, rows }: { cardId: string; cols: number; rows: number }) => {
    ptyManager.resize(cardId, cols, rows)
    return null
  })

  ipcMain.handle('pty:kill', async (_, { cardId }: { cardId: string }) => {
    ptyManager.kill(cardId)
    scrollbackBuffers.delete(cardId)
    await canvasManager.setAlive(cardId, false)
    return null
  })

  ipcMain.handle('canvas:card:create-task', async (
    event,
    { sessionId, cli, x, y, task }: { sessionId: string; cli: string; x: number; y: number; task: string },
  ) => {
    const card = await canvasManager.createCard(sessionId, cli, x, y, 'headless-task')

    void dispatcher.dispatch({
      task,
      sessionId,
      forceCli: cli,
      ...(card.label ? { escritorioId: identidadeDoCard(card.label) } : {}),
      onToken: (chunk) => event.sender.send('task:token', { cardId: card.id, chunk }),
    }).then((result) => {
      event.sender.send('task:done', { cardId: card.id, content: result.content })
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      event.sender.send('task:done', { cardId: card.id, content: `Erro: ${message}` })
    })

    return card
  })

  ipcMain.handle('canvas:peer:create', async (
    event,
    { sessionId, members, turnOrder, maxRounds, openingPrompt, positions }: {
      sessionId: string
      members: { cli: string; label: string }[]
      turnOrder: PeerTurnOrder
      maxRounds: number
      openingPrompt: string
      positions: { x: number; y: number }[]
    },
  ) => {
    const cards: CanvasCardRecord[] = []
    for (let i = 0; i < members.length; i++) {
      const pos = positions[i] ?? { x: 0, y: 0 }
      cards.push(await canvasManager.createCard(sessionId, members[i]!.cli, pos.x, pos.y, 'headless-peer'))
    }

    const peerMembers: PeerMemberInput[] = members.map((m, i) => ({ cardId: cards[i]!.id, cli: m.cli, label: m.label }))

    const group = await peerGroupManager.startGroup(
      sessionId,
      peerMembers,
      turnOrder,
      maxRounds,
      openingPrompt,
      (cardId, round, content) => event.sender.send('peer:turn', { cardId, round, content }),
    )

    return { group, cards }
  })

  ipcMain.handle('canvas:peer:stop', async (_, { groupId }: { groupId: string }) => {
    await peerGroupManager.stopGroup(groupId)
    return null
  })

  ipcMain.handle('canvas:peer:set-turn-order', async (_, { groupId, turnOrder }: { groupId: string; turnOrder: PeerTurnOrder }) => {
    await peerGroupManager.setTurnOrder(groupId, turnOrder)
    return null
  })

  ipcMain.handle('canvas:peer:list', async (_, { sessionId }: { sessionId: string }) => {
    const groups = await canvasManager.listPeerGroupsForSession(sessionId)
    const withMembers = await Promise.all(groups.map(async (group) => ({
      group,
      members: await canvasManager.listPeerMembers(group.id),
    })))
    return withMembers
  })

  ipcMain.handle('canvas:peer:turns', async (_, { cardId }: { cardId: string }) => {
    return canvasManager.listPeerTurnsForCard(cardId)
  })
}
