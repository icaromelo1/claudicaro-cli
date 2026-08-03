// Fonte de verdade: escritorio/src/tail.ts (coletarEventos, estadoAtual) e escritorio/src/db.ts (schema)

export interface DbLeitura {
  prepare(sql: string): { all(...params: unknown[]): unknown[]; get(...params: unknown[]): unknown }
}

export type TipoEvento = 'mensagem' | 'thread-aberta' | 'thread-fechada' | 'claim' | 'quadro'

export interface EventoEscritorio {
  quando: string
  tipo: TipoEvento
  de?: string
  para?: string
  threadId?: string
  resumo: string
}

export interface EstadoEscritorio {
  presentes: string[]
  threadsAbertas: { id: string; assunto: string; dono: string; hops: number }[]
  claims: { recurso: string; dono: string; intencao: string }[]
}

export function resumir(texto: string, max = 120): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  return limpo.length > max ? limpo.slice(0, max - 1) + '…' : limpo
}

export function coletarEventos(db: DbLeitura, desde: string): EventoEscritorio[] {
  const eventos: EventoEscritorio[] = []

  const msgs = db
    .prepare(
      `SELECT m.*, t.assunto FROM mensagens m
       LEFT JOIN threads t ON t.id = m.thread_id
       WHERE m.created_at > ? ORDER BY m.created_at`,
    )
    .all(desde) as Record<string, unknown>[]

  for (const m of msgs) {
    eventos.push({
      quando: m.created_at as string,
      tipo: 'mensagem',
      de: m.de as string,
      para: m.para as string,
      threadId: m.thread_id as string,
      resumo: resumir(String(m.conteudo)),
    })
  }

  const abertas = db
    .prepare(`SELECT * FROM threads WHERE created_at > ? ORDER BY created_at`)
    .all(desde) as Record<string, unknown>[]
  for (const t of abertas) {
    eventos.push({
      quando: t.created_at as string,
      tipo: 'thread-aberta',
      de: t.dono as string,
      threadId: t.id as string,
      resumo: String(t.assunto),
    })
  }

  const fechadas = db
    .prepare(`SELECT * FROM threads WHERE closed_at > ? ORDER BY closed_at`)
    .all(desde) as Record<string, unknown>[]
  for (const t of fechadas) {
    eventos.push({
      quando: t.closed_at as string,
      tipo: 'thread-fechada',
      de: t.dono as string,
      threadId: t.id as string,
      resumo: String(t.assunto),
    })
  }

  const claims = db
    .prepare(`SELECT * FROM claims WHERE created_at > ? ORDER BY created_at`)
    .all(desde) as Record<string, unknown>[]
  for (const cl of claims) {
    eventos.push({
      quando: cl.created_at as string,
      tipo: 'claim',
      de: cl.dono as string,
      resumo: `${String(cl.recurso)} · ${String(cl.intencao)}`,
    })
  }

  const quadro = db
    .prepare(`SELECT * FROM board WHERE updated_at > ? ORDER BY updated_at`)
    .all(desde) as Record<string, unknown>[]
  for (const q of quadro) {
    eventos.push({
      quando: q.updated_at as string,
      tipo: 'quadro',
      de: q.autor as string,
      resumo: `${String(q.chave)} = ${resumir(String(q.valor), 50)}`,
    })
  }

  return eventos.sort((a, b) => a.quando.localeCompare(b.quando))
}

export function estadoAtual(db: DbLeitura): EstadoEscritorio {
  const presentes = db
    .prepare(`SELECT colega FROM presenca WHERE visto_em >= ? ORDER BY colega`)
    .all(new Date(Date.now() - 60 * 60_000).toISOString())
    .map((r) => (r as { colega: string }).colega)

  const threadsAbertas = (
    db
      .prepare(`SELECT id, assunto, dono, hops FROM threads WHERE status = 'aberta'`)
      .all() as { id: string; assunto: string; dono: string; hops: number }[]
  ).map((t) => ({ id: t.id, assunto: t.assunto, dono: t.dono, hops: t.hops }))

  const claims = (
    db
      .prepare(`SELECT recurso, dono, intencao FROM claims WHERE status = 'ativo'`)
      .all() as { recurso: string; dono: string; intencao: string }[]
  ).map((c) => ({ recurso: c.recurso, dono: c.dono, intencao: c.intencao }))

  return { presentes, threadsAbertas, claims }
}
