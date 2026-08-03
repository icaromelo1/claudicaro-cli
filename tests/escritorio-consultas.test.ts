import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { coletarEventos, estadoAtual, resumir } from '../src-electron/escritorio/consultas.js'

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

describe('resumir', () => {
  it('achata quebras de linha e espaços múltiplos', () => {
    expect(resumir('linha um\n  linha  dois\ttab')).toBe('linha um linha dois tab')
  })

  it('corta com reticência quando excede o máximo', () => {
    const texto = 'a'.repeat(150)
    const resultado = resumir(texto)
    expect(resultado.length).toBe(120)
    expect(resultado.endsWith('…')).toBe(true)
  })

  it('não corta quando está dentro do limite', () => {
    expect(resumir('texto curto')).toBe('texto curto')
  })

  it('respeita o parâmetro max customizado', () => {
    expect(resumir('abcdefghij', 5)).toBe('abcd…')
  })
})

describe('coletarEventos', () => {
  let db: Database.Database

  beforeEach(() => {
    db = abrirDbTeste()
  })

  it('traz evento de mensagem com de/para/threadId e resumo cortado', () => {
    db.prepare(
      `INSERT INTO threads (id, assunto, dono, hops, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('t1', 'Assunto da thread', 'claude', 0, 'aberta', '2026-08-01T10:00:00.000Z')

    db.prepare(
      `INSERT INTO mensagens (id, thread_id, de, para, tipo, conteudo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('m1', 't1', 'claude', 'agy', 'dm', 'conteudo   com\nquebras   de linha', '2026-08-01T10:01:00.000Z')

    const eventos = coletarEventos(db, '2026-08-01T09:00:00.000Z')
    const msg = eventos.find((e) => e.tipo === 'mensagem')

    expect(msg).toBeDefined()
    expect(msg?.de).toBe('claude')
    expect(msg?.para).toBe('agy')
    expect(msg?.threadId).toBe('t1')
    expect(msg?.resumo).toBe('conteudo com quebras de linha')
  })

  it('devolve eventos ordenados cronologicamente', () => {
    db.prepare(
      `INSERT INTO threads (id, assunto, dono, hops, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('t1', 'Thread 1', 'claude', 0, 'aberta', '2026-08-01T10:00:00.000Z')

    db.prepare(
      `INSERT INTO claims (id, recurso, dono, intencao, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('c1', 'arquivo.ts', 'agy', 'editar', 'ativo', '2026-08-01T09:30:00.000Z')

    db.prepare(
      `INSERT INTO board (chave, valor, autor, updated_at) VALUES (?, ?, ?, ?)`,
    ).run('status', 'em andamento', 'claude', '2026-08-01T11:00:00.000Z')

    const eventos = coletarEventos(db, '2026-08-01T00:00:00.000Z')

    expect(eventos.map((e) => e.tipo)).toEqual(['claim', 'thread-aberta', 'quadro'])
    for (let i = 1; i < eventos.length; i++) {
      expect(eventos[i].quando >= eventos[i - 1].quando).toBe(true)
    }
  })

  it('filtra por desde: reconsultar com a data do último evento devolve lista vazia', () => {
    db.prepare(
      `INSERT INTO threads (id, assunto, dono, hops, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('t1', 'Thread 1', 'claude', 0, 'aberta', '2026-08-01T10:00:00.000Z')

    const primeira = coletarEventos(db, '2026-08-01T00:00:00.000Z')
    expect(primeira.length).toBe(1)

    const ultimaData = primeira[primeira.length - 1].quando
    const segunda = coletarEventos(db, ultimaData)
    expect(segunda).toEqual([])
  })

  it('traz thread aberta e thread fechada como tipos distintos', () => {
    db.prepare(
      `INSERT INTO threads (id, assunto, dono, hops, status, created_at, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('t1', 'Thread fechada', 'claude', 2, 'fechada', '2026-08-01T09:00:00.000Z', '2026-08-01T09:30:00.000Z')

    db.prepare(
      `INSERT INTO threads (id, assunto, dono, hops, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('t2', 'Thread aberta', 'agy', 0, 'aberta', '2026-08-01T09:15:00.000Z')

    const eventos = coletarEventos(db, '2026-08-01T00:00:00.000Z')
    const tipos = eventos.map((e) => e.tipo).sort()

    expect(tipos).toEqual(['thread-aberta', 'thread-aberta', 'thread-fechada'])
  })

  it('traz eventos de claim e quadro', () => {
    db.prepare(
      `INSERT INTO claims (id, recurso, dono, intencao, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('c1', 'src/foo.ts', 'claude', 'refatorar', 'ativo', '2026-08-01T10:00:00.000Z')

    db.prepare(
      `INSERT INTO board (chave, valor, autor, updated_at) VALUES (?, ?, ?, ?)`,
    ).run('build', 'ok', 'agy', '2026-08-01T10:05:00.000Z')

    const eventos = coletarEventos(db, '2026-08-01T00:00:00.000Z')
    const claim = eventos.find((e) => e.tipo === 'claim')
    const quadro = eventos.find((e) => e.tipo === 'quadro')

    expect(claim?.de).toBe('claude')
    expect(claim?.resumo).toBe('src/foo.ts · refatorar')
    expect(quadro?.de).toBe('agy')
    expect(quadro?.resumo).toBe('build = ok')
  })
})

describe('estadoAtual', () => {
  it('devolve presentes, threads abertas e claims corretos', () => {
    const db = abrirDbTeste()

    db.prepare(`INSERT INTO presenca (colega, visto_em) VALUES (?, ?)`).run(
      'claude',
      new Date().toISOString(),
    )
    db.prepare(`INSERT INTO presenca (colega, visto_em) VALUES (?, ?)`).run(
      'agy-antigo',
      '2020-01-01T00:00:00.000Z',
    )

    db.prepare(
      `INSERT INTO threads (id, assunto, dono, hops, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('t1', 'Thread aberta', 'claude', 3, 'aberta', '2026-08-01T10:00:00.000Z')
    db.prepare(
      `INSERT INTO threads (id, assunto, dono, hops, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('t2', 'Thread fechada', 'agy', 1, 'fechada', '2026-08-01T09:00:00.000Z')

    db.prepare(
      `INSERT INTO claims (id, recurso, dono, intencao, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('c1', 'arquivo.ts', 'claude', 'editar', 'ativo', '2026-08-01T10:00:00.000Z')
    db.prepare(
      `INSERT INTO claims (id, recurso, dono, intencao, status, created_at, released_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('c2', 'outro.ts', 'agy', 'ler', 'liberado', '2026-08-01T09:00:00.000Z', '2026-08-01T09:10:00.000Z')

    const estado = estadoAtual(db)

    expect(estado.presentes).toEqual(['claude'])
    expect(estado.threadsAbertas).toEqual([{ id: 't1', assunto: 'Thread aberta', dono: 'claude', hops: 3 }])
    expect(estado.claims).toEqual([{ recurso: 'arquivo.ts', dono: 'claude', intencao: 'editar' }])
  })

  it('devolve listas vazias sem quebrar num banco vazio', () => {
    const db = abrirDbTeste()

    const estado = estadoAtual(db)

    expect(estado).toEqual({ presentes: [], threadsAbertas: [], claims: [] })
  })
})
