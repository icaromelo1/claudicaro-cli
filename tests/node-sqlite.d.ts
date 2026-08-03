declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(caminho: string, opcoes?: { readOnly?: boolean })
    exec(sql: string): void
    prepare(sql: string): {
      all(...params: unknown[]): unknown[]
      get(...params: unknown[]): unknown
      run(...params: unknown[]): unknown
    }
    close(): void
  }
}
