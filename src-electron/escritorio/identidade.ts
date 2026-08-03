export const PREFIXO_ICARUS = 'icarus:'

export function rotuloDoCard(cli: string, ordem: number): string {
  return `${cli}-${ordem}`
}

export function identidadeDoCard(label: string): string {
  return `${PREFIXO_ICARUS}${label}`
}

export function ehIdentidadeDeCard(id: string): boolean {
  return id.startsWith(PREFIXO_ICARUS)
}

export function labelDaIdentidade(id: string): string | null {
  if (!ehIdentidadeDeCard(id)) {
    return null
  }

  return id.slice(PREFIXO_ICARUS.length)
}

export function mapearIdentidades(
  cards: { id: string; label: string | null }[],
): Map<string, string> {
  const mapa = new Map<string, string>()

  for (const card of cards) {
    if (!card.label) {
      continue
    }

    mapa.set(identidadeDoCard(card.label), card.id)
  }

  return mapa
}

export function proximaOrdem(cards: { cli: string; label?: string | null }[], cli: string): number {
  const prefixo = `${cli}-`
  let maior = 0

  for (const card of cards) {
    if (card.cli !== cli || !card.label?.startsWith(prefixo)) {
      continue
    }

    const ordem = Number(card.label.slice(prefixo.length))
    if (Number.isInteger(ordem) && ordem > maior) {
      maior = ordem
    }
  }

  return maior + 1
}
