// sanitize/index.ts — Icarus Code: Input Sanitization Layer
// Versão: 1.0 — 2026-05-13

const MAX_INPUT_LENGTH = 32_000

// Regex para sequências de escape ANSI (ex: \x1b[32m, \x1b[0m, \x1b[1;31m)
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*[mGKHFABCDsuJh]/g

/**
 * Sanitiza uma string de entrada:
 * - Remove null bytes
 * - Trunca para 32.000 caracteres (com aviso no console se truncado)
 * - Remove sequências de escape ANSI
 * - Normaliza quebras de linha (CRLF → LF)
 */
export function sanitizeInput(input: string): string {
  // Remove null bytes
  let result = input.replace(/\0/g, '')

  // Normaliza quebras de linha (CRLF → LF)
  result = result.replace(/\r\n/g, '\n')

  // Remove sequências de escape ANSI
  result = result.replace(ANSI_ESCAPE_REGEX, '')

  // Limita tamanho a 32.000 caracteres
  if (result.length > MAX_INPUT_LENGTH) {
    console.warn(
      `[sanitize] Input truncado de ${result.length} para ${MAX_INPUT_LENGTH} caracteres.`,
    )
    result = result.slice(0, MAX_INPUT_LENGTH)
  }

  return result
}

/**
 * Sanitiza um array de argumentos:
 * - Aplica sanitizeInput em cada item
 * - Remove args vazios após sanitização
 */
export function sanitizeArgs(args: string[]): string[] {
  return args.map((arg) => sanitizeInput(arg)).filter((arg) => arg.length > 0)
}
