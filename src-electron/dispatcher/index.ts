import type { IAdapter, AdapterInvokeParams, AdapterHealthResult, DispatchRequest, DispatchResult } from './types.js'
import { AdapterError } from './types.js'
import { route } from './router.js'
import { handleFailover } from './failover.js'
import { metrics } from '../metrics/index.js'

export type { DispatchRequest, DispatchResult }

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

    // Se forceCli sobreescreve o CLI roteado, não usar flags destinadas ao CLI original
    const useRouteFlags = !req.forceCli || req.forceCli === routeResult.cli

    const params: AdapterInvokeParams = {
      task: req.task,
      model: useRouteFlags ? routeResult.model : undefined,
      modelFlag: useRouteFlags ? routeResult.modelFlag : undefined,
      bypassFlag: useRouteFlags ? routeResult.bypassFlag : undefined,
      sessionId: req.sessionId,
      cliSessionId: req.cliSessionId,
      contextMessages: req.contextMessages,
      onToken: req.onToken,
      abortSignal: req.abortSignal,
    }

    try {
      const result = await adapter.invoke(params)
      metrics.record({
        cli,
        model: result.model,
        latencyMs: result.latencyMs ?? 0,
        tokens: result.tokens,
        timestamp: new Date(),
      })
      return { ...result, taskType: routeResult.taskType, failoverUsed: false }
    } catch (err) {
      if (err instanceof AdapterError && err.retryable) {
        metrics.record({ cli, latencyMs: 0, error: true, timestamp: new Date() })
        return handleFailover(err, req, routeResult, this.adapters)
      }
      throw err
    }
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
