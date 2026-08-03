export interface PresentesSeparados {
  cards: string[]
  externos: string[]
}

const PREFIXO_CARD = 'icarus:'

export function separarPresentes(presentes: string[]): PresentesSeparados {
  const cards: string[] = []
  const externos: string[] = []

  for (const nome of presentes) {
    if (nome.startsWith(PREFIXO_CARD)) {
      cards.push(nome.slice(PREFIXO_CARD.length))
    } else {
      externos.push(nome)
    }
  }

  return { cards, externos }
}

export type FolegoThread = 'ok' | 'atencao' | 'critico'

export function folegoDaThread(hops: number): FolegoThread {
  if (hops <= 1) return 'critico'
  if (hops <= 3) return 'atencao'
  return 'ok'
}
