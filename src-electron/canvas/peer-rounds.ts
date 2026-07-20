export interface PeerTurnRef {
  cardId: string
  label: string
  round: number
  content: string
}

export function buildRoundPrompt(turnOrder: 'round-robin' | 'roundtable', allTurns: PeerTurnRef[]): string {
  if (allTurns.length === 0) return ''

  if (turnOrder === 'round-robin') {
    return allTurns[allTurns.length - 1]!.content
  }

  const lastRound = allTurns[allTurns.length - 1]!.round
  const roundTurns = allTurns.filter((t) => t.round === lastRound)
  return roundTurns.map((t) => `[${t.label}]: ${t.content}`).join('\n\n')
}
