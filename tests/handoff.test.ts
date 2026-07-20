import { describe, it, expect } from 'vitest'
import { buildHandoffContext } from '../src-electron/canvas/handoff.js'

describe('buildHandoffContext', () => {
  it('uses native resume when same CLI and a parent session id exists', () => {
    const result = buildHandoffContext('claude', 'claude', 'sess-123', 'algum scrollback')
    expect(result.resumeSessionId).toBe('sess-123')
    expect(result.contextSummary).toBe('resume:sess-123')
    expect(result.initialInput).toBeUndefined()
  })

  it('falls back to scrollback prefix when CLIs differ', () => {
    const result = buildHandoffContext('claude', 'agy', 'sess-123', 'linha 1\nlinha 2')
    expect(result.resumeSessionId).toBeUndefined()
    expect(result.initialInput).toContain('Contexto da conversa anterior:')
    expect(result.initialInput).toContain('linha 1\nlinha 2')
    expect(result.initialInput).toContain('Mensagem atual:')
  })

  it('falls back to scrollback prefix when same CLI but no parent session id (degrades gracefully)', () => {
    const result = buildHandoffContext('claude', 'claude', undefined, 'conteúdo do terminal')
    expect(result.resumeSessionId).toBeUndefined()
    expect(result.initialInput).toContain('conteúdo do terminal')
  })

  it('truncates contextSummary to 500 chars', () => {
    const longScrollback = 'x'.repeat(1000)
    const result = buildHandoffContext('claude', 'agy', undefined, longScrollback)
    expect(result.contextSummary.length).toBe(500)
  })

  it('trims whitespace from scrollback before using it', () => {
    const result = buildHandoffContext('claude', 'agy', undefined, '   com espaços   \n\n')
    expect(result.initialInput).toContain('com espaços')
    expect(result.initialInput?.startsWith('Contexto da conversa anterior:\ncom espaços')).toBe(true)
  })
})
