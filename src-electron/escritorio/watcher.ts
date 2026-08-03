import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { coletarEventos, estadoAtual } from './consultas.js'
import type { DbLeitura, EstadoEscritorio, EventoEscritorio } from './consultas.js'

export function caminhoDoBanco(): string {
  return process.env.ESCRITORIO_DB || path.join(os.homedir(), '.escritorio', 'escritorio.db')
}

function abrirPadrao(): DbLeitura | null {
  try {
    const require = createRequire(import.meta.url)
    const Database = require('better-sqlite3')
    return new Database(caminhoDoBanco(), { readonly: true, fileMustExist: true }) as DbLeitura
  } catch {
    return null
  }
}

export interface OpcoesWatcher {
  intervaloMs?: number
  abrir?: () => DbLeitura | null
  agora?: () => string
}

export class EscritorioWatcher {
  private readonly intervaloMs: number
  private readonly abrirDb: () => DbLeitura | null
  private readonly agora: () => string
  private db: DbLeitura | null
  private desde: string
  private timer: ReturnType<typeof setInterval> | null

  constructor(opts: OpcoesWatcher = {}) {
    this.intervaloMs = opts.intervaloMs ?? 500
    this.abrirDb = opts.abrir ?? abrirPadrao
    this.agora = opts.agora ?? (() => new Date().toISOString())
    this.db = this.abrirDb()
    this.desde = this.agora()
    this.timer = null
  }

  get disponivel(): boolean {
    return this.db !== null
  }

  iniciar(aoEvento: (ev: EventoEscritorio) => void): void {
    if (!this.disponivel) return
    if (this.timer) return

    this.timer = setInterval(() => {
      const eventos = this.verificarAgora()
      for (const ev of eventos) {
        aoEvento(ev)
      }
    }, this.intervaloMs)
  }

  parar(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  estado(): EstadoEscritorio | null {
    if (!this.db) return null

    try {
      return estadoAtual(this.db)
    } catch {
      return null
    }
  }

  verificarAgora(): EventoEscritorio[] {
    if (!this.db) return []

    try {
      const eventos = coletarEventos(this.db, this.desde)
      if (eventos.length > 0) {
        this.desde = eventos[eventos.length - 1].quando
      }
      return eventos
    } catch {
      return []
    }
  }
}
