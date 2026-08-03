import { describe, it, expect } from 'vitest'
import {
  PREFIXO_ICARUS,
  rotuloDoCard,
  identidadeDoCard,
  ehIdentidadeDeCard,
  labelDaIdentidade,
  mapearIdentidades,
  proximaOrdem,
  envComIdentidade,
  opcoesDeSpawnDoCard,
} from '../src-electron/escritorio/identidade.js'

describe('rotuloDoCard', () => {
  it('gera o rótulo cli-ordem', () => {
    expect(rotuloDoCard('claude', 1)).toBe('claude-1')
    expect(rotuloDoCard('agy', 2)).toBe('agy-2')
  })
})

describe('identidadeDoCard', () => {
  it('prefixa o label com icarus:', () => {
    expect(identidadeDoCard('claude-1')).toBe(`${PREFIXO_ICARUS}claude-1`)
    expect(identidadeDoCard('claude-1')).toBe('icarus:claude-1')
  })
})

describe('labelDaIdentidade', () => {
  it('é o inverso de identidadeDoCard', () => {
    const label = 'claude-1'
    expect(labelDaIdentidade(identidadeDoCard(label))).toBe(label)
  })

  it('devolve null para identidade que não é de card', () => {
    expect(labelDaIdentidade('icaromelo@v1')).toBeNull()
  })
})

describe('ehIdentidadeDeCard', () => {
  it('distingue identidade de card de sessão de terminal', () => {
    expect(ehIdentidadeDeCard('icarus:claude-1')).toBe(true)
    expect(ehIdentidadeDeCard('icaromelo@v1')).toBe(false)
  })
})

describe('mapearIdentidades', () => {
  it('ignora cards sem label e mapeia identidade para o id do card', () => {
    const mapa = mapearIdentidades([
      { id: 'abc', label: 'claude-1' },
      { id: 'def', label: null },
      { id: 'ghi', label: 'agy-1' },
    ])

    expect(mapa.size).toBe(2)
    expect(mapa.get('icarus:claude-1')).toBe('abc')
    expect(mapa.get('icarus:agy-1')).toBe('ghi')
    expect(mapa.has('icarus:def')).toBe(false)
  })
})

describe('opcoesDeSpawnDoCard', () => {
  it('card com label vira identidade e usa o workingDir da sessão', () => {
    expect(opcoesDeSpawnDoCard({ label: 'claude-2' }, '/repo/dsg/v1')).toEqual({
      escritorioId: 'icarus:claude-2',
      cwd: '/repo/dsg/v1',
    })
  })

  it('sessão sem workingDir não força cwd', () => {
    expect(opcoesDeSpawnDoCard({ label: 'claude-1' }, null)).toEqual({
      escritorioId: 'icarus:claude-1',
    })
  })

  it('card legado sem label não ganha identidade forjada', () => {
    expect(opcoesDeSpawnDoCard({ label: null }, '/repo')).toEqual({ cwd: '/repo' })
  })

  it('sem label e sem workingDir devolve objeto vazio', () => {
    expect(opcoesDeSpawnDoCard({})).toEqual({})
  })
})

describe('envComIdentidade', () => {
  it('injeta ESCRITORIO_ID quando o card tem identidade', () => {
    const env = envComIdentidade('icarus:claude-1', { PATH: '/bin' })

    expect(env.ESCRITORIO_ID).toBe('icarus:claude-1')
    expect(env.PATH).toBe('/bin')
  })

  it('sem identidade, REMOVE o ESCRITORIO_ID herdado do app', () => {
    const env = envComIdentidade(undefined, { PATH: '/bin', ESCRITORIO_ID: 'do-app' })

    expect(env.ESCRITORIO_ID).toBeUndefined()
    expect(env.PATH).toBe('/bin')
  })

  it('identidade vazia conta como ausente', () => {
    expect(envComIdentidade('', { ESCRITORIO_ID: 'do-app' }).ESCRITORIO_ID).toBeUndefined()
  })

  it('não muta o env base', () => {
    const base = { PATH: '/bin' } as NodeJS.ProcessEnv
    envComIdentidade('icarus:agy-1', base)

    expect(base.ESCRITORIO_ID).toBeUndefined()
  })
})

describe('proximaOrdem', () => {
  it('considera apenas os cards do mesmo cli', () => {
    const cards = [
      { cli: 'claude', label: 'claude-1' },
      { cli: 'claude', label: 'claude-2' },
      { cli: 'agy', label: 'agy-1' },
    ]

    expect(proximaOrdem(cards, 'claude')).toBe(3)
    expect(proximaOrdem(cards, 'agy')).toBe(2)
  })

  it('devolve 1 para lista vazia', () => {
    expect(proximaOrdem([], 'claude')).toBe(1)
  })

  it('NÃO reaproveita ordem de card apagado — senão a identidade colide', () => {
    const cards = [
      { cli: 'claude', label: 'claude-2' },
      { cli: 'claude', label: 'claude-3' },
    ]

    expect(proximaOrdem(cards, 'claude')).toBe(4)
  })

  it('card legado sem label não desloca a contagem', () => {
    const cards = [
      { cli: 'claude', label: null },
      { cli: 'claude', label: 'claude-1' },
    ]

    expect(proximaOrdem(cards, 'claude')).toBe(2)
  })

  it('label fora do padrão é ignorado em vez de virar NaN', () => {
    const cards = [
      { cli: 'claude', label: 'claude-abc' },
      { cli: 'claude', label: 'claude-1' },
    ]

    expect(proximaOrdem(cards, 'claude')).toBe(2)
  })
})
