import { describe, it, expect } from 'vitest'
import {
  mapearIdentidadesDeCards,
  resolverParticipante,
  chaveAresta,
  hashNome,
  posicaoNaBorda,
  estadoTrafegoInicial,
  aplicarEvento,
  expirarEstadoTrafego,
  registrarMensagem,
  expirarArestas,
  registrarAtividadeFantasma,
  expirarFantasmas,
  type EventoEscritorio,
} from 'src/components/canvas/trafego'

describe('mapearIdentidadesDeCards', () => {
  it('mapeia identidade icarus:<label> para o id do card', () => {
    const mapa = mapearIdentidadesDeCards([
      { id: 'card-1', label: 'claude-1' },
      { id: 'card-2', label: null },
    ])

    expect(mapa.get('icarus:claude-1')).toBe('card-1')
    expect(mapa.size).toBe(1)
  })
})

describe('resolverParticipante', () => {
  it('resolve identidade conhecida como card', () => {
    const mapa = mapearIdentidadesDeCards([{ id: 'card-1', label: 'claude-1' }])
    const resolvido = resolverParticipante('icarus:claude-1', mapa)

    expect(resolvido).toEqual({ tipo: 'card', cardId: 'card-1', nome: 'icarus:claude-1' })
  })

  it('identidade icarus: sem card correspondente vira fantasma com o label', () => {
    const mapa = mapearIdentidadesDeCards([{ id: 'card-1', label: 'claude-1' }])
    const resolvido = resolverParticipante('icarus:claude-9', mapa)

    expect(resolvido.tipo).toBe('fantasma')
    expect(resolvido.nome).toBe('claude-9')
  })

  it('identidade externa (sessão fora do app) vira fantasma com o nome cru', () => {
    const mapa = new Map<string, string>()
    expect(resolverParticipante('icaromelo@v1', mapa)).toEqual({ tipo: 'fantasma', nome: 'icaromelo@v1' })
    expect(resolverParticipante('especialista-cache', mapa)).toEqual({ tipo: 'fantasma', nome: 'especialista-cache' })
  })
})

describe('chaveAresta', () => {
  it('é simétrica — mesmo par em qualquer direção gera a mesma chave', () => {
    expect(chaveAresta('a', 'b')).toBe(chaveAresta('b', 'a'))
  })

  it('pares diferentes geram chaves diferentes', () => {
    expect(chaveAresta('a', 'b')).not.toBe(chaveAresta('a', 'c'))
  })
})

describe('hashNome', () => {
  it('é determinístico para o mesmo nome', () => {
    expect(hashNome('icaromelo@v1')).toBe(hashNome('icaromelo@v1'))
  })

  it('nomes diferentes tendem a gerar hashes diferentes', () => {
    expect(hashNome('icaromelo@v1')).not.toBe(hashNome('especialista-cache'))
  })
})

describe('posicaoNaBorda', () => {
  const LARGURA = 1000
  const ALTURA = 600
  const MARGEM = 24

  it('é estável — mesmo nome sempre cai no mesmo ponto', () => {
    const p1 = posicaoNaBorda('icaromelo@v1', LARGURA, ALTURA)
    const p2 = posicaoNaBorda('icaromelo@v1', LARGURA, ALTURA)
    expect(p1).toEqual(p2)
  })

  it('o ponto fica sobre o perímetro do retângulo (uma das 4 bordas)', () => {
    const nomes = ['icaromelo@v1', 'especialista-cache', 'claude-1', 'agy-2', 'especialista-frontend']
    for (const nome of nomes) {
      const p = posicaoNaBorda(nome, LARGURA, ALTURA, MARGEM)
      const naBordaTopoOuBase = p.y === MARGEM || p.y === ALTURA - MARGEM
      const naBordaEsquerdaOuDireita = p.x === MARGEM || p.x === LARGURA - MARGEM
      expect(naBordaTopoOuBase || naBordaEsquerdaOuDireita).toBe(true)
      expect(p.x).toBeGreaterThanOrEqual(MARGEM)
      expect(p.x).toBeLessThanOrEqual(LARGURA - MARGEM)
      expect(p.y).toBeGreaterThanOrEqual(MARGEM)
      expect(p.y).toBeLessThanOrEqual(ALTURA - MARGEM)
    }
  })

  it('nomes diferentes tendem a cair em pontos diferentes', () => {
    const p1 = posicaoNaBorda('icaromelo@v1', LARGURA, ALTURA)
    const p2 = posicaoNaBorda('especialista-cache', LARGURA, ALTURA)
    expect(p1).not.toEqual(p2)
  })
})

describe('registrarMensagem / expirarArestas', () => {
  it('cria uma aresta que expira depois da duração informada', () => {
    let arestas = registrarMensagem(new Map(), 'a', 'b', 1000, 2500)
    expect(arestas.size).toBe(1)

    arestas = expirarArestas(arestas, 3000)
    expect(arestas.size).toBe(1)

    arestas = expirarArestas(arestas, 3600)
    expect(arestas.size).toBe(0)
  })

  it('renova a aresta em vez de duplicar quando chegam várias mensagens do mesmo par', () => {
    let arestas = registrarMensagem(new Map(), 'a', 'b', 1000, 2500)
    arestas = registrarMensagem(arestas, 'b', 'a', 2000, 2500)

    expect(arestas.size).toBe(1)
    const aresta = [...arestas.values()][0]!
    expect(aresta.expiraEm).toBe(4500)

    arestas = expirarArestas(arestas, 3600)
    expect(arestas.size).toBe(1)
  })
})

describe('registrarAtividadeFantasma / expirarFantasmas', () => {
  it('remove fantasma sem tráfego há mais do que o ttl', () => {
    let fantasmas = registrarAtividadeFantasma(new Map(), 'icaromelo@v1', 1000)
    fantasmas = expirarFantasmas(fantasmas, 1000 + 59_000, 60_000)
    expect(fantasmas.size).toBe(1)

    fantasmas = expirarFantasmas(fantasmas, 1000 + 61_000, 60_000)
    expect(fantasmas.size).toBe(0)
  })

  it('renova a última atividade em vez de duplicar a entrada', () => {
    let fantasmas = registrarAtividadeFantasma(new Map(), 'icaromelo@v1', 1000)
    fantasmas = registrarAtividadeFantasma(fantasmas, 'icaromelo@v1', 5000)

    expect(fantasmas.size).toBe(1)
    expect(fantasmas.get('icaromelo@v1')!.ultimaAtividade).toBe(5000)
  })
})

describe('aplicarEvento', () => {
  const mapa = mapearIdentidadesDeCards([{ id: 'card-1', label: 'claude-1' }])

  it('ignora eventos que não são mensagem', () => {
    const evento: EventoEscritorio = { quando: 'x', tipo: 'thread-aberta', de: 'a', resumo: 'r' }
    const estado = aplicarEvento(estadoTrafegoInicial(), evento, mapa, 1000)
    expect(estado.arestas.size).toBe(0)
    expect(estado.fantasmas.size).toBe(0)
  })

  it('ignora mensagem sem de/para', () => {
    const evento: EventoEscritorio = { quando: 'x', tipo: 'mensagem', de: 'a', resumo: 'r' }
    const estado = aplicarEvento(estadoTrafegoInicial(), evento, mapa, 1000)
    expect(estado.arestas.size).toBe(0)
  })

  it('mensagem entre dois cards do canvas não cria fantasma', () => {
    const mapaDoisCards = mapearIdentidadesDeCards([
      { id: 'card-1', label: 'claude-1' },
      { id: 'card-2', label: 'claude-2' },
    ])
    const evento: EventoEscritorio = {
      quando: 'x',
      tipo: 'mensagem',
      de: 'icarus:claude-1',
      para: 'icarus:claude-2',
      resumo: 'oi',
    }
    const estado = aplicarEvento(estadoTrafegoInicial(), evento, mapaDoisCards, 1000)

    expect(estado.arestas.size).toBe(1)
    expect(estado.fantasmas.size).toBe(0)
  })

  it('mensagem de um participante fora do canvas registra fantasma e aresta', () => {
    const evento: EventoEscritorio = {
      quando: 'x',
      tipo: 'mensagem',
      de: 'icaromelo@v1',
      para: 'icarus:claude-1',
      resumo: 'oi',
    }
    const estado = aplicarEvento(estadoTrafegoInicial(), evento, mapa, 1000)

    expect(estado.arestas.size).toBe(1)
    expect(estado.fantasmas.size).toBe(1)
    expect(estado.fantasmas.has('icaromelo@v1')).toBe(true)
  })

  it('mensagens repetidas entre o mesmo par não empilham arestas nem fantasmas', () => {
    const evento: EventoEscritorio = {
      quando: 'x',
      tipo: 'mensagem',
      de: 'icaromelo@v1',
      para: 'icarus:claude-1',
      resumo: 'oi',
    }
    let estado = aplicarEvento(estadoTrafegoInicial(), evento, mapa, 1000)
    estado = aplicarEvento(estado, evento, mapa, 1200)
    estado = aplicarEvento(estado, evento, mapa, 1400)

    expect(estado.arestas.size).toBe(1)
    expect(estado.fantasmas.size).toBe(1)
    expect(estado.fantasmas.get('icaromelo@v1')!.ultimaAtividade).toBe(1400)
  })
})

describe('expirarEstadoTrafego', () => {
  it('expira arestas e fantasmas obedecendo seus prazos independentes', () => {
    const mapa = mapearIdentidadesDeCards([{ id: 'card-1', label: 'claude-1' }])
    const evento: EventoEscritorio = {
      quando: 'x',
      tipo: 'mensagem',
      de: 'icaromelo@v1',
      para: 'icarus:claude-1',
      resumo: 'oi',
    }
    const estadoInicial = aplicarEvento(estadoTrafegoInicial(), evento, mapa, 1000)

    const depoisDe3s = expirarEstadoTrafego(estadoInicial, 4000, 60_000)
    expect(depoisDe3s.arestas.size).toBe(0)
    expect(depoisDe3s.fantasmas.size).toBe(1)

    const depoisDe61s = expirarEstadoTrafego(estadoInicial, 62_000, 60_000)
    expect(depoisDe61s.fantasmas.size).toBe(0)
  })
})
