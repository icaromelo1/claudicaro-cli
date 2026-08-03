import { describe, it, expect, afterEach, vi } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { EscritorioWatcher, caminhoDoBanco } from '../src-electron/escritorio/watcher.js'
import type { DbLeitura, EventoEscritorio } from '../src-electron/escritorio/consultas.js'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS threads (
  id           TEXT PRIMARY KEY,
  assunto      TEXT NOT NULL,
  dono         TEXT NOT NULL,
  hops         INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'aberta',
  created_at   TEXT NOT NULL,
  closed_at    TEXT
);

CREATE TABLE IF NOT EXISTS mensagens (
  id         TEXT PRIMARY KEY,
  thread_id  TEXT NOT NULL,
  de         TEXT NOT NULL,
  para       TEXT NOT NULL,
  tipo       TEXT NOT NULL,
  conteudo   TEXT NOT NULL,
  reply_to   TEXT,
  lida       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS board (
  chave      TEXT PRIMARY KEY,
  valor      TEXT NOT NULL,
  autor      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
  id          TEXT PRIMARY KEY,
  recurso     TEXT NOT NULL,
  dono        TEXT NOT NULL,
  intencao    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ativo',
  created_at  TEXT NOT NULL,
  released_at TEXT
);

CREATE TABLE IF NOT EXISTS presenca (
  colega    TEXT PRIMARY KEY,
  visto_em  TEXT NOT NULL
);
`

function abrirDbTeste(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  db.exec(SCHEMA)
  return db
}

function inserirThread(db: DatabaseSync, id: string, createdAt: string): void {
  db.prepare(
    `INSERT INTO threads (id, assunto, dono, hops, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, `Assunto ${id}`, 'claude', 0, 'aberta', createdAt)
}

describe('caminhoDoBanco', () => {
  const original = process.env.ESCRITORIO_DB

  afterEach(() => {
    if (original === undefined) delete process.env.ESCRITORIO_DB
    else process.env.ESCRITORIO_DB = original
  })

  it('usa ESCRITORIO_DB quando definido', () => {
    process.env.ESCRITORIO_DB = '/tmp/algum-lugar/escritorio.db'
    expect(caminhoDoBanco()).toBe('/tmp/algum-lugar/escritorio.db')
  })

  it('usa o caminho padrão no home quando não definido', () => {
    delete process.env.ESCRITORIO_DB
    expect(caminhoDoBanco()).toContain('.escritorio')
    expect(caminhoDoBanco().endsWith('escritorio.db')).toBe(true)
  })
})

describe('EscritorioWatcher sem banco', () => {
  it('disponivel false, estado null, verificarAgora vazio e iniciar não quebra', () => {
    const watcher = new EscritorioWatcher({ abrir: () => null })

    expect(watcher.disponivel).toBe(false)
    expect(watcher.estado()).toBeNull()
    expect(watcher.verificarAgora()).toEqual([])
    expect(() => watcher.iniciar(() => {})).not.toThrow()
  })
})

describe('EscritorioWatcher.verificarAgora', () => {
  it('devolve evento novo e não reentrega numa segunda chamada sem novidade', () => {
    const db = abrirDbTeste()
    const watcher = new EscritorioWatcher({
      abrir: () => db as unknown as DbLeitura,
      agora: () => '2026-08-01T00:00:00.000Z',
    })

    inserirThread(db, 't1', '2026-08-01T10:00:00.000Z')

    const primeira = watcher.verificarAgora()
    expect(primeira.length).toBe(1)
    expect(primeira[0]!.tipo).toBe('thread-aberta')

    const segunda = watcher.verificarAgora()
    expect(segunda).toEqual([])
  })

  it('não propaga erro quando a consulta falha', () => {
    const db = abrirDbTeste()
    const watcher = new EscritorioWatcher({
      abrir: () => db as unknown as DbLeitura,
      agora: () => '2026-08-01T00:00:00.000Z',
    })

    db.close()

    expect(() => watcher.verificarAgora()).not.toThrow()
    expect(watcher.verificarAgora()).toEqual([])
  })
})

describe('EscritorioWatcher.iniciar / parar', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('chama o callback quando surge um evento novo', () => {
    vi.useFakeTimers()
    const db = abrirDbTeste()
    const watcher = new EscritorioWatcher({
      abrir: () => db as unknown as DbLeitura,
      agora: () => '2026-08-01T00:00:00.000Z',
      intervaloMs: 100,
    })

    const recebidos: EventoEscritorio[] = []
    watcher.iniciar((ev) => recebidos.push(ev))

    inserirThread(db, 't1', '2026-08-01T10:00:00.000Z')
    vi.advanceTimersByTime(100)

    expect(recebidos.length).toBe(1)
    expect(recebidos[0]!.threadId).toBe('t1')

    watcher.parar()
  })

  it('chamar iniciar duas vezes não duplica a entrega', () => {
    vi.useFakeTimers()
    const db = abrirDbTeste()
    const watcher = new EscritorioWatcher({
      abrir: () => db as unknown as DbLeitura,
      agora: () => '2026-08-01T00:00:00.000Z',
      intervaloMs: 100,
    })

    const recebidos: EventoEscritorio[] = []
    watcher.iniciar((ev) => recebidos.push(ev))
    watcher.iniciar((ev) => recebidos.push(ev))

    inserirThread(db, 't1', '2026-08-01T10:00:00.000Z')
    vi.advanceTimersByTime(100)

    expect(recebidos.length).toBe(1)

    watcher.parar()
  })

  it('parar interrompe as entregas e é idempotente', () => {
    vi.useFakeTimers()
    const db = abrirDbTeste()
    const watcher = new EscritorioWatcher({
      abrir: () => db as unknown as DbLeitura,
      agora: () => '2026-08-01T00:00:00.000Z',
      intervaloMs: 100,
    })

    const recebidos: EventoEscritorio[] = []
    watcher.iniciar((ev) => recebidos.push(ev))
    watcher.parar()
    watcher.parar()

    inserirThread(db, 't1', '2026-08-01T10:00:00.000Z')
    vi.advanceTimersByTime(500)

    expect(recebidos).toEqual([])
  })
})

describe('EscritorioWatcher.estado', () => {
  it('devolve o estado atual quando o banco está disponível', () => {
    const db = abrirDbTeste()
    const watcher = new EscritorioWatcher({ abrir: () => db as unknown as DbLeitura })

    inserirThread(db, 't1', '2026-08-01T10:00:00.000Z')

    const estado = watcher.estado()
    expect(estado).not.toBeNull()
    expect(estado?.threadsAbertas).toEqual([{ id: 't1', assunto: 'Assunto t1', dono: 'claude', hops: 0 }])
  })

  it('devolve null quando a consulta falha', () => {
    const db = abrirDbTeste()
    const watcher = new EscritorioWatcher({ abrir: () => db as unknown as DbLeitura })

    db.close()

    expect(watcher.estado()).toBeNull()
  })
})
