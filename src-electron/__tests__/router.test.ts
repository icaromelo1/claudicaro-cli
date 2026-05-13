import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Fixed YAML content to avoid reading from disk
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

  - task_types: [shell_suggestion, shell_command]
    tool_requirement: github_native
    cli: copilot
    mode: suggest
    role: CONSELHEIRO
    requires_confirmation: true

failover_rules: {}
`

// Mock fs to return our fixed YAML
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => FIXED_YAML),
}))

import { classifyTask, route, invalidateRulesCache } from '../dispatcher/router.js'

describe('classifyTask', () => {
  it('classifies "debug" keyword', () => {
    expect(classifyTask('debug this error')).toBe('debug')
  })

  it('classifies "web search" keyword', () => {
    expect(classifyTask('web search for latest docs')).toBe('web_search')
  })

  it('classifies "review" keyword', () => {
    expect(classifyTask('review this PR')).toBe('code_review')
  })

  it('classifies "feature" keyword', () => {
    expect(classifyTask('add new feature for login')).toBe('complex_feature')
  })

  it('classifies "implement" keyword', () => {
    expect(classifyTask('implement the new endpoint')).toBe('complex_feature')
  })

  it('classifies "refactor" keyword', () => {
    expect(classifyTask('refactor the auth module')).toBe('multi_file_edit')
  })

  it('returns complex_feature for unknown keywords', () => {
    expect(classifyTask('xpto unknown stuff nobody knows')).toBe('complex_feature')
  })

  it('is case-insensitive', () => {
    expect(classifyTask('DEBUG this error')).toBe('debug')
    expect(classifyTask('WEB SEARCH for stuff')).toBe('web_search')
  })

  it('matches first keyword in order for overlapping terms', () => {
    // "code review" contains "review" but "web search" should match "search"
    expect(classifyTask('search for code review')).toBe('web_search')
  })
})

describe('route', () => {
  beforeEach(() => {
    invalidateRulesCache()
  })

  afterEach(() => {
    invalidateRulesCache()
  })

  it('routes debug task to claude with correct model', () => {
    const result = route('debug this error')
    expect(result.cli).toBe('claude')
    expect(result.taskType).toBe('debug')
    expect(result.model).toBe('claude-sonnet-4-6')
    expect(result.toolRequirement).toBe('code_analysis')
    expect(result.isDefault).toBe(false)
    expect(result.requiresConfirmation).toBe(false)
  })

  it('routes web_search task to gemini', () => {
    const result = route('web search for latest news')
    expect(result.cli).toBe('gemini')
    expect(result.taskType).toBe('web_search')
    expect(result.model).toBe('gemini-2.5-flash')
    expect(result.isDefault).toBe(false)
  })

  it('routes shell task to copilot with requiresConfirmation=true', () => {
    const result = route('shell command to list files')
    expect(result.cli).toBe('copilot')
    expect(result.taskType).toBe('shell_suggestion')
    expect(result.requiresConfirmation).toBe(true)
    expect(result.isDefault).toBe(false)
  })

  it('uses forceTaskType when provided', () => {
    const result = route('some random task', 'web_search')
    expect(result.taskType).toBe('web_search')
    expect(result.cli).toBe('gemini')
  })

  it('returns default RouteResult when task_type has no matching rule', () => {
    const result = route('some weird unknown task type', 'no_such_type')
    expect(result.isDefault).toBe(true)
    expect(result.cli).toBe('claude')
    expect(result.model).toBe('claude-sonnet-4-6')
    expect(result.taskType).toBe('no_such_type')
    expect(result.toolRequirement).toBe('code_analysis')
  })

  it('includes bypassFlag in result for claude route', () => {
    const result = route('debug something')
    expect(result.bypassFlag).toBe('--dangerously-skip-permissions')
  })

  it('includes modelFlag in result', () => {
    const result = route('web search something')
    expect(result.modelFlag).toBe('-m flash')
  })
})
