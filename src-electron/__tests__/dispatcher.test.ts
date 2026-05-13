import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IAdapter, AdapterInvokeParams, AdapterInvokeResult, AdapterHealthResult } from '../dispatcher/types.js'
import { AdapterError } from '../dispatcher/types.js'

// Fixed YAML for router (same as router.test.ts)
const FIXED_YAML = `
settings:
  default_cli: claude
  default_model: claude-sonnet-4-6
  failover_enabled: true
  session_manager_ack_timeout_ms: 5000

routing_rules:
  - task_types: [web_search, docs_update]
    tool_requirement: web_search
    cli: gemini
    model: gemini-2.5-flash
    model_flag: "-m flash"
    bypass_flag: "--yolo"

  - task_types: [code_review, debug, multi_file_edit, complex_feature]
    tool_requirement: code_analysis
    cli: claude
    model: claude-sonnet-4-6
    model_flag: "--model claude-sonnet-4-6"
    bypass_flag: "--dangerously-skip-permissions"

failover_rules: {}
`

vi.mock('fs', () => ({
  readFileSync: vi.fn(() => FIXED_YAML),
}))

import { Dispatcher } from '../dispatcher/index.js'
import { invalidateRulesCache } from '../dispatcher/router.js'

// Helper to create a fake adapter
function makeFakeAdapter(name: string, invokeImpl?: (params: AdapterInvokeParams) => Promise<AdapterInvokeResult>): IAdapter {
  const defaultInvoke = async (params: AdapterInvokeParams): Promise<AdapterInvokeResult> => ({
    content: `Response from ${name}`,
    cli: name,
    model: params.model ?? 'default-model',
    tokens: 100,
    latencyMs: 50,
    routingMeta: { reason: 'test', toolRequirement: 'code_analysis' },
  })

  return {
    name,
    role: 'EXECUTOR',
    invoke: vi.fn(invokeImpl ?? defaultInvoke),
    dumpContext: vi.fn(async () => ''),
    checkHealth: vi.fn(async (): Promise<AdapterHealthResult> => ({ available: true, version: '1.0.0' })),
  }
}

describe('Dispatcher', () => {
  let dispatcher: Dispatcher

  beforeEach(() => {
    invalidateRulesCache()
    dispatcher = new Dispatcher()
  })

  it('dispatches successfully and returns DispatchResult with failoverUsed=false', async () => {
    const claudeAdapter = makeFakeAdapter('claude')
    dispatcher.register(claudeAdapter)

    const result = await dispatcher.dispatch({
      task: 'debug this error',
      sessionId: 'session-1',
    })

    expect(result.cli).toBe('claude')
    expect(result.failoverUsed).toBe(false)
    expect(result.taskType).toBe('debug')
    expect(result.content).toBe('Response from claude')
  })

  it('throws when adapter is not registered', async () => {
    await expect(
      dispatcher.dispatch({ task: 'debug something', sessionId: 'session-1' })
    ).rejects.toThrow('not registered')
  })

  it('failover CONTEXT_LENGTH_EXCEEDED → gemini', async () => {
    const claudeAdapter = makeFakeAdapter('claude', async () => {
      throw new AdapterError('context too long', 'CONTEXT_LENGTH_EXCEEDED', 'claude', true)
    })
    const geminiAdapter = makeFakeAdapter('gemini')

    dispatcher.register(claudeAdapter)
    dispatcher.register(geminiAdapter)

    const result = await dispatcher.dispatch({ task: 'debug this', sessionId: 'session-1' })

    expect(result.cli).toBe('gemini')
    expect(result.failoverUsed).toBe(true)
    expect(result.taskType).toBe('debug')
  })

  it('failover TIMEOUT → uses faster model on same cli', async () => {
    let callCount = 0
    const claudeAdapter = makeFakeAdapter('claude', async (params) => {
      callCount++
      if (callCount === 1) {
        throw new AdapterError('timeout', 'TIMEOUT', 'claude', true)
      }
      // Second call (faster model) succeeds
      return {
        content: 'Response from claude (fast)',
        cli: 'claude',
        model: params.model ?? 'claude-haiku',
        latencyMs: 10,
        routingMeta: { reason: 'failover', toolRequirement: 'code_analysis' },
      }
    })

    dispatcher.register(claudeAdapter)

    const result = await dispatcher.dispatch({ task: 'debug this', sessionId: 'session-1' })

    expect(result.failoverUsed).toBe(true)
    expect(result.cli).toBe('claude')
    expect(callCount).toBe(2)
  })

  it('failover RATE_LIMIT_EXCEEDED → gemini-flash after delay', async () => {
    vi.useFakeTimers()

    const claudeAdapter = makeFakeAdapter('claude', async () => {
      throw new AdapterError('rate limited', 'RATE_LIMIT_EXCEEDED', 'claude', true)
    })
    const geminiAdapter = makeFakeAdapter('gemini')

    dispatcher.register(claudeAdapter)
    dispatcher.register(geminiAdapter)

    const dispatchPromise = dispatcher.dispatch({ task: 'debug this', sessionId: 'session-1' })

    // Advance fake timers by 5s to resolve the delay
    await vi.runAllTimersAsync()

    const result = await dispatchPromise

    expect(result.failoverUsed).toBe(true)
    expect(result.cli).toBe('gemini')

    vi.useRealTimers()
  })

  it('throws AdapterError with code UNKNOWN when all failover options exhausted', async () => {
    const claudeAdapter = makeFakeAdapter('claude', async () => {
      throw new AdapterError('context too long', 'CONTEXT_LENGTH_EXCEEDED', 'claude', true)
    })

    // No gemini adapter registered
    dispatcher.register(claudeAdapter)

    await expect(
      dispatcher.dispatch({ task: 'debug this', sessionId: 'session-1' })
    ).rejects.toMatchObject({ code: 'UNKNOWN' })
  })

  it('uses forceCli to override routing', async () => {
    const geminiAdapter = makeFakeAdapter('gemini')
    dispatcher.register(geminiAdapter)

    const result = await dispatcher.dispatch({
      task: 'debug this',
      sessionId: 'session-1',
      forceCli: 'gemini',
    })

    expect(result.cli).toBe('gemini')
    expect(result.failoverUsed).toBe(false)
  })

  it('non-retryable AdapterError is thrown immediately without failover', async () => {
    const claudeAdapter = makeFakeAdapter('claude', async () => {
      throw new AdapterError('auth error', 'AUTH_ERROR', 'claude', false)
    })
    dispatcher.register(claudeAdapter)

    await expect(
      dispatcher.dispatch({ task: 'debug this', sessionId: 'session-1' })
    ).rejects.toMatchObject({ code: 'AUTH_ERROR' })
  })

  it('checkHealth returns results for all registered adapters', async () => {
    dispatcher.register(makeFakeAdapter('claude'))
    dispatcher.register(makeFakeAdapter('gemini'))

    const health = await dispatcher.checkHealth()

    expect(health).toHaveProperty('claude')
    expect(health).toHaveProperty('gemini')
    expect(health.claude.available).toBe(true)
    expect(health.gemini.available).toBe(true)
  })
})
