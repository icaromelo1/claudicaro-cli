<template>
  <q-layout view="lHh lpR lFf" class="cc-app">
    <q-page-container>
      <q-page class="cc-workflow-page">
        <!-- Header -->
        <div class="cc-workflow-header">
          <span class="cc-workflow-title">Fluxo do Dispatcher</span>
          <div class="cc-header-actions">
            <label class="cc-toggle-label">
              <span class="cc-toggle-text">Mostrar failovers</span>
              <button
                class="cc-toggle"
                :class="{ 'cc-toggle--on': showFailovers }"
                :aria-checked="showFailovers"
                role="switch"
                @click="showFailovers = !showFailovers"
              >
                <span class="cc-toggle-thumb" />
              </button>
            </label>
          </div>
        </div>

        <!-- Main area: diagram + sidebar -->
        <div class="cc-workflow-body">
          <!-- SVG Diagram -->
          <div class="cc-diagram-wrap">
            <svg
              ref="svgEl"
              class="cc-svg"
              :viewBox="`0 0 ${SVG_W} ${svgHeight}`"
              xmlns="http://www.w3.org/2000/svg"
              @mouseleave="hideTooltip"
            >
              <defs>
                <!-- Arrow marker -->
                <marker
                  id="arrow"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    :fill="COLORS.border_strong"
                  />
                </marker>
                <!-- Failover arrow marker -->
                <marker
                  id="arrow-failover"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    :fill="COLORS.warning"
                    fill-opacity="0.7"
                  />
                </marker>
              </defs>

              <!-- ── Edges (drawn first so nodes appear on top) ── -->

              <!-- Input → classifyTask -->
              <line
                :x1="cx(NODES.input)" :y1="by(NODES.input)"
                :x2="cx(NODES.classify)" :y2="ty(NODES.classify)"
                stroke="var(--border-strong)" stroke-width="1.5"
                marker-end="url(#arrow)"
              />

              <!-- classifyTask → Router -->
              <line
                :x1="cx(NODES.classify)" :y1="by(NODES.classify)"
                :x2="cx(NODES.router)" :y2="ty(NODES.router)"
                stroke="var(--border-strong)" stroke-width="1.5"
                marker-end="url(#arrow)"
              />

              <!-- Router → Claude -->
              <path
                :d="routerToCli(NODES.router, NODES.claude)"
                stroke="var(--cli-claude)" stroke-width="1.5" fill="none"
                marker-end="url(#arrow)"
                stroke-dasharray="none"
              />

              <!-- Router → Gemini -->
              <line
                :x1="cx(NODES.router)" :y1="by(NODES.router) + DIAMOND_H / 2"
                :x2="cx(NODES.gemini)" :y2="ty(NODES.gemini)"
                stroke="var(--cli-gemini)" stroke-width="1.5"
                marker-end="url(#arrow)"
              />

              <!-- Router → Copilot -->
              <path
                :d="routerToCli(NODES.router, NODES.copilot)"
                stroke="var(--cli-copilot)" stroke-width="1.5" fill="none"
                marker-end="url(#arrow)"
              />

              <!-- Edge labels on router output -->
              <text
                :x="cx(NODES.claude) + NODE_W / 2 + 10"
                :y="ty(NODES.claude) - 8"
                class="cc-edge-label"
              >code_review, debug</text>
              <text
                :x="cx(NODES.gemini) + NODE_W / 2 + 10"
                :y="ty(NODES.gemini) - 8"
                class="cc-edge-label"
              >web_search, vision</text>
              <text
                :x="cx(NODES.copilot) + NODE_W / 2 + 10"
                :y="ty(NODES.copilot) - 8"
                class="cc-edge-label"
              >shell, create_pr</text>

              <!-- Normal path: CLI nodes → Result (when failover hidden) -->
              <template v-if="!showFailovers">
                <path
                  :d="cliToNode(NODES.claude, NODES.result)"
                  stroke="var(--border-strong)" stroke-width="1.5" fill="none"
                  marker-end="url(#arrow)"
                />
                <path
                  :d="cliToNode(NODES.gemini, NODES.result)"
                  stroke="var(--border-strong)" stroke-width="1.5" fill="none"
                  marker-end="url(#arrow)"
                />
                <path
                  :d="cliToNode(NODES.copilot, NODES.result)"
                  stroke="var(--border-strong)" stroke-width="1.5" fill="none"
                  marker-end="url(#arrow)"
                />
              </template>

              <!-- Failover paths -->
              <template v-if="showFailovers">
                <!-- CLI nodes → Failover? -->
                <path
                  :d="cliToNode(NODES.claude, NODES.failover)"
                  stroke="var(--border-strong)" stroke-width="1.5" fill="none"
                  marker-end="url(#arrow)"
                />
                <path
                  :d="cliToNode(NODES.gemini, NODES.failover)"
                  stroke="var(--border-strong)" stroke-width="1.5" fill="none"
                  marker-end="url(#arrow)"
                />
                <path
                  :d="cliToNode(NODES.copilot, NODES.failover)"
                  stroke="var(--border-strong)" stroke-width="1.5" fill="none"
                  marker-end="url(#arrow)"
                />

                <!-- Failover? → Sim branch (Redirect) -->
                <line
                  :x1="NODES.failover.x - DIAMOND_W / 2"
                  :y1="NODES.failover.y"
                  :x2="NODES.redirect.x + NODE_W"
                  :y2="NODES.redirect.y + NODE_H / 2"
                  stroke="var(--warning)" stroke-width="1.5" stroke-opacity="0.7"
                  stroke-dasharray="5,3"
                  marker-end="url(#arrow-failover)"
                />
                <text
                  :x="NODES.failover.x - DIAMOND_W / 2 - 4"
                  :y="NODES.failover.y + 14"
                  class="cc-edge-label cc-edge-label--warn"
                  text-anchor="end"
                >Sim</text>

                <!-- Failover? → Não branch (Result) -->
                <line
                  :x1="NODES.failover.x + DIAMOND_W / 2"
                  :y1="NODES.failover.y"
                  :x2="NODES.result.x"
                  :y2="NODES.result.y + NODE_H / 2"
                  stroke="var(--accent)" stroke-width="1.5"
                  marker-end="url(#arrow)"
                />
                <text
                  :x="NODES.failover.x + DIAMOND_W / 2 + 4"
                  :y="NODES.failover.y + 14"
                  class="cc-edge-label cc-edge-label--accent"
                >Não</text>
              </template>

              <!-- ── Nodes ── -->

              <!-- Input -->
              <g
                class="cc-node"
                @mouseenter="e => showTooltip(e, 'input')"
                @mousemove="e => moveTooltip(e)"
              >
                <rect
                  :x="NODES.input.x" :y="NODES.input.y"
                  :width="NODE_W" :height="NODE_H"
                  rx="8"
                  fill="var(--bg-elevated)"
                  :stroke="COLORS.border_strong"
                  stroke-width="1"
                />
                <text :x="cx(NODES.input)" :y="my(NODES.input)" class="cc-node-label" text-anchor="middle" dominant-baseline="middle">
                  Input do Usuário
                </text>
              </g>

              <!-- classifyTask -->
              <g
                class="cc-node"
                @mouseenter="e => showTooltip(e, 'classify')"
                @mousemove="e => moveTooltip(e)"
              >
                <rect
                  :x="NODES.classify.x" :y="NODES.classify.y"
                  :width="NODE_W" :height="NODE_H"
                  rx="8"
                  fill="var(--accent-dim)"
                  stroke="var(--accent)"
                  stroke-width="1.5"
                />
                <text :x="cx(NODES.classify)" :y="my(NODES.classify) - 5" class="cc-node-label cc-node-label--accent" text-anchor="middle" dominant-baseline="middle">
                  classifyTask()
                </text>
                <text :x="cx(NODES.classify)" :y="my(NODES.classify) + 10" class="cc-node-sublabel" text-anchor="middle" dominant-baseline="middle">
                  → taskType
                </text>
              </g>

              <!-- Router diamond -->
              <g
                class="cc-node"
                @mouseenter="e => showTooltip(e, 'router')"
                @mousemove="e => moveTooltip(e)"
              >
                <polygon
                  :points="diamondPoints(NODES.router)"
                  fill="var(--bg-elevated)"
                  :stroke="COLORS.border_strong"
                  stroke-width="1.5"
                />
                <text :x="cx(NODES.router)" :y="NODES.router.y" class="cc-node-label" text-anchor="middle" dominant-baseline="middle">
                  Router
                </text>
              </g>

              <!-- Claude node -->
              <g
                class="cc-node"
                @mouseenter="e => showTooltip(e, 'claude')"
                @mousemove="e => moveTooltip(e)"
              >
                <rect
                  :x="NODES.claude.x" :y="NODES.claude.y"
                  :width="NODE_W" :height="NODE_H"
                  rx="8"
                  fill="rgba(217,119,87,0.12)"
                  stroke="var(--cli-claude)"
                  stroke-width="1.5"
                />
                <circle
                  :cx="NODES.claude.x + 14"
                  :cy="NODES.claude.y + NODE_H / 2"
                  r="4"
                  fill="var(--cli-claude)"
                />
                <text :x="NODES.claude.x + 26" :y="my(NODES.claude)" class="cc-node-label cc-node-label--claude" dominant-baseline="middle">
                  Claude
                </text>
                <text :x="NODES.claude.x + 26" :y="my(NODES.claude) + 13" class="cc-node-sublabel" dominant-baseline="middle">
                  EXECUTOR
                </text>
              </g>

              <!-- Gemini node -->
              <g
                class="cc-node"
                @mouseenter="e => showTooltip(e, 'gemini')"
                @mousemove="e => moveTooltip(e)"
              >
                <rect
                  :x="NODES.gemini.x" :y="NODES.gemini.y"
                  :width="NODE_W" :height="NODE_H"
                  rx="8"
                  fill="rgba(81,135,242,0.12)"
                  stroke="var(--cli-gemini)"
                  stroke-width="1.5"
                />
                <circle
                  :cx="NODES.gemini.x + 14"
                  :cy="NODES.gemini.y + NODE_H / 2"
                  r="4"
                  fill="var(--cli-gemini)"
                />
                <text :x="NODES.gemini.x + 26" :y="my(NODES.gemini)" class="cc-node-label cc-node-label--gemini" dominant-baseline="middle">
                  Gemini
                </text>
                <text :x="NODES.gemini.x + 26" :y="my(NODES.gemini) + 13" class="cc-node-sublabel" dominant-baseline="middle">
                  EXECUTOR
                </text>
              </g>

              <!-- Copilot node -->
              <g
                class="cc-node"
                @mouseenter="e => showTooltip(e, 'copilot')"
                @mousemove="e => moveTooltip(e)"
              >
                <rect
                  :x="NODES.copilot.x" :y="NODES.copilot.y"
                  :width="NODE_W" :height="NODE_H"
                  rx="8"
                  fill="rgba(181,192,204,0.12)"
                  stroke="var(--cli-copilot)"
                  stroke-width="1.5"
                />
                <circle
                  :cx="NODES.copilot.x + 14"
                  :cy="NODES.copilot.y + NODE_H / 2"
                  r="4"
                  fill="var(--cli-copilot)"
                />
                <text :x="NODES.copilot.x + 26" :y="my(NODES.copilot) - 5" class="cc-node-label cc-node-label--copilot" dominant-baseline="middle">
                  Copilot
                </text>
                <text :x="NODES.copilot.x + 26" :y="my(NODES.copilot) + 9" class="cc-node-sublabel" dominant-baseline="middle">
                  CONSELHEIRO
                </text>
                <!-- CONSELHEIRO badge -->
                <rect
                  :x="NODES.copilot.x + NODE_W - 80"
                  :y="NODES.copilot.y + 4"
                  width="72"
                  height="14"
                  rx="3"
                  fill="rgba(181,192,204,0.18)"
                  stroke="var(--cli-copilot)"
                  stroke-width="0.75"
                />
                <text
                  :x="NODES.copilot.x + NODE_W - 44"
                  :y="NODES.copilot.y + 12"
                  class="cc-badge-text"
                  text-anchor="middle"
                  dominant-baseline="middle"
                >CONSELHEIRO</text>
              </g>

              <!-- Failover? diamond (conditional) -->
              <template v-if="showFailovers">
                <g
                  class="cc-node"
                  @mouseenter="e => showTooltip(e, 'failover')"
                  @mousemove="e => moveTooltip(e)"
                >
                  <polygon
                    :points="diamondPoints(NODES.failover)"
                    fill="var(--bg-elevated)"
                    stroke="var(--warning)"
                    stroke-width="1.5"
                    stroke-opacity="0.8"
                  />
                  <text :x="cx(NODES.failover)" :y="NODES.failover.y" class="cc-node-label cc-node-label--warn" text-anchor="middle" dominant-baseline="middle">
                    Failover?
                  </text>
                </g>

                <!-- Redirect node -->
                <g
                  class="cc-node"
                  @mouseenter="e => showTooltip(e, 'redirect')"
                  @mousemove="e => moveTooltip(e)"
                >
                  <rect
                    :x="NODES.redirect.x" :y="NODES.redirect.y"
                    :width="NODE_W" :height="NODE_H"
                    rx="8"
                    fill="rgba(245,165,36,0.1)"
                    stroke="var(--warning)"
                    stroke-width="1.5"
                    stroke-opacity="0.7"
                    stroke-dasharray="4,2"
                  />
                  <text :x="cx(NODES.redirect)" :y="my(NODES.redirect)" class="cc-node-label cc-node-label--warn" text-anchor="middle" dominant-baseline="middle">
                    Redirect
                  </text>
                  <text :x="cx(NODES.redirect)" :y="my(NODES.redirect) + 13" class="cc-node-sublabel" text-anchor="middle" dominant-baseline="middle">
                    outro CLI / modelo
                  </text>
                </g>
              </template>

              <!-- Resultado Final -->
              <g
                class="cc-node"
                @mouseenter="e => showTooltip(e, 'result')"
                @mousemove="e => moveTooltip(e)"
              >
                <rect
                  :x="NODES.result.x" :y="NODES.result.y"
                  :width="NODE_W" :height="NODE_H"
                  rx="8"
                  fill="var(--accent-dim)"
                  stroke="var(--accent)"
                  stroke-width="1.5"
                />
                <text :x="cx(NODES.result)" :y="my(NODES.result)" class="cc-node-label cc-node-label--accent" text-anchor="middle" dominant-baseline="middle">
                  Resultado Final
                </text>
              </g>
            </svg>

            <!-- Tooltip -->
            <div
              v-if="tooltip.visible"
              class="cc-tooltip"
              :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
            >
              <div class="cc-tooltip-title">{{ tooltip.title }}</div>
              <div
                v-for="(line, i) in tooltip.lines"
                :key="i"
                class="cc-tooltip-line"
              >{{ line }}</div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="cc-sidebar">
            <!-- Routing rules -->
            <div class="cc-sidebar-section">
              <div class="cc-sidebar-heading">Routing Rules ({{ ROUTING_RULES.length }})</div>
              <div
                v-for="(rule, i) in ROUTING_RULES"
                :key="i"
                class="cc-rule-row"
              >
                <span class="cc-rule-types">{{ rule.types.join(', ') }}</span>
                <div class="cc-rule-target">
                  <span class="cc-dot" :style="{ background: `var(--cli-${rule.cli})` }" />
                  <span class="cc-rule-cli" :style="{ color: `var(--cli-${rule.cli})` }">{{ rule.cli }}</span>
                  <span class="cc-rule-model">{{ rule.model }}</span>
                </div>
              </div>
            </div>

            <div class="cc-sidebar-divider" />

            <!-- Failover rules -->
            <div class="cc-sidebar-section">
              <div class="cc-sidebar-heading">Failover Rules ({{ FAILOVER_RULES.length }})</div>
              <div
                v-for="(rule, i) in FAILOVER_RULES"
                :key="i"
                class="cc-failover-row"
              >
                <span class="cc-failover-code">{{ rule.code }}</span>
                <span class="cc-failover-action">{{ rule.action }}</span>
              </div>
            </div>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Constants ────────────────────────────────────────────────────────────────

const SVG_W = 780
const NODE_W = 160
const NODE_H = 48
const DIAMOND_W = 90
const DIAMOND_H = 54
const COLS = {
  left:   80,
  center: (SVG_W - NODE_W) / 2,    // 310
  right:  SVG_W - NODE_W - 80,      // 540
}
const CENTER_X = SVG_W / 2

// Row Y positions (top of node / center of diamond)
const ROWS = {
  input:    40,
  classify: 130,
  router:   225,    // diamond center Y
  clis:     330,
  failover: 450,    // diamond center Y (conditional)
  redirect: 530,
  result:   530,
}

const COLORS = {
  border_strong: 'rgba(255,255,255,0.14)',
  warning: '#F5A524',
}

// Node layout: x/y are top-left for rects; center for diamonds (we use cx/cy helpers)
const NODES = {
  input:    { x: CENTER_X - NODE_W / 2, y: ROWS.input },
  classify: { x: CENTER_X - NODE_W / 2, y: ROWS.classify },
  router:   { x: CENTER_X,              y: ROWS.router },   // diamond center
  claude:   { x: COLS.left,             y: ROWS.clis },
  gemini:   { x: CENTER_X - NODE_W / 2, y: ROWS.clis },
  copilot:  { x: COLS.right,            y: ROWS.clis },
  failover: { x: CENTER_X,              y: ROWS.failover }, // diamond center
  redirect: { x: COLS.left,             y: ROWS.redirect },
  result:   { x: COLS.right,            y: ROWS.result },
}

// ── SVG helpers ──────────────────────────────────────────────────────────────

function cx(n: { x: number }): number { return n.x + NODE_W / 2 }
function my(n: { y: number }): number { return n.y + NODE_H / 2 }
function ty(n: { y: number }): number { return n.y }
function by(n: { y: number }): number { return n.y + NODE_H }

function diamondPoints(n: { x: number; y: number }): string {
  const { x, y } = n
  return `${x},${y} ${x + DIAMOND_W / 2},${y - DIAMOND_H / 2} ${x + DIAMOND_W},${y} ${x + DIAMOND_W / 2},${y + DIAMOND_H / 2}`
}

// Curved path from router diamond bottom to a CLI node top
function routerToCli(router: { x: number; y: number }, cli: { x: number; y: number }): string {
  const sx = router.x
  const sy = router.y + DIAMOND_H / 2
  const tx = cx(cli)
  const ty2 = cli.y
  const my2 = sy + (ty2 - sy) / 2
  return `M ${sx} ${sy} C ${sx} ${my2}, ${tx} ${my2}, ${tx} ${ty2}`
}

// Curved path from a CLI node bottom toward a target node top
function cliToNode(cli: { x: number; y: number }, target: { x: number; y: number }): string {
  // for diamond target, adjust endpoint
  const isTargetDiamond = target === NODES.failover
  const sx = cx(cli)
  const sy = cli.y + NODE_H
  const tx = isTargetDiamond ? target.x : cx(target)
  const ty2 = isTargetDiamond ? target.y + DIAMOND_H / 2 : target.y
  const my2 = sy + (ty2 - sy) / 2
  return `M ${sx} ${sy} C ${sx} ${my2}, ${tx} ${my2}, ${tx} ${ty2}`
}

// ── State ────────────────────────────────────────────────────────────────────

const showFailovers = ref(false)

const svgHeight = computed(() => showFailovers.value ? 640 : 450)

// ── Routing rules (from rules.yaml) ──────────────────────────────────────────

const ROUTING_RULES = [
  { types: ['web_search', 'docs_update'],             cli: 'gemini',  model: 'gemini-2.5-flash' },
  { types: ['log_analysis', 'cross_repo_audit'],       cli: 'gemini',  model: 'gemini-2.5-pro' },
  { types: ['multimodal', 'image_analysis', 'screenshot'], cli: 'gemini', model: 'gemini-2.5-flash' },
  { types: ['ambiguous_requirements', 'complex_research'], cli: 'gemini', model: 'gemini-3-pro-preview' },
  { types: ['lint_fix', 'sonar_fix', 'commit_message', 'summarization'], cli: 'claude', model: 'claude-haiku-4-5' },
  { types: ['code_review', 'debug', 'multi_file_edit', 'complex_feature'], cli: 'claude', model: 'claude-sonnet-4-6' },
  { types: ['architecture', 'adr', 'strategic_planning', 'system_design'], cli: 'claude', model: 'claude-opus-4-7' },
  { types: ['shell_suggestion', 'shell_command'],      cli: 'copilot', model: 'suggest' },
  { types: ['inline_review', 'editor_review'],          cli: 'copilot', model: 'chat' },
  { types: ['create_pr', 'create_branch', 'github_flow'], cli: 'copilot', model: 'workspace' },
]

const FAILOVER_RULES = [
  { code: 'CONTEXT_LENGTH_EXCEEDED', action: 'redirect → gemini-2.5-pro' },
  { code: 'RATE_LIMIT_EXCEEDED',      action: 'backoff + retry (3x) → gemini' },
  { code: 'MODEL_OVERLOADED',         action: 'downgrade model chain' },
  { code: 'TIMEOUT',                  action: 'use_faster_model (30s)' },
  { code: 'GH_TOKEN_SCOPE',           action: 'abort + mensagem' },
  { code: 'MEMORY_WRITE_CONFLICT',    action: 'wait_for_ack (5s)' },
  { code: 'ALL_ENGINES_EXHAUSTED',    action: 'readonly_mode' },
]

// ── Tooltip rules for each node ───────────────────────────────────────────────

const TOOLTIP_DATA: Record<string, { title: string; lines: string[] }> = {
  input: {
    title: 'Input do Usuário',
    lines: ['Texto em linguagem natural enviado pelo usuário.', 'Passa direto para classifyTask().'],
  },
  classify: {
    title: 'classifyTask(task)',
    lines: [
      'Normaliza o texto para lowercase.',
      'Compara contra 30+ keywords.',
      'Retorna taskType (ex: code_review, web_search).',
      'Fallback: complex_feature.',
    ],
  },
  router: {
    title: 'Router',
    lines: [
      'Lookup taskType em routing_rules.',
      '11 regras configuradas via rules.yaml.',
      'Determina CLI + model + flags.',
      'Sem match → default_cli (claude-sonnet-4-6).',
    ],
  },
  claude: {
    title: 'Claude (EXECUTOR)',
    lines: [
      'claude-haiku → lint, commit, summarization',
      'claude-sonnet-4-6 → code_review, debug, feature',
      'claude-opus-4-7 → architecture, adr, system_design',
      'Flag: --dangerously-skip-permissions',
    ],
  },
  gemini: {
    title: 'Gemini (EXECUTOR)',
    lines: [
      'gemini-2.5-flash → web_search, docs, vision',
      'gemini-2.5-pro → log_analysis, cross_repo_audit',
      'gemini-3-pro-preview → complex_research',
      'Flag: --yolo',
    ],
  },
  copilot: {
    title: 'Copilot (CONSELHEIRO)',
    lines: [
      'Modo suggest → shell_suggestion',
      'Modo chat → inline_review, editor_review',
      'Modo workspace → create_pr, create_branch',
      'Requer confirmação do usuário.',
    ],
  },
  failover: {
    title: 'Failover?',
    lines: [
      'Verifica se houve erro na execução.',
      'CONTEXT_LENGTH → redirect gemini-2.5-pro',
      'RATE_LIMIT → backoff 5s, até 3 tentativas',
      'MODEL_OVERLOADED → downgrade model chain',
      'TIMEOUT → modelo mais rápido',
      'ALL_EXHAUSTED → modo leitura',
    ],
  },
  redirect: {
    title: 'Redirect',
    lines: [
      'Rerota para outro CLI ou modelo.',
      'Ex: claude overflow → gemini-2.5-pro',
      'Ex: opus overloaded → sonnet → haiku',
    ],
  },
  result: {
    title: 'Resultado Final',
    lines: [
      'Resposta entregue ao usuário.',
      'AdapterInvokeResult com content, latencyMs, tokens.',
      'Log registrado para Observabilidade.',
    ],
  },
}

// ── Tooltip state ─────────────────────────────────────────────────────────────

const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  title: '',
  lines: [] as string[],
})

const svgEl = ref<SVGSVGElement | null>(null)

function svgRelativePos(e: MouseEvent): { x: number; y: number } {
  const rect = (e.currentTarget as SVGElement).closest('svg')?.getBoundingClientRect()
    ?? (svgEl.value?.getBoundingClientRect() ?? { left: 0, top: 0 })
  return {
    x: e.clientX - (rect as DOMRect).left + 12,
    y: e.clientY - (rect as DOMRect).top - 10,
  }
}

function showTooltip(e: MouseEvent, nodeKey: string) {
  const data = TOOLTIP_DATA[nodeKey]
  if (!data) return
  const pos = svgRelativePos(e)
  tooltip.value = {
    visible: true,
    x: pos.x,
    y: pos.y,
    title: data.title,
    lines: data.lines,
  }
}

function moveTooltip(e: MouseEvent) {
  if (!tooltip.value.visible) return
  const pos = svgRelativePos(e)
  tooltip.value.x = pos.x
  tooltip.value.y = pos.y
}

function hideTooltip() {
  tooltip.value.visible = false
}
</script>

<style scoped>
.cc-app {
  background: var(--bg-base);
}

.cc-workflow-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-canvas);
  overflow: hidden;
}

/* ── Header ── */
.cc-workflow-header {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--s-4);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.cc-workflow-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.cc-header-actions {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  -webkit-app-region: no-drag;
}

/* ── Toggle ── */
.cc-toggle-label {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  cursor: pointer;
  user-select: none;
}

.cc-toggle-text {
  font-size: var(--fs-xs);
  color: var(--text-secondary);
}

.cc-toggle {
  position: relative;
  width: 32px;
  height: 18px;
  border-radius: var(--r-full);
  background: var(--bg-active);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  padding: 0;
  outline: none;
  flex-shrink: 0;
}

.cc-toggle--on {
  background: var(--accent-dim);
  border-color: var(--accent);
}

.cc-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: transform 0.2s, background 0.2s;
}

.cc-toggle--on .cc-toggle-thumb {
  transform: translateX(14px);
  background: var(--accent);
}

/* ── Body layout ── */
.cc-workflow-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Diagram ── */
.cc-diagram-wrap {
  flex: 1;
  position: relative;
  overflow: auto;
  padding: var(--s-4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.cc-svg {
  width: 100%;
  max-width: 780px;
  height: auto;
  flex-shrink: 0;
}

/* SVG text styles (must be global-ish, applied via class on text elements) */
.cc-node {
  cursor: default;
}

.cc-node:hover rect,
.cc-node:hover polygon {
  filter: brightness(1.15);
}

/* ── Tooltip ── */
.cc-tooltip {
  position: absolute;
  pointer-events: none;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-lg);
  padding: var(--s-3) var(--s-4);
  min-width: 220px;
  max-width: 280px;
  box-shadow: var(--shadow-md);
  z-index: 100;
}

.cc-tooltip-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--s-2);
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: var(--s-2);
}

.cc-tooltip-line {
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ── Sidebar ── */
.cc-sidebar {
  width: 260px;
  flex-shrink: 0;
  border-left: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  overflow-y: auto;
  padding: var(--s-4);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.cc-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.cc-sidebar-heading {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: var(--s-1);
}

.cc-rule-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--s-2) var(--s-3);
  background: var(--bg-elevated);
  border-radius: var(--r-sm);
  border: 1px solid var(--border-subtle);
}

.cc-rule-types {
  font-size: 10px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  line-height: 1.4;
  word-break: break-all;
}

.cc-rule-target {
  display: flex;
  align-items: center;
  gap: var(--s-1);
  margin-top: 2px;
}

.cc-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cc-rule-cli {
  font-size: var(--fs-xs);
  font-weight: 600;
}

.cc-rule-model {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  margin-left: auto;
  text-align: right;
}

.cc-sidebar-divider {
  height: 1px;
  background: var(--border-subtle);
}

.cc-failover-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--s-2) var(--s-3);
  background: var(--bg-elevated);
  border-radius: var(--r-sm);
  border: 1px solid var(--border-subtle);
}

.cc-failover-code {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--warning);
}

.cc-failover-action {
  font-size: 10px;
  color: var(--text-secondary);
}

/* ── SVG text utilities (applied as classes on SVG <text> elements) ── */
:deep(.cc-node-label) {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  fill: var(--text-primary);
}

:deep(.cc-node-label--accent) {
  fill: var(--accent);
}

:deep(.cc-node-label--claude) {
  fill: var(--cli-claude);
}

:deep(.cc-node-label--gemini) {
  fill: var(--cli-gemini);
}

:deep(.cc-node-label--copilot) {
  fill: var(--cli-copilot);
}

:deep(.cc-node-label--warn) {
  fill: var(--warning);
}

:deep(.cc-node-sublabel) {
  font-family: var(--font-mono);
  font-size: 10px;
  fill: var(--text-muted);
}

:deep(.cc-edge-label) {
  font-family: var(--font-mono);
  font-size: 10px;
  fill: var(--text-muted);
}

:deep(.cc-edge-label--warn) {
  fill: var(--warning);
}

:deep(.cc-edge-label--accent) {
  fill: var(--accent);
}

:deep(.cc-badge-text) {
  font-family: var(--font-sans);
  font-size: 8px;
  font-weight: 600;
  fill: var(--cli-copilot);
  letter-spacing: 0.04em;
}
</style>
