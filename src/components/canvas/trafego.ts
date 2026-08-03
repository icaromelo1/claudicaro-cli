export type TipoEventoEscritorio = 'mensagem' | 'thread-aberta' | 'thread-fechada' | 'claim' | 'quadro'

export interface EventoEscritorio {
  quando: string
  tipo: TipoEventoEscritorio
  de?: string
  para?: string
  threadId?: string
  resumo: string
}

export interface CardParaIdentidade {
  id: string
  label: string | null
}

export interface ArestaTrafego {
  chave: string
  de: string
  para: string
  criadoEm: number
  expiraEm: number
}

export interface FantasmaTrafego {
  nome: string
  ultimaAtividade: number
}

export interface EstadoTrafego {
  arestas: Map<string, ArestaTrafego>
  fantasmas: Map<string, FantasmaTrafego>
}

export interface ParticipanteResolvido {
  tipo: 'card' | 'fantasma'
  cardId?: string
  nome: string
}

export interface Ponto {
  x: number
  y: number
}

const PREFIXO_ICARUS = 'icarus:'

export const DURACAO_ARESTA_MS = 2500
export const TTL_FANTASMA_MS = 60_000

export function mapearIdentidadesDeCards(cards: CardParaIdentidade[]): Map<string, string> {
  const mapa = new Map<string, string>()

  for (const card of cards) {
    if (!card.label) continue
    mapa.set(`${PREFIXO_ICARUS}${card.label}`, card.id)
  }

  return mapa
}

export function resolverParticipante(
  identidade: string,
  mapaIdentidades: Map<string, string>,
): ParticipanteResolvido {
  const cardId = mapaIdentidades.get(identidade)
  if (cardId) {
    return { tipo: 'card', cardId, nome: identidade }
  }

  const nome = identidade.startsWith(PREFIXO_ICARUS) ? identidade.slice(PREFIXO_ICARUS.length) : identidade
  return { tipo: 'fantasma', nome }
}

export function chaveAresta(a: string, b: string): string {
  return [a, b].sort().join('::')
}

export function hashNome(nome: string): number {
  let h = 0
  for (let i = 0; i < nome.length; i++) {
    h = (h * 31 + nome.charCodeAt(i)) >>> 0
  }
  return h
}

export function posicaoNaBorda(nome: string, largura: number, altura: number, margem = 24): Ponto {
  const margemUtil = Math.max(0, Math.min(margem, Math.min(largura, altura) / 2))
  const larguraUtil = Math.max(largura - margemUtil * 2, 0)
  const alturaUtil = Math.max(altura - margemUtil * 2, 0)
  const perimetro = 2 * (larguraUtil + alturaUtil)

  if (perimetro === 0) {
    return { x: margemUtil, y: margemUtil }
  }

  const t = (hashNome(nome) % 10000) / 10000
  let d = t * perimetro

  if (d < larguraUtil) {
    return { x: margemUtil + d, y: margemUtil }
  }
  d -= larguraUtil

  if (d < alturaUtil) {
    return { x: largura - margemUtil, y: margemUtil + d }
  }
  d -= alturaUtil

  if (d < larguraUtil) {
    return { x: largura - margemUtil - d, y: altura - margemUtil }
  }
  d -= larguraUtil

  return { x: margemUtil, y: altura - margemUtil - d }
}

export function estadoTrafegoInicial(): EstadoTrafego {
  return { arestas: new Map(), fantasmas: new Map() }
}

export function registrarMensagem(
  arestas: Map<string, ArestaTrafego>,
  de: string,
  para: string,
  agora: number,
  duracaoMs = DURACAO_ARESTA_MS,
): Map<string, ArestaTrafego> {
  const chave = chaveAresta(de, para)
  const nova = new Map(arestas)
  nova.set(chave, { chave, de, para, criadoEm: agora, expiraEm: agora + duracaoMs })
  return nova
}

export function expirarArestas(arestas: Map<string, ArestaTrafego>, agora: number): Map<string, ArestaTrafego> {
  const nova = new Map<string, ArestaTrafego>()
  for (const [chave, aresta] of arestas) {
    if (aresta.expiraEm > agora) nova.set(chave, aresta)
  }
  return nova
}

export function registrarAtividadeFantasma(
  fantasmas: Map<string, FantasmaTrafego>,
  nome: string,
  agora: number,
): Map<string, FantasmaTrafego> {
  const nova = new Map(fantasmas)
  nova.set(nome, { nome, ultimaAtividade: agora })
  return nova
}

export function expirarFantasmas(
  fantasmas: Map<string, FantasmaTrafego>,
  agora: number,
  ttlMs = TTL_FANTASMA_MS,
): Map<string, FantasmaTrafego> {
  const nova = new Map<string, FantasmaTrafego>()
  for (const [nome, fantasma] of fantasmas) {
    if (agora - fantasma.ultimaAtividade < ttlMs) nova.set(nome, fantasma)
  }
  return nova
}

export function aplicarEvento(
  estado: EstadoTrafego,
  evento: EventoEscritorio,
  mapaIdentidades: Map<string, string>,
  agora: number,
  duracaoArestaMs = DURACAO_ARESTA_MS,
): EstadoTrafego {
  if (evento.tipo !== 'mensagem' || !evento.de || !evento.para) {
    return estado
  }

  const arestas = registrarMensagem(estado.arestas, evento.de, evento.para, agora, duracaoArestaMs)
  let fantasmas = estado.fantasmas

  const de = resolverParticipante(evento.de, mapaIdentidades)
  const para = resolverParticipante(evento.para, mapaIdentidades)

  if (de.tipo === 'fantasma') fantasmas = registrarAtividadeFantasma(fantasmas, de.nome, agora)
  if (para.tipo === 'fantasma') fantasmas = registrarAtividadeFantasma(fantasmas, para.nome, agora)

  return { arestas, fantasmas }
}

export function expirarEstadoTrafego(
  estado: EstadoTrafego,
  agora: number,
  ttlFantasmaMs = TTL_FANTASMA_MS,
): EstadoTrafego {
  return {
    arestas: expirarArestas(estado.arestas, agora),
    fantasmas: expirarFantasmas(estado.fantasmas, agora, ttlFantasmaMs),
  }
}
