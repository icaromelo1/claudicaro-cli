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
  // web_search
  ['web search', 'web_search'],
  ['busca web', 'web_search'],
  ['pesquisa web', 'web_search'],
  ['pesquisar', 'web_search'],
  ['pesquisa', 'web_search'],
  ['buscar', 'web_search'],
  ['search', 'web_search'],
  ['google', 'web_search'],
  // docs_update
  ['documentação', 'docs_update'],
  ['documentation', 'docs_update'],
  ['changelog', 'docs_update'],
  ['docs', 'docs_update'],
  // log_analysis / cross_repo_audit
  ['análise de log', 'log_analysis'],
  ['analisar log', 'log_analysis'],
  ['log analysis', 'log_analysis'],
  ['auditoria', 'cross_repo_audit'],
  ['audit', 'cross_repo_audit'],
  // screenshot / image_analysis
  ['captura de tela', 'screenshot'],
  ['screenshot', 'screenshot'],
  ['imagem', 'image_analysis'],
  ['image', 'image_analysis'],
  // lint_fix / commit_message / summarization
  ['lint', 'lint_fix'],
  ['mensagem de commit', 'commit_message'],
  ['commit message', 'commit_message'],
  ['resumir', 'summarization'],
  ['resumo', 'summarization'],
  ['summarize', 'summarization'],
  // code_review / debug
  ['revisão de código', 'code_review'],
  ['revisar código', 'code_review'],
  ['code review', 'code_review'],
  ['review', 'code_review'],
  ['revisar', 'code_review'],
  ['depurar', 'debug'],
  ['corrigir bug', 'debug'],
  ['debug', 'debug'],
  ['bug', 'debug'],
  // architecture / adr / system_design / strategic_planning
  ['arquitetura', 'architecture'],
  ['architecture', 'architecture'],
  ['adr', 'adr'],
  ['design de sistema', 'system_design'],
  ['system design', 'system_design'],
  ['plano estratégico', 'strategic_planning'],
  ['planejamento estratégico', 'strategic_planning'],
  ['strategic plan', 'strategic_planning'],
  // create_pr / create_branch / shell_suggestion
  ['pull request', 'create_pr'],
  ['criar pr', 'create_pr'],
  ['cria uma pr', 'create_pr'],
  ['cria pr', 'create_pr'],
  ['abrir pr', 'create_pr'],
  ['abre uma pr', 'create_pr'],
  ['abre pr', 'create_pr'],
  ['create pr', 'create_pr'],
  ['nova branch', 'create_branch'],
  ['criar branch', 'create_branch'],
  ['new branch', 'create_branch'],
  ['comando shell', 'shell_suggestion'],
  ['sugestão de comando', 'shell_suggestion'],
  ['shell', 'shell_suggestion'],
  // complex_feature / multi_file_edit
  ['refatorar', 'multi_file_edit'],
  ['refactor', 'multi_file_edit'],
  ['nova funcionalidade', 'complex_feature'],
  ['implementar', 'complex_feature'],
  ['feature', 'complex_feature'],
  ['implement', 'complex_feature'],
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
