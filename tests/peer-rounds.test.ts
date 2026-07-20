import { describe, it, expect } from 'vitest'
import { buildRoundPrompt, type PeerTurnRef } from '../src-electron/canvas/peer-rounds.js'

describe('buildRoundPrompt', () => {
  it('returns empty string when there are no previous turns', () => {
    expect(buildRoundPrompt('round-robin', [])).toBe('')
    expect(buildRoundPrompt('roundtable', [])).toBe('')
  })

  it('round-robin uses only the single most recent turn', () => {
    const turns: PeerTurnRef[] = [
      { cardId: 'a', label: 'Opus-1', round: 1, content: 'primeira ideia' },
      { cardId: 'b', label: 'Opus-2', round: 1, content: 'segunda ideia' },
    ]
    expect(buildRoundPrompt('round-robin', turns)).toBe('segunda ideia')
  })

  it('roundtable concatenates and labels all turns from the last completed round', () => {
    const turns: PeerTurnRef[] = [
      { cardId: 'a', label: 'Opus-1', round: 1, content: 'primeira ideia' },
      { cardId: 'b', label: 'Opus-2', round: 1, content: 'segunda ideia' },
      { cardId: 'c', label: 'Opus-3', round: 1, content: 'terceira ideia' },
    ]
    const prompt = buildRoundPrompt('roundtable', turns)
    expect(prompt).toBe('[Opus-1]: primeira ideia\n\n[Opus-2]: segunda ideia\n\n[Opus-3]: terceira ideia')
  })

  it('roundtable ignores turns from earlier rounds, only uses the most recent round', () => {
    const turns: PeerTurnRef[] = [
      { cardId: 'a', label: 'Opus-1', round: 1, content: 'rodada 1' },
      { cardId: 'b', label: 'Opus-2', round: 2, content: 'rodada 2 - b' },
      { cardId: 'a', label: 'Opus-1', round: 2, content: 'rodada 2 - a' },
    ]
    const prompt = buildRoundPrompt('roundtable', turns)
    expect(prompt).toContain('rodada 2 - b')
    expect(prompt).toContain('rodada 2 - a')
    expect(prompt).not.toContain('rodada 1')
  })

  it('roundtable with a single previous turn (round 1 -> 2 transition) just labels that one', () => {
    const turns: PeerTurnRef[] = [{ cardId: 'a', label: 'Opus-1', round: 1, content: 'abertura' }]
    expect(buildRoundPrompt('roundtable', turns)).toBe('[Opus-1]: abertura')
  })
})
