// security/index.ts — Claudicaro: Security Layer
// Versão: 1.0 — 2026-05-13

const ALLOWED_CLIS = new Set(['claude', 'gemini', 'copilot', 'gh'])

// Alphanumérico, hífens, pontos — sem espaços ou chars especiais
// Comprimento: 1 a 100 caracteres
const MODEL_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/

const MAX_TASK_LENGTH = 32_000

/**
 * Valida se o nome do CLI é permitido.
 * Retorna true apenas para: 'claude', 'gemini', 'copilot', 'gh'
 */
export function validateCliName(cli: string): boolean {
  return ALLOWED_CLIS.has(cli)
}

/**
 * Valida se o nome do modelo segue o padrão esperado.
 * Permite: alphanumérico, hífens, pontos — sem espaços ou chars especiais.
 */
export function validateModel(model: string): boolean {
  return MODEL_REGEX.test(model)
}

/**
 * Guard de despacho: valida CLI e task antes de invocar o adapter.
 * Lança Error se alguma validação falhar.
 */
export function guardDispatch(cli: string, task: string): void {
  if (!validateCliName(cli)) {
    throw new Error(`CLI inválido: ${cli}`)
  }

  if (task.trim().length === 0) {
    throw new Error('Task vazia')
  }

  if (task.length > MAX_TASK_LENGTH) {
    throw new Error('Task muito longa')
  }
}
