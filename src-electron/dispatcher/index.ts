import type { IAdapter, AdapterInvokeParams, AdapterInvokeResult, AdapterHealthResult } from './types.js'
import { AdapterError } from './types.js'
import { route, type RouteResult } from './router.js'

export interface DispatchRequest {
  task: string
  sessionId: string
  forceTaskType?: string
  forceCli?: string
  onToken?: (chunk: string) => void
}

export interface DispatchResult extends AdapterInvokeResult {
  taskType: string
  failoverUsed: boolean
}

export class Dispatcher {
  private adapters = new Map<string, IAdapter>()

  register(adapter: IAdapter): void {
    this.adapters.set(adapter.name, adapter)
  }

  async dispatch(req: DispatchRequest): Promise<DispatchResult> {
    const routeResult = route(req.task, req.forceTaskType)
    const cli = req.forceCli ?? routeResult.cli

    const adapter = this.adapters.get(cli)
    if (!adapter) {
      throw new AdapterError(`Adapter '${cli}' not registered`, 'CLI_NOT_FOUND', cli, false)
    }

    const params: AdapterInvokeParams = {
      task: req.task,
      model: routeResult.model,
      modelFlag: routeResult.modelFlag,
      bypassFlag: routeResult.bypassFlag,
      sessionId: req.sessionId,
      onToken: req.onToken,
    }

    try {
      const result = await adapter.invoke(params)
      return { ...result, taskType: routeResult.taskType, failoverUsed: false }
    } catch (err) {
      if (err instanceof AdapterError && err.retryable) {
        return this.handleFailover(err, req, routeResult)
      }
      throw err
    }
  }

  private async handleFailover(
    err: AdapterError,
    req: DispatchRequest,
    original: RouteResult,
  ): Promise<DispatchResult> {
    if (err.code === 'CONTEXT_LENGTH_EXCEEDED') {
      const fallback = this.adapters.get('gemini')
      if (fallback) {
        const result = await fallback.invoke({
          task: req.task,
          model: 'gemini-2.5-pro',
          modelFlag: '-m pro',
          bypassFlag: '--yolo',
          sessionId: req.sessionId,
          onToken: req.onToken,
        })
        return { ...result, taskType: original.taskType, failoverUsed: true }
      }
    }

    if (err.code === 'TIMEOUT') {
      const adapter = this.adapters.get(original.cli)
      if (adapter) {
        const result = await adapter.invoke({
          task: req.task,
          model: original.cli === 'gemini' ? 'gemini-2.5-flash' : 'claude-haiku-4-5-20251001',
          modelFlag: original.cli === 'gemini' ? '-m flash' : '--model claude-haiku-4-5-20251001',
          bypassFlag: original.bypassFlag,
          sessionId: req.sessionId,
          onToken: req.onToken,
        })
        return { ...result, taskType: original.taskType, failoverUsed: true }
      }
    }

    if (err.code === 'MODEL_OVERLOADED' && original.cli === 'claude') {
      const downgradeChain = ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001']
      const currentIdx = downgradeChain.indexOf(original.model ?? '')
      const nextModel = downgradeChain[currentIdx + 1]
      if (nextModel) {
        const adapter = this.adapters.get('claude')
        if (adapter) {
          const result = await adapter.invoke({
            task: req.task,
            model: nextModel,
            modelFlag: `--model ${nextModel}`,
            bypassFlag: original.bypassFlag,
            sessionId: req.sessionId,
            onToken: req.onToken,
          })
          return { ...result, taskType: original.taskType, failoverUsed: true }
        }
      }
    }

    // Rate limit: retry once with 5s backoff on Gemini
    if (err.code === 'RATE_LIMIT_EXCEEDED') {
      await new Promise(r => setTimeout(r, 5000))
      const fallback = this.adapters.get('gemini') ?? this.adapters.get(original.cli)
      if (fallback) {
        const result = await fallback.invoke({
          task: req.task,
          model: 'gemini-2.5-flash',
          modelFlag: '-m flash',
          bypassFlag: '--yolo',
          sessionId: req.sessionId,
          onToken: req.onToken,
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

  async checkHealth(): Promise<Record<string, AdapterHealthResult>> {
    const results: Record<string, AdapterHealthResult> = {}
    await Promise.all(
      [...this.adapters.entries()].map(async ([name, adapter]) => {
        results[name] = await adapter.checkHealth()
      }),
    )
    return results
  }

  getRegisteredAdapters(): string[] {
    return [...this.adapters.keys()]
  }
}

export const dispatcher = new Dispatcher()
