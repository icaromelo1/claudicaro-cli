import { readFileSync } from 'fs'
import { join } from 'path'
import { load as yamlLoad } from 'js-yaml'

interface RoutingRule {
  task_types: string[]
  tool_requirement: string
  cli: string
  model?: string
  model_flag?: string
  bypass_flag?: string
  mode?: string
  role?: string
  requires_confirmation?: boolean
  dry_run_required?: boolean
}

interface RulesConfig {
  settings: {
    default_cli: string
    default_model: string
    failover_enabled: boolean
    session_manager_ack_timeout_ms: number
  }
  routing_rules: RoutingRule[]
  failover_rules: Record<string, unknown>
}

export interface RouteResult {
  taskType: string
  cli: string
  model?: string
  modelFlag?: string
  bypassFlag?: string
  toolRequirement: string
  requiresConfirmation: boolean
  isDefault: boolean
}

const TASK_KEYWORDS: Array<[string, string]> = [
  ['web search', 'web_search'],
  ['search', 'web_search'],
  ['google', 'web_search'],
  ['docs', 'docs_update'],
  ['documentation', 'docs_update'],
  ['log analysis', 'log_analysis'],
  ['audit', 'cross_repo_audit'],
  ['screenshot', 'screenshot'],
  ['image', 'image_analysis'],
  ['imagem', 'image_analysis'],
  ['lint', 'lint_fix'],
  ['commit message', 'commit_message'],
  ['summarize', 'summarization'],
  ['resumo', 'summarization'],
  ['code review', 'code_review'],
  ['review', 'code_review'],
  ['debug', 'debug'],
  ['bug', 'debug'],
  ['architecture', 'architecture'],
  ['adr', 'adr'],
  ['system design', 'system_design'],
  ['strategic plan', 'strategic_planning'],
  ['pull request', 'create_pr'],
  ['create pr', 'create_pr'],
  ['new branch', 'create_branch'],
  ['shell', 'shell_suggestion'],
  ['feature', 'complex_feature'],
  ['implement', 'complex_feature'],
  ['refactor', 'multi_file_edit'],
]

export function classifyTask(task: string): string {
  const lower = task.toLowerCase()
  for (const [keyword, taskType] of TASK_KEYWORDS) {
    if (lower.includes(keyword)) return taskType
  }
  return 'complex_feature'
}

let cachedRules: RulesConfig | null = null

export function loadRules(): RulesConfig {
  if (cachedRules) return cachedRules
  const rulesPath = join(process.cwd(), 'rules', 'rules.yaml')
  const raw = readFileSync(rulesPath, 'utf-8')
  cachedRules = yamlLoad(raw) as RulesConfig
  return cachedRules
}

export function invalidateRulesCache(): void {
  cachedRules = null
}

export function route(task: string, forceTaskType?: string): RouteResult {
  const rules = loadRules()
  const taskType = forceTaskType ?? classifyTask(task)
  const matched = rules.routing_rules.find(r => r.task_types.includes(taskType))

  if (!matched) {
    return {
      taskType,
      cli: rules.settings.default_cli,
      model: rules.settings.default_model,
      toolRequirement: 'code_analysis',
      requiresConfirmation: false,
      isDefault: true,
    }
  }

  return {
    taskType,
    cli: matched.cli,
    model: matched.model,
    modelFlag: matched.model_flag,
    bypassFlag: matched.bypass_flag,
    toolRequirement: matched.tool_requirement,
    requiresConfirmation: matched.requires_confirmation ?? false,
    isDefault: false,
  }
}
