import { prisma } from '../../src/db/client.js'

export type CardEngine = 'pty' | 'headless-task' | 'headless-peer'
export type PeerTurnOrder = 'round-robin' | 'roundtable'
export type PeerGroupStatus = 'running' | 'stopped' | 'done'

export interface CanvasCardRecord {
  id: string
  sessionId: string
  cli: string
  engine: string
  x: number
  y: number
  width: number
  height: number
  ptyAlive: boolean
  createdAt: Date
}

export interface CanvasLinkRecord {
  id: string
  sessionId: string
  fromCardId: string
  toCardId: string
  contextSummary: string
  createdAt: Date
}

export interface PeerGroupRecord {
  id: string
  sessionId: string
  turnOrder: string
  maxRounds: number
  currentRound: number
  status: string
  createdAt: Date
}

export interface PeerGroupMemberRecord {
  id: string
  groupId: string
  cardId: string
  turnIndex: number
}

export interface PeerTurnRecord {
  id: string
  groupId: string
  cardId: string
  round: number
  content: string
  createdAt: Date
}

export class CanvasManager {
  async createCard(sessionId: string, cli: string, x: number, y: number, engine: CardEngine = 'pty'): Promise<CanvasCardRecord> {
    return prisma.canvasCard.create({ data: { sessionId, cli, x, y, engine, ptyAlive: engine === 'pty' } })
  }

  async listCards(sessionId: string): Promise<CanvasCardRecord[]> {
    return prisma.canvasCard.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } })
  }

  async updatePosition(cardId: string, x: number, y: number): Promise<void> {
    await prisma.canvasCard.update({ where: { id: cardId }, data: { x, y } })
  }

  async setAlive(cardId: string, alive: boolean): Promise<void> {
    await prisma.canvasCard.update({ where: { id: cardId }, data: { ptyAlive: alive } })
  }

  async deleteCard(cardId: string): Promise<void> {
    await prisma.canvasLink.deleteMany({ where: { OR: [{ fromCardId: cardId }, { toCardId: cardId }] } })
    await prisma.canvasCard.delete({ where: { id: cardId } })
  }

  async createLink(sessionId: string, fromCardId: string, toCardId: string, contextSummary: string): Promise<CanvasLinkRecord> {
    return prisma.canvasLink.create({ data: { sessionId, fromCardId, toCardId, contextSummary } })
  }

  async listLinks(sessionId: string): Promise<CanvasLinkRecord[]> {
    return prisma.canvasLink.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } })
  }

  async createPeerGroup(sessionId: string, turnOrder: PeerTurnOrder, maxRounds: number): Promise<PeerGroupRecord> {
    return prisma.peerGroup.create({ data: { sessionId, turnOrder, maxRounds } })
  }

  async addPeerMember(groupId: string, cardId: string, turnIndex: number): Promise<PeerGroupMemberRecord> {
    return prisma.peerGroupMember.create({ data: { groupId, cardId, turnIndex } })
  }

  async listPeerMembers(groupId: string): Promise<PeerGroupMemberRecord[]> {
    return prisma.peerGroupMember.findMany({ where: { groupId }, orderBy: { turnIndex: 'asc' } })
  }

  async getPeerGroup(groupId: string): Promise<PeerGroupRecord | null> {
    return prisma.peerGroup.findUnique({ where: { id: groupId } })
  }

  async setPeerGroupTurnOrder(groupId: string, turnOrder: PeerTurnOrder): Promise<void> {
    await prisma.peerGroup.update({ where: { id: groupId }, data: { turnOrder } })
  }

  async setPeerGroupStatus(groupId: string, status: PeerGroupStatus): Promise<void> {
    await prisma.peerGroup.update({ where: { id: groupId }, data: { status } })
  }

  async advancePeerRound(groupId: string, round: number): Promise<void> {
    await prisma.peerGroup.update({ where: { id: groupId }, data: { currentRound: round } })
  }

  async createPeerTurn(groupId: string, cardId: string, round: number, content: string): Promise<PeerTurnRecord> {
    return prisma.peerTurn.create({ data: { groupId, cardId, round, content } })
  }

  async listPeerTurns(groupId: string, round?: number): Promise<PeerTurnRecord[]> {
    return prisma.peerTurn.findMany({
      where: round === undefined ? { groupId } : { groupId, round },
      orderBy: { createdAt: 'asc' },
    })
  }

  async listPeerTurnsForCard(cardId: string): Promise<PeerTurnRecord[]> {
    return prisma.peerTurn.findMany({ where: { cardId }, orderBy: { createdAt: 'asc' } })
  }

  async listPeerGroupsForSession(sessionId: string): Promise<PeerGroupRecord[]> {
    return prisma.peerGroup.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } })
  }
}
