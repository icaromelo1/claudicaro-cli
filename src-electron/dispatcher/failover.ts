import type { IAdapter, DispatchRequest, DispatchResult } from './types.js'
import { AdapterError } from './types.js'
import type { RouteResult } from './router.js'

export async function handleFailover(
  err: AdapterError,
  req: DispatchRequest,
  original: RouteResult,
  adapters: Map<string, IAdapter>,
  onToken?: (chunk: string) => void,
): Promise<DispatchResult> {
  if (err.code === 'CONTEXT_LENGTH_EXCEEDED') {
    const fallback = adapters.get('gemini')
    if (fallback) {
      const result = await fallback.invoke({
        task: req.task,
        model: 'gemini-2.5-pro',
        modelFlag: '-m pro',
        bypassFlag: '--yolo',
        sessionId: req.sessionId,
        onToken: onToken ?? req.onToken,
      })
      return { ...result, taskType: original.taskType, failoverUsed: true }
    }
  }

  if (err.code === 'TIMEOUT') {
    const adapter = adapters.get(original.cli)
    if (adapter) {
      const result = await adapter.invoke({
        task: req.task,
        model: original.cli === 'gemini' ? 'gemini-2.5-flash' : 'claude-haiku-4-5-20251001',
        modelFlag: original.cli === 'gemini' ? '-m flash' : '--model claude-haiku-4-5-20251001',
        bypassFlag: original.bypassFlag,
        sessionId: req.sessionId,
        onToken: onToken ?? req.onToken,
      })
      return { ...result, taskType: original.taskType, failoverUsed: true }
    }
  }

  if (err.code === 'MODEL_OVERLOADED' && original.cli === 'claude') {
    const downgradeChain = ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001']
    const currentIdx = downgradeChain.indexOf(original.model ?? '')
    const nextModel = downgradeChain[currentIdx + 1]
    if (nextModel) {
      const adapter = adapters.get('claude')
      if (adapter) {
        const result = await adapter.invoke({
          task: req.task,
          model: nextModel,
          modelFlag: `--model ${nextModel}`,
          bypassFlag: original.bypassFlag,
          sessionId: req.sessionId,
          onToken: onToken ?? req.onToken,
        })
        return { ...result, taskType: original.taskType, failoverUsed: true }
      }
    }
  }

  // Rate limit: retry once with 5s backoff on Gemini
  if (err.code === 'RATE_LIMIT_EXCEEDED') {
    await new Promise(r => setTimeout(r, 5000))
    const fallback = adapters.get('gemini') ?? adapters.get(original.cli)
    if (fallback) {
      const result = await fallback.invoke({
        task: req.task,
        model: 'gemini-2.5-flash',
        modelFlag: '-m flash',
        bypassFlag: '--yolo',
        sessionId: req.sessionId,
        onToken: onToken ?? req.onToken,
      })
      return { ...result, taskType: original.taskType, failoverUsed: true }
    }
  }

  throw new AdapterError(
    'All failover options exhausted',
    'UNKNOWN',
    original.cli,
    false,
  )
}
