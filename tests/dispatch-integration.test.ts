import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IAdapter, AdapterInvokeParams, AdapterInvokeResult, AdapterHealthResult } from '../src-electron/dispatcher/types.js'

// Fixed YAML for router
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

import { Dispatcher } from '../src-electron/dispatcher/index.js'
import { invalidateRulesCache } from '../src-electron/dispatcher/router.js'

// Fake adapter for integration testing
function makeMockAdapter(name: string, mockContent: string): IAdapter {
  return {
    name,
    role: 'EXECUTOR',
    invoke: vi.fn(async (params: AdapterInvokeParams): Promise<AdapterInvokeResult> => ({
      content: mockContent,
      cli: name,
      model: params.model ?? 'test-model',
      tokens: 42,
      latencyMs: 30,
      routingMeta: { reason: 'integration-test', toolRequirement: 'code_analysis' },
    })),
    dumpContext: vi.fn(async () => ''),
    checkHealth: vi.fn(async (): Promise<AdapterHealthResult> => ({ available: true })),
  }
}

describe('Dispatch Integration (mock adapters, no real processes)', () => {
  let dispatcher: Dispatcher

  beforeEach(() => {
    invalidateRulesCache()
    dispatcher = new Dispatcher()
  })

  it('dispatch returns DispatchResult with correct fields', async () => {
    const adapter = makeMockAdapter('claude', 'Here is the answer to your debug question.')
    dispatcher.register(adapter)

    const result = await dispatcher.dispatch({
      task: 'debug this null pointer exception',
      sessionId: 'integration-session-1',
    })

    expect(result).toMatchObject({
      content: 'Here is the answer to your debug question.',
      cli: 'claude',
      model: 'claude-sonnet-4-6',
      taskType: 'debug',
      failoverUsed: false,
      tokens: 42,
      latencyMs: 30,
    })

    expect(result.routingMeta).toMatchObject({
      reason: 'integration-test',
      toolRequirement: 'code_analysis',
    })
  })

  it('dispatch routes web_search to gemini adapter', async () => {
    const geminiAdapter = makeMockAdapter('gemini', 'Search results here.')
    dispatcher.register(geminiAdapter)

    const result = await dispatcher.dispatch({
      task: 'web search for React 19 release notes',
      sessionId: 'integration-session-2',
    })

    expect(result.cli).toBe('gemini')
    expect(result.taskType).toBe('web_search')
    expect(result.failoverUsed).toBe(false)
    expect(result.content).toBe('Search results here.')
  })

  it('dispatch passes onToken callback to adapter', async () => {
    const tokenChunks: string[] = []
    const adapter = makeMockAdapter('claude', 'Streamed response.')
    dispatcher.register(adapter)

    const onToken = (chunk: string) => tokenChunks.push(chunk)

    await dispatcher.dispatch({
      task: 'implement a new feature',
      sessionId: 'integration-session-3',
      onToken,
    })

    // Verify onToken was passed through to adapter.invoke
    const invokeCall = (adapter.invoke as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(invokeCall.onToken).toBe(onToken)
  })

  it('dispatch with forceTaskType overrides routing', async () => {
    const geminiAdapter = makeMockAdapter('gemini', 'Gemini web search result.')
    dispatcher.register(geminiAdapter)

    const result = await dispatcher.dispatch({
      task: 'implement a complex feature',
      sessionId: 'integration-session-4',
      forceTaskType: 'web_search',
    })

    // forceTaskType should route to gemini even though task sounds like complex_feature
    expect(result.cli).toBe('gemini')
    expect(result.taskType).toBe('web_search')
  })

  it('dispatch with forceCli bypasses routing cli selection', async () => {
    const claudeAdapter = makeMockAdapter('claude', 'Claude forced response.')
    const geminiAdapter = makeMockAdapter('gemini', 'Gemini response.')
    dispatcher.register(claudeAdapter)
    dispatcher.register(geminiAdapter)

    // Task would normally go to gemini (web_search), but forceCli sends to claude
    const result = await dispatcher.dispatch({
      task: 'web search for something',
      sessionId: 'integration-session-5',
      forceCli: 'claude',
    })

    expect(result.cli).toBe('claude')
    expect(result.failoverUsed).toBe(false)
  })

  it('multiple dispatches work independently', async () => {
    const adapter = makeMockAdapter('claude', 'Response.')
    dispatcher.register(adapter)

    const results = await Promise.all([
      dispatcher.dispatch({ task: 'debug error A', sessionId: 'session-a' }),
      dispatcher.dispatch({ task: 'debug error B', sessionId: 'session-b' }),
      dispatcher.dispatch({ task: 'debug error C', sessionId: 'session-c' }),
    ])

    expect(results).toHaveLength(3)
    results.forEach(r => {
      expect(r.cli).toBe('claude')
      expect(r.taskType).toBe('debug')
      expect(r.failoverUsed).toBe(false)
    })
  })
})
