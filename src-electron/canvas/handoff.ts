export interface HandoffContext {
  resumeSessionId?: string
  initialInput?: string
  contextSummary: string
}

const SCROLLBACK_SUMMARY_LIMIT = 500

export function buildHandoffContext(
  parentCli: string,
  childCli: string,
  parentCliSessionId: string | undefined,
  parentScrollback: string,
): HandoffContext {
  if (parentCli === childCli && parentCliSessionId) {
    return {
      resumeSessionId: parentCliSessionId,
      contextSummary: `resume:${parentCliSessionId}`,
    }
  }

  const trimmed = parentScrollback.trim()

  return {
    initialInput: `Contexto da conversa anterior:\n${trimmed}\n\nMensagem atual: `,
    contextSummary: trimmed.slice(0, SCROLLBACK_SUMMARY_LIMIT),
  }
}
