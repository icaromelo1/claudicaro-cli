import type { CanvasManager, PeerGroupRecord, PeerTurnOrder } from './canvas-manager.js'
import type { Dispatcher } from '../dispatcher/index.js'
import { buildRoundPrompt, type PeerTurnRef } from './peer-rounds.js'

export interface PeerMemberInput {
  cardId: string
  cli: string
  label: string
}

export class PeerGroupManager {
  constructor(
    private canvasManager: CanvasManager,
    private dispatcher: Dispatcher,
  ) {}

  async startGroup(
    sessionId: string,
    members: PeerMemberInput[],
    turnOrder: PeerTurnOrder,
    maxRounds: number,
    openingPrompt: string,
    onTurn?: (cardId: string, round: number, content: string) => void,
  ): Promise<PeerGroupRecord> {
    const group = await this.canvasManager.createPeerGroup(sessionId, turnOrder, maxRounds)

    for (let i = 0; i < members.length; i++) {
      await this.canvasManager.addPeerMember(group.id, members[i]!.cardId, i)
    }

    void this.runRounds(group.id, sessionId, members, openingPrompt, onTurn)

    return group
  }

  async stopGroup(groupId: string): Promise<void> {
    await this.canvasManager.setPeerGroupStatus(groupId, 'stopped')
  }

  async setTurnOrder(groupId: string, turnOrder: PeerTurnOrder): Promise<void> {
    await this.canvasManager.setPeerGroupTurnOrder(groupId, turnOrder)
  }

  private async runRounds(
    groupId: string,
    sessionId: string,
    members: PeerMemberInput[],
    openingPrompt: string,
    onTurn?: (cardId: string, round: number, content: string) => void,
  ): Promise<void> {
    const allTurns: PeerTurnRef[] = []
    let prompt = openingPrompt

    const group = await this.canvasManager.getPeerGroup(groupId)
    const maxRounds = group?.maxRounds ?? members.length

    for (let round = 1; round <= maxRounds; round++) {
      const current = await this.canvasManager.getPeerGroup(groupId)
      if (!current || current.status === 'stopped') return

      const member = members[(round - 1) % members.length]!

      let content: string
      try {
        const result = await this.dispatcher.dispatch({ task: prompt, sessionId, forceCli: member.cli })
        content = result.content
      } catch (err) {
        await this.canvasManager.setPeerGroupStatus(groupId, 'stopped')
        throw err
      }

      await this.canvasManager.createPeerTurn(groupId, member.cardId, round, content)
      await this.canvasManager.advancePeerRound(groupId, round)
      onTurn?.(member.cardId, round, content)

      allTurns.push({ cardId: member.cardId, label: member.label, round, content })

      const updated = await this.canvasManager.getPeerGroup(groupId)
      if (!updated || updated.status === 'stopped') return

      prompt = buildRoundPrompt((updated.turnOrder as PeerTurnOrder), allTurns)
    }

    await this.canvasManager.setPeerGroupStatus(groupId, 'done')
  }
}
