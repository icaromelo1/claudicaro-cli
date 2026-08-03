import { describe, it, expect } from 'vitest'
import { separarPresentes, folegoDaThread } from '../src/components/escritorio-painel'

describe('separarPresentes', () => {
  it('devolve listas vazias quando não há ninguém', () => {
    expect(separarPresentes([])).toEqual({ cards: [], externos: [] })
  })

  it('separa cards do canvas dos demais participantes', () => {
    const resultado = separarPresentes([
      'icarus:tela-1',
      'icaromelo@v1',
      'icarus:tela-2',
      'especialista-cache',
    ])

    expect(resultado).toEqual({
      cards: ['tela-1', 'tela-2'],
      externos: ['icaromelo@v1', 'especialista-cache'],
    })
  })

  it('remove só o prefixo icarus: e preserva dois-pontos no meio do nome', () => {
    const resultado = separarPresentes(['icarus:agente:helper', 'grupo:sub-especialista'])

    expect(resultado).toEqual({
      cards: ['agente:helper'],
      externos: ['grupo:sub-especialista'],
    })
  })

  it('não separa nomes onde icarus: aparece no meio, não no início', () => {
    const resultado = separarPresentes(['sessao-icarus:teste'])

    expect(resultado).toEqual({
      cards: [],
      externos: ['sessao-icarus:teste'],
    })
  })
})

describe('folegoDaThread', () => {
  it('marca como crítico quando hops é 1 ou menos', () => {
    expect(folegoDaThread(1)).toBe('critico')
    expect(folegoDaThread(0)).toBe('critico')
    expect(folegoDaThread(-1)).toBe('critico')
  })

  it('marca como atenção quando hops está entre 2 e 3', () => {
    expect(folegoDaThread(2)).toBe('atencao')
    expect(folegoDaThread(3)).toBe('atencao')
  })

  it('marca como ok quando hops é maior que 3', () => {
    expect(folegoDaThread(4)).toBe('ok')
    expect(folegoDaThread(10)).toBe('ok')
  })
})
