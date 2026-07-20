import { describe, it, expect, vi } from 'vitest'
import { PeerGroupManager } from '../src-electron/canvas/peer-group-manager.js'
import { Dispatcher } from '../src-electron/dispatcher/index.js'
import type { IAdapter, AdapterInvokeParams, AdapterInvokeResult, AdapterHealthResult } from '../src-electron/dispatcher/types.js'
import type {
  CanvasManager,
  PeerGroupRecord,
  PeerGroupMemberRecord,
  PeerTurnRecord,
  PeerTurnOrder,
  PeerGroupStatus,
} from '../src-electron/canvas/canvas-manager.js'

function makeFakeAdapter(name: string, reply: (task: string) => string): IAdapter {
  return {
    name,
    role: 'EXECUTOR',
    invoke: vi.fn(async (params: AdapterInvokeParams): Promise<AdapterInvokeResult> => ({
      content: reply(params.task),
      cli: name,
      model: 'fake-model',
      latencyMs: 1,
      routingMeta: { reason: 'test', toolRequirement: 'code_analysis' },
    })),
    checkHealth: vi.fn(async (): Promise<AdapterHealthResult> => ({ available: true })),
  }
}

class FakeCanvasManager implements Pick<CanvasManager,
  'createPeerGroup' | 'addPeerMember' | 'getPeerGroup' | 'setPeerGroupStatus' |
  'setPeerGroupTurnOrder' | 'advancePeerRound' | 'createPeerTurn' | 'listPeerTurns'
> {
  groups = new Map<string, PeerGroupRecord>()
  members: PeerGroupMemberRecord[] = []
  turns: PeerTurnRecord[] = []
  private nextId = 0

  async createPeerGroup(sessionId: string, turnOrder: PeerTurnOrder, maxRounds: number): Promise<PeerGroupRecord> {
    const group: PeerGroupRecord = {
      id: `group-${this.nextId++}`,
      sessionId,
      turnOrder,
      maxRounds,
      currentRound: 0,
      status: 'running',
      createdAt: new Date(),
    }
    this.groups.set(group.id, group)
    return group
  }

  async addPeerMember(groupId: string, cardId: string, turnIndex: number): Promise<PeerGroupMemberRecord> {
    const member = { id: `member-${this.nextId++}`, groupId, cardId, turnIndex }
    this.members.push(member)
    return member
  }

  async getPeerGroup(groupId: string): Promise<PeerGroupRecord | null> {
    return this.groups.get(groupId) ?? null
  }

  async setPeerGroupStatus(groupId: string, status: PeerGroupStatus): Promise<void> {
    const group = this.groups.get(groupId)
    if (group) group.status = status
  }

  async setPeerGroupTurnOrder(groupId: string, turnOrder: PeerTurnOrder): Promise<void> {
    const group = this.groups.get(groupId)
    if (group) group.turnOrder = turnOrder
  }

  async advancePeerRound(groupId: string, round: number): Promise<void> {
    const group = this.groups.get(groupId)
    if (group) group.currentRound = round
  }

  async createPeerTurn(groupId: string, cardId: string, round: number, content: string): Promise<PeerTurnRecord> {
    const turn = { id: `turn-${this.nextId++}`, groupId, cardId, round, content, createdAt: new Date() }
    this.turns.push(turn)
    return turn
  }

  async listPeerTurns(groupId: string): Promise<PeerTurnRecord[]> {
    return this.turns.filter((t) => t.groupId === groupId)
  }
}

async function flushMicrotasks(times = 20) {
  for (let i = 0; i < times; i++) await Promise.resolve()
}

describe('PeerGroupManager', () => {
  it('runs rounds cycling through members and stops at maxRounds with status done', async () => {
    const dispatcher = new Dispatcher()
    dispatcher.register(makeFakeAdapter('claude', (task) => `claude respondeu a: ${task.slice(0, 20)}`))
    dispatcher.register(makeFakeAdapter('gemini', (task) => `gemini respondeu a: ${task.slice(0, 20)}`))

    const canvasManager = new FakeCanvasManager()
    const manager = new PeerGroupManager(canvasManager as unknown as CanvasManager, dispatcher)

    const group = await manager.startGroup(
      'session-1',
      [
        { cardId: 'card-a', cli: 'claude', label: 'Opus-1' },
        { cardId: 'card-b', cli: 'gemini', label: 'Opus-2' },
      ],
      'roundtable',
      3,
      'monta um plano',
    )

    await flushMicrotasks()

    const finalGroup = await canvasManager.getPeerGroup(group.id)
    expect(finalGroup?.status).toBe('done')
    expect(finalGroup?.currentRound).toBe(3)

    const turns = await canvasManager.listPeerTurns(group.id)
    expect(turns).toHaveLength(3)
    expect(turns[0]!.cardId).toBe('card-a')
    expect(turns[1]!.cardId).toBe('card-b')
    expect(turns[2]!.cardId).toBe('card-a')
  })

  it('stopGroup halts the loop before maxRounds', async () => {
    const dispatcher = new Dispatcher()
    dispatcher.register(makeFakeAdapter('claude', () => 'resposta'))

    const canvasManager = new FakeCanvasManager()
    const manager = new PeerGroupManager(canvasManager as unknown as CanvasManager, dispatcher)

    const group = await manager.startGroup(
      'session-1',
      [{ cardId: 'card-a', cli: 'claude', label: 'Opus-1' }],
      'round-robin',
      10,
      'prompt inicial',
    )

    await flushMicrotasks(2)
    await manager.stopGroup(group.id)
    await flushMicrotasks(20)

    const finalGroup = await canvasManager.getPeerGroup(group.id)
    expect(finalGroup?.status).toBe('stopped')
    expect(finalGroup!.currentRound).toBeLessThan(10)
  })
})
