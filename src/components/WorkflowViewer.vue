<template>
  <div class="wv-root" :class="{ 'wv-compact': compact }">
    <!-- Header -->
    <div class="wv-header">
      <span class="wv-title">Fluxo do Dispatcher</span>
      <div class="wv-header-actions">
        <label class="wv-toggle-label">
          <span class="wv-toggle-text">Mostrar failovers</span>
          <button
            class="wv-toggle"
            :class="{ 'wv-toggle--on': showFailovers }"
            :aria-checked="showFailovers"
            role="switch"
            @click="showFailovers = !showFailovers"
          >
            <span class="wv-toggle-thumb" />
          </button>
        </label>

        <button class="wv-btn" @click="toggleChat">
          {{ showChat ? 'Ocultar chat' : 'Mostrar chat' }}
        </button>

        <button class="wv-btn wv-btn--accent" @click="exportMermaid">
          Export Mermaid
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="wv-body">
      <!-- Left: SVG diagram -->
      <div class="wv-diagram-wrap">
        <svg
          ref="svgEl"
          class="wv-svg"
          :viewBox="`0 0 ${SVG_W} ${svgHeight}`"
          xmlns="http://www.w3.org/2000/svg"
          @mouseleave="hideTooltip"
        >
          <defs>
            <marker
              id="wv-arrow"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" :fill="COLORS.border_strong" />
            </marker>
            <marker
              id="wv-arrow-failover"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" :fill="COLORS.warning" fill-opacity="0.7" />
            </marker>
          </defs>

          <!-- Edges: Input → Classify -->
          <line
            :x1="rx(NODES.input)" :y1="my(NODES.input)"
            :x2="lx(NODES.classify)" :y2="my(NODES.classify)"
            stroke="var(--border-strong)" stroke-width="1.5"
            marker-end="url(#wv-arrow)"
          />

          <!-- Classify → Router (ponta esquerda do diamante) -->
          <line
            :x1="rx(NODES.classify)" :y1="my(NODES.classify)"
            :x2="NODES.router.x - DIAMOND_W / 2" :y2="NODES.router.y"
            stroke="var(--border-strong)" stroke-width="1.5"
            marker-end="url(#wv-arrow)"
          />

          <!-- Router → CLIs -->
          <path
            :d="routerToCli(NODES.router, NODES.claude)"
            stroke="var(--cli-claude)" stroke-width="1.5" fill="none"
            marker-end="url(#wv-arrow)"
          />
          <path
            :d="routerToCli(NODES.router, NODES.gemini)"
            stroke="var(--cli-gemini)" stroke-width="1.5" fill="none"
            marker-end="url(#wv-arrow)"
          />
          <path
            :d="routerToCli(NODES.router, NODES.copilot)"
            stroke="var(--cli-copilot)" stroke-width="1.5" fill="none"
            marker-end="url(#wv-arrow)"
          />

          <!-- Edge labels (router → cli) -->
          <text :x="NODES.claude.x + NODE_W / 2" :y="NODES.claude.y - 6" class="wv-edge-label" text-anchor="middle">code_review, debug</text>
          <text :x="NODES.gemini.x + NODE_W / 2" :y="NODES.gemini.y - 6" class="wv-edge-label" text-anchor="middle">web_search, vision</text>
          <text :x="NODES.copilot.x + NODE_W / 2" :y="NODES.copilot.y - 6" class="wv-edge-label" text-anchor="middle">shell, create_pr</text>

          <!-- Normal: CLIs → Result -->
          <template v-if="!showFailovers">
            <path :d="cliToResult(NODES.claude, NODES.result)" stroke="var(--border-strong)" stroke-width="1.5" fill="none" marker-end="url(#wv-arrow)" />
            <path :d="cliToResult(NODES.gemini, NODES.result)" stroke="var(--border-strong)" stroke-width="1.5" fill="none" marker-end="url(#wv-arrow)" />
            <path :d="cliToResult(NODES.copilot, NODES.result)" stroke="var(--border-strong)" stroke-width="1.5" fill="none" marker-end="url(#wv-arrow)" />
          </template>

          <!-- Failover paths -->
          <template v-if="showFailovers">
            <path :d="cliToResult(NODES.claude, NODES.failover)" stroke="var(--border-strong)" stroke-width="1.5" fill="none" marker-end="url(#wv-arrow)" />
            <path :d="cliToResult(NODES.gemini, NODES.failover)" stroke="var(--border-strong)" stroke-width="1.5" fill="none" marker-end="url(#wv-arrow)" />
            <path :d="cliToResult(NODES.copilot, NODES.failover)" stroke="var(--border-strong)" stroke-width="1.5" fill="none" marker-end="url(#wv-arrow)" />

            <!-- Failover → Redirect (Sim) -->
            <line
              :x1="NODES.failover.x - DIAMOND_W / 2"
              :y1="NODES.failover.y"
              :x2="NODES.redirect.x + NODE_W"
              :y2="NODES.redirect.y + NODE_H / 2"
              stroke="var(--warning)" stroke-width="1.5" stroke-opacity="0.7"
              stroke-dasharray="5,3"
              marker-end="url(#wv-arrow-failover)"
            />
            <text
              :x="NODES.failover.x - DIAMOND_W / 2 - 4"
              :y="NODES.failover.y + 14"
              class="wv-edge-label wv-edge-label--warn"
              text-anchor="end"
            >Sim</text>

            <!-- Failover → Result (Não) -->
            <line
              :x1="NODES.failover.x + DIAMOND_W / 2"
              :y1="NODES.failover.y"
              :x2="NODES.result.x"
              :y2="NODES.result.y + NODE_H / 2"
              stroke="var(--accent)" stroke-width="1.5"
              marker-end="url(#wv-arrow)"
            />
            <text
              :x="NODES.failover.x + DIAMOND_W / 2 + 4"
              :y="NODES.failover.y + 14"
              class="wv-edge-label wv-edge-label--accent"
            >Não</text>
          </template>

          <!-- Node: Input -->
          <g
            class="wv-node"
            :class="{ 'wv-node--selected': selectedNode === 'input' }"
            @click="selectNode('input')"
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
            <text :x="cx(NODES.input)" :y="my(NODES.input)" class="wv-node-label" text-anchor="middle" dominant-baseline="middle">
              Input do Usuário
            </text>
          </g>

          <!-- Node: classifyTask -->
          <g
            class="wv-node"
            :class="{ 'wv-node--selected': selectedNode === 'classify' }"
            @click="selectNode('classify')"
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
            <text :x="cx(NODES.classify)" :y="my(NODES.classify) - 5" class="wv-node-label wv-node-label--accent" text-anchor="middle" dominant-baseline="middle">
              classifyTask()
            </text>
            <text :x="cx(NODES.classify)" :y="my(NODES.classify) + 10" class="wv-node-sublabel" text-anchor="middle" dominant-baseline="middle">
              → taskType
            </text>
          </g>

          <!-- Node: Router diamond -->
          <g
            class="wv-node"
            :class="{ 'wv-node--selected': selectedNode === 'router' }"
            @click="selectNode('router')"
            @mouseenter="e => showTooltip(e, 'router')"
            @mousemove="e => moveTooltip(e)"
          >
            <polygon
              :points="diamondPoints(NODES.router)"
              fill="var(--bg-elevated)"
              :stroke="COLORS.border_strong"
              stroke-width="1.5"
            />
            <text :x="NODES.router.x" :y="NODES.router.y" class="wv-node-label" text-anchor="middle" dominant-baseline="middle">
              Router
            </text>
          </g>

          <!-- Node: Claude -->
          <g
            class="wv-node"
            :class="{ 'wv-node--selected': selectedNode === 'claude', 'wv-node--active': isActiveCli('claude') }"
            @click="selectNode('claude')"
            @mouseenter="e => showTooltip(e, 'claude')"
            @mousemove="e => moveTooltip(e)"
          >
            <rect
              :x="NODES.claude.x" :y="NODES.claude.y"
              :width="NODE_W" :height="NODE_H"
              rx="8"
              :fill="isActiveCli('claude') ? 'rgba(217,119,87,0.22)' : 'rgba(217,119,87,0.12)'"
              stroke="var(--cli-claude)"
              :stroke-width="isActiveCli('claude') ? 2.5 : 1.5"
              :class="{ 'wv-pulse': isActiveCli('claude') }"
            />
            <circle
              :cx="NODES.claude.x + 14"
              :cy="NODES.claude.y + NODE_H / 2"
              r="4"
              fill="var(--cli-claude)"
            />
            <text :x="NODES.claude.x + 26" :y="my(NODES.claude)" class="wv-node-label wv-node-label--claude" dominant-baseline="middle">
              Claude
            </text>
            <text :x="NODES.claude.x + 26" :y="my(NODES.claude) + 13" class="wv-node-sublabel" dominant-baseline="middle">
              EXECUTOR
            </text>
          </g>

          <!-- Node: Gemini -->
          <g
            class="wv-node"
            :class="{ 'wv-node--selected': selectedNode === 'gemini', 'wv-node--active': isActiveCli('gemini') }"
            @click="selectNode('gemini')"
            @mouseenter="e => showTooltip(e, 'gemini')"
            @mousemove="e => moveTooltip(e)"
          >
            <rect
              :x="NODES.gemini.x" :y="NODES.gemini.y"
              :width="NODE_W" :height="NODE_H"
              rx="8"
              :fill="isActiveCli('gemini') ? 'rgba(81,135,242,0.22)' : 'rgba(81,135,242,0.12)'"
              stroke="var(--cli-gemini)"
              :stroke-width="isActiveCli('gemini') ? 2.5 : 1.5"
              :class="{ 'wv-pulse': isActiveCli('gemini') }"
            />
            <circle
              :cx="NODES.gemini.x + 14"
              :cy="NODES.gemini.y + NODE_H / 2"
              r="4"
              fill="var(--cli-gemini)"
            />
            <text :x="NODES.gemini.x + 26" :y="my(NODES.gemini)" class="wv-node-label wv-node-label--gemini" dominant-baseline="middle">
              Gemini
            </text>
            <text :x="NODES.gemini.x + 26" :y="my(NODES.gemini) + 13" class="wv-node-sublabel" dominant-baseline="middle">
              EXECUTOR
            </text>
          </g>

          <!-- Node: Copilot -->
          <g
            class="wv-node"
            :class="{ 'wv-node--selected': selectedNode === 'copilot', 'wv-node--active': isActiveCli('copilot') }"
            @click="selectNode('copilot')"
            @mouseenter="e => showTooltip(e, 'copilot')"
            @mousemove="e => moveTooltip(e)"
          >
            <rect
              :x="NODES.copilot.x" :y="NODES.copilot.y"
              :width="NODE_W" :height="NODE_H"
              rx="8"
              :fill="isActiveCli('copilot') ? 'rgba(181,192,204,0.22)' : 'rgba(181,192,204,0.12)'"
              stroke="var(--cli-copilot)"
              :stroke-width="isActiveCli('copilot') ? 2.5 : 1.5"
              :class="{ 'wv-pulse': isActiveCli('copilot') }"
            />
            <circle
              :cx="NODES.copilot.x + 14"
              :cy="NODES.copilot.y + NODE_H / 2"
              r="4"
              fill="var(--cli-copilot)"
            />
            <text :x="NODES.copilot.x + 26" :y="my(NODES.copilot) - 5" class="wv-node-label wv-node-label--copilot" dominant-baseline="middle">
              Copilot
            </text>
            <text :x="NODES.copilot.x + 26" :y="my(NODES.copilot) + 9" class="wv-node-sublabel" dominant-baseline="middle">
              CONSELHEIRO
            </text>
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
              class="wv-badge-text"
              text-anchor="middle"
              dominant-baseline="middle"
            >CONSELHEIRO</text>
          </g>

          <!-- Failover diamond (conditional) -->
          <template v-if="showFailovers">
            <g
              class="wv-node"
              :class="{ 'wv-node--selected': selectedNode === 'failover' }"
              @click="selectNode('failover')"
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
              <text :x="NODES.failover.x" :y="NODES.failover.y" class="wv-node-label wv-node-label--warn" text-anchor="middle" dominant-baseline="middle">
                Failover?
              </text>
            </g>

            <g
              class="wv-node"
              :class="{ 'wv-node--selected': selectedNode === 'redirect' }"
              @click="selectNode('redirect')"
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
              <text :x="cx(NODES.redirect)" :y="my(NODES.redirect)" class="wv-node-label wv-node-label--warn" text-anchor="middle" dominant-baseline="middle">
                Redirect
              </text>
              <text :x="cx(NODES.redirect)" :y="my(NODES.redirect) + 13" class="wv-node-sublabel" text-anchor="middle" dominant-baseline="middle">
                outro CLI / modelo
              </text>
            </g>
          </template>

          <!-- Node: Resultado Final -->
          <g
            class="wv-node"
            :class="{ 'wv-node--selected': selectedNode === 'result' }"
            @click="selectNode('result')"
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
            <text :x="cx(NODES.result)" :y="my(NODES.result)" class="wv-node-label wv-node-label--accent" text-anchor="middle" dominant-baseline="middle">
              Resultado Final
            </text>
          </g>
        </svg>

        <!-- Tooltip -->
        <div
          v-if="tooltip.visible"
          class="wv-tooltip"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <div class="wv-tooltip-title">{{ tooltip.title }}</div>
          <div v-for="(line, i) in tooltip.lines" :key="i" class="wv-tooltip-line">{{ line }}</div>
        </div>

        <!-- Node detail panel (click) -->
        <div v-if="detailNode" class="wv-detail">
          <div class="wv-detail-header">
            <span class="wv-detail-title">{{ TOOLTIP_DATA[detailNode]?.title }}</span>
            <button class="wv-detail-close" @click="selectedNode = null">✕</button>
          </div>
          <div v-for="(line, i) in TOOLTIP_DATA[detailNode]?.lines" :key="i" class="wv-detail-line">
            {{ line }}
          </div>
        </div>
      </div>

      <!-- Right: Chat sidebar -->
      <transition name="wv-slide">
        <div v-if="showChat" class="wv-chat">
          <div class="wv-chat-header">
            <span class="wv-chat-title">Chat rápido</span>
            <span v-if="!sessionId" class="wv-chat-placeholder-badge">sem sessão</span>
          </div>

          <template v-if="!sessionId">
            <div class="wv-chat-empty">
              Selecione uma sessão para ver o histórico e enviar mensagens.
            </div>
          </template>

          <template v-else>
            <div class="wv-chat-messages" ref="chatMessagesEl">
              <div v-if="chatMessages.length === 0" class="wv-chat-empty">
                Nenhuma mensagem ainda.
              </div>
              <div
                v-for="msg in chatMessages"
                :key="msg.id"
                class="wv-chat-msg"
                :class="msg.role === 'user' ? 'wv-chat-msg--user' : 'wv-chat-msg--assistant'"
              >
                <div class="wv-chat-msg-meta">
                  <span class="wv-chat-msg-role">{{ msg.role === 'user' ? 'Você' : 'Assistente' }}</span>
                  <span
                    v-if="msg.cli"
                    class="wv-chat-badge"
                    :style="{ background: cliBadgeBg(msg.cli), color: cliColor(msg.cli) }"
                  >{{ msg.cli }}</span>
                </div>
                <div class="wv-chat-msg-content">{{ msg.content }}</div>
              </div>
            </div>

            <div class="wv-chat-input-row">
              <input
                v-model="chatInput"
                class="wv-chat-input"
                placeholder="Digite uma mensagem..."
                :disabled="chatLoading"
                @keydown.enter.prevent="sendChatMessage"
              />
              <button
                class="wv-chat-send"
                :disabled="chatLoading || !chatInput.trim()"
                @click="sendChatMessage"
              >
                {{ chatLoading ? '…' : '→' }}
              </button>
            </div>
          </template>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { MessageRecord } from 'src/types/claudicaro'

// ── Props ────────────────────────────────────────────────────────────────────

const props = withDefaults(defineProps<{
  activeCli?: string
  sessionId?: string
  compact?: boolean
}>(), {
  activeCli: '',
  sessionId: '',
  compact: false,
})

// ── Quasar ───────────────────────────────────────────────────────────────────

const $q = useQuasar()

// ── Constants ────────────────────────────────────────────────────────────────

const SVG_W = 900
const SVG_H = 320
const NODE_W = 140
const NODE_H = 44
const DIAMOND_W = 80
const DIAMOND_H = 50

const COLORS = {
  border_strong: 'rgba(255,255,255,0.14)',
  warning: '#F5A524',
}

// ── Nodes (LR layout) ────────────────────────────────────────────────────────

const NODES = {
  input:    { x: 40,  y: SVG_H / 2 - NODE_H / 2 },
  classify: { x: 220, y: SVG_H / 2 - NODE_H / 2 },
  router:   { x: 400 + DIAMOND_W / 2, y: SVG_H / 2 },  // centro do diamante
  claude:   { x: 580, y: 40 },
  gemini:   { x: 580, y: SVG_H / 2 - NODE_H / 2 },
  copilot:  { x: 580, y: SVG_H - 40 - NODE_H },
  result:   { x: 760, y: SVG_H / 2 - NODE_H / 2 },
  // failover e redirect aparecem abaixo de claude quando showFailovers=true
  failover: { x: 400 + DIAMOND_W / 2, y: SVG_H + 60 },  // centro do diamante failover
  redirect: { x: 220, y: SVG_H + 40 },
}

// ── SVG helpers LR ───────────────────────────────────────────────────────────

function cx(n: { x: number }): number { return n.x + NODE_W / 2 }
function my(n: { y: number }): number { return n.y + NODE_H / 2 }
function rx(n: { x: number }): number { return n.x + NODE_W }
function lx(n: { x: number }): number { return n.x }

function diamondPoints(n: { x: number; y: number }): string {
  const { x, y } = n
  return `${x - DIAMOND_W / 2},${y} ${x},${y - DIAMOND_H / 2} ${x + DIAMOND_W / 2},${y} ${x},${y + DIAMOND_H / 2}`
}

function routerToCli(router: { x: number; y: number }, cli: { x: number; y: number }): string {
  const sx = router.x + DIAMOND_W / 2  // borda direita do diamante
  const sy = router.y
  const tx = cli.x
  const ty = cli.y + NODE_H / 2
  const midX = (sx + tx) / 2
  return `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`
}

function cliToResult(cli: { x: number; y: number }, target: { x: number; y: number }): string {
  const sx = cli.x + NODE_W
  const sy = cli.y + NODE_H / 2
  // Se target é o failover (diamante), aponta para a esquerda do diamante
  const isFailoverDiamond = target === NODES.failover
  const tx = isFailoverDiamond ? target.x - DIAMOND_W / 2 : target.x
  const ty = isFailoverDiamond ? target.y : target.y + NODE_H / 2
  const midX = (sx + tx) / 2
  return `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`
}

// ── svgHeight computed ───────────────────────────────────────────────────────

const svgHeight = computed(() => showFailovers.value ? SVG_H + 160 : SVG_H)

// ── Tooltip data ─────────────────────────────────────────────────────────────

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

// ── State ────────────────────────────────────────────────────────────────────

const showFailovers = ref(false)
const showChat = ref(false)
const svgEl = ref<SVGSVGElement | null>(null)
const selectedNode = ref<string | null>(null)

const detailNode = computed(() =>
  selectedNode.value && TOOLTIP_DATA[selectedNode.value] ? selectedNode.value : null
)

function isActiveCli(cli: string): boolean {
  return props.activeCli !== '' && props.activeCli === cli
}

function selectNode(key: string) {
  selectedNode.value = selectedNode.value === key ? null : key
}

function toggleChat() {
  showChat.value = !showChat.value
}

// ── Tooltip state ─────────────────────────────────────────────────────────────

const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  title: '',
  lines: [] as string[],
})

function svgRelativePos(e: MouseEvent): { x: number; y: number } {
  const rect =
    (e.currentTarget as SVGElement).closest('svg')?.getBoundingClientRect() ??
    svgEl.value?.getBoundingClientRect() ??
    { left: 0, top: 0 }
  return {
    x: e.clientX - (rect as DOMRect).left + 12,
    y: e.clientY - (rect as DOMRect).top - 10,
  }
}

function showTooltip(e: MouseEvent, nodeKey: string) {
  const data = TOOLTIP_DATA[nodeKey]
  if (!data) return
  const pos = svgRelativePos(e)
  tooltip.value = { visible: true, x: pos.x, y: pos.y, title: data.title, lines: data.lines }
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

// ── Export Mermaid ────────────────────────────────────────────────────────────

const MERMAID_DIAGRAM = `graph LR
  Input[Entrada do usuário] --> Classifier[Classificador de Task]
  Classifier --> Router[Router]
  Router --> Claude[Claude CLI]
  Router --> Gemini[Gemini CLI]
  Router --> Copilot[Copilot CLI]
  Claude -->|erro| Failover[Failover]
  Gemini -->|erro| Failover
  Failover --> Claude
  Failover --> Gemini
  Claude --> Output[Resposta]
  Gemini --> Output
  Copilot --> Output`

async function exportMermaid() {
  try {
    await navigator.clipboard.writeText(MERMAID_DIAGRAM)
    $q.notify({
      message: 'Diagrama Mermaid copiado!',
      color: 'positive',
      icon: 'check',
      timeout: 2000,
      position: 'top-right',
    })
  } catch {
    $q.notify({
      message: 'Falha ao copiar para o clipboard.',
      color: 'negative',
      timeout: 2000,
      position: 'top-right',
    })
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────

const chatMessages = ref<MessageRecord[]>([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatMessagesEl = ref<HTMLElement | null>(null)

function cliColor(cli: string): string {
  const map: Record<string, string> = {
    claude: '#D97757',
    gemini: '#5187F2',
    copilot: '#B5C0CC',
  }
  return map[cli] ?? 'var(--text-secondary)'
}

function cliBadgeBg(cli: string): string {
  const map: Record<string, string> = {
    claude: 'rgba(217,119,87,0.15)',
    gemini: 'rgba(81,135,242,0.15)',
    copilot: 'rgba(181,192,204,0.12)',
  }
  return map[cli] ?? 'var(--bg-elevated)'
}

async function loadChatHistory() {
  if (!props.sessionId) return
  try {
    const history = await window.claudicaro.session.history(props.sessionId)
    // last 5 messages
    chatMessages.value = history.slice(-5)
    await nextTick()
    chatMessagesEl.value?.scrollTo({ top: chatMessagesEl.value.scrollHeight, behavior: 'smooth' })
  } catch {
    // silently ignore
  }
}

async function sendChatMessage() {
  const content = chatInput.value.trim()
  if (!content || chatLoading.value || !props.sessionId) return

  chatInput.value = ''
  chatLoading.value = true

  const userMsg: MessageRecord = {
    id: Date.now().toString(),
    sessionId: props.sessionId,
    role: 'user',
    content,
    createdAt: new Date(),
  }
  chatMessages.value.push(userMsg)
  if (chatMessages.value.length > 5) chatMessages.value.shift()

  await nextTick()
  chatMessagesEl.value?.scrollTo({ top: chatMessagesEl.value.scrollHeight, behavior: 'smooth' })

  try {
    const result = await window.claudicaro.dispatch(content, props.sessionId)
    chatMessages.value.push({
      id: (Date.now() + 1).toString(),
      sessionId: props.sessionId,
      role: 'assistant',
      content: result.content,
      cli: result.cli,
      model: result.model,
      createdAt: new Date(),
    })
    if (chatMessages.value.length > 5) chatMessages.value.shift()
  } catch (err) {
    chatMessages.value.push({
      id: (Date.now() + 1).toString(),
      sessionId: props.sessionId,
      role: 'assistant',
      content: `Erro: ${(err as Error).message}`,
      cli: 'claude',
      createdAt: new Date(),
    })
    if (chatMessages.value.length > 5) chatMessages.value.shift()
  } finally {
    chatLoading.value = false
    await nextTick()
    chatMessagesEl.value?.scrollTo({ top: chatMessagesEl.value.scrollHeight, behavior: 'smooth' })
  }
}

onMounted(() => {
  if (props.sessionId) loadChatHistory()
})
</script>

<style scoped>
/* ── Root ── */
.wv-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-canvas);
  overflow: hidden;
}

/* ── Compact mode ── */
.wv-compact .wv-header { display: none; }
.wv-compact .wv-chat { display: none; }
.wv-compact { pointer-events: none; }

/* ── Header ── */
.wv-header {
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

.wv-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.wv-header-actions {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  -webkit-app-region: no-drag;
}

/* ── Toggle ── */
.wv-toggle-label {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  cursor: pointer;
  user-select: none;
}

.wv-toggle-text {
  font-size: var(--fs-xs);
  color: var(--text-secondary);
}

.wv-toggle {
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

.wv-toggle--on {
  background: var(--accent-dim);
  border-color: var(--accent);
}

.wv-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: transform 0.2s, background 0.2s;
}

.wv-toggle--on .wv-toggle-thumb {
  transform: translateX(14px);
  background: var(--accent);
}

/* ── Buttons ── */
.wv-btn {
  padding: 4px 10px;
  border-radius: var(--r-sm);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: var(--fs-xs);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.wv-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.wv-btn--accent {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
}

.wv-btn--accent:hover {
  background: rgba(63, 207, 142, 0.22);
}

/* ── Body ── */
.wv-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Diagram ── */
.wv-diagram-wrap {
  flex: 1;
  position: relative;
  overflow: auto;
  padding: var(--s-4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.wv-svg {
  width: 100%;
  max-width: 900px;
  height: auto;
  flex-shrink: 0;
}

/* ── SVG node classes ── */
.wv-node {
  cursor: pointer;
}

.wv-node:hover rect,
.wv-node:hover polygon {
  filter: brightness(1.15);
}

/* Active CLI pulse animation (applied on SVG rect) */
@keyframes wv-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.wv-pulse {
  animation: wv-pulse 2s ease-in-out infinite;
}

/* ── Tooltip ── */
.wv-tooltip {
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

.wv-tooltip-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--s-2);
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: var(--s-2);
}

.wv-tooltip-line {
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ── Node detail panel ── */
.wv-detail {
  position: absolute;
  bottom: var(--s-4);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-lg);
  padding: var(--s-3) var(--s-4);
  min-width: 280px;
  max-width: 360px;
  box-shadow: var(--shadow-lg);
  z-index: 50;
}

.wv-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--s-2);
  padding-bottom: var(--s-2);
  border-bottom: 1px solid var(--border-subtle);
}

.wv-detail-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.wv-detail-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--fs-sm);
  padding: 0;
  line-height: 1;
}

.wv-detail-close:hover {
  color: var(--text-primary);
}

.wv-detail-line {
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ── Chat sidebar ── */
.wv-chat {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wv-chat-header {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.wv-chat-title {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.wv-chat-placeholder-badge {
  font-size: 10px;
  color: var(--text-faint);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-full);
  padding: 1px 6px;
}

.wv-chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--s-4);
  font-size: var(--fs-xs);
  color: var(--text-muted);
  text-align: center;
  line-height: 1.6;
}

.wv-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--s-3) var(--s-3) 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.wv-chat-msg {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wv-chat-msg--user {
  align-items: flex-end;
}

.wv-chat-msg--assistant {
  align-items: flex-start;
}

.wv-chat-msg-meta {
  display: flex;
  align-items: center;
  gap: var(--s-1);
}

.wv-chat-msg-role {
  font-size: 10px;
  color: var(--text-muted);
}

.wv-chat-badge {
  font-size: 10px;
  font-weight: 600;
  border-radius: var(--r-full);
  padding: 1px 6px;
  border: 1px solid currentColor;
  opacity: 0.9;
}

.wv-chat-msg-content {
  font-size: var(--fs-xs);
  color: var(--text-primary);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  padding: var(--s-2) var(--s-3);
  max-width: 220px;
  word-break: break-word;
  line-height: 1.5;
}

.wv-chat-msg--user .wv-chat-msg-content {
  background: var(--accent-dim);
  border-color: rgba(63, 207, 142, 0.2);
}

.wv-chat-input-row {
  display: flex;
  gap: var(--s-1);
  padding: var(--s-3);
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.wv-chat-input {
  flex: 1;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 5px var(--s-2);
  font-size: var(--fs-xs);
  font-family: var(--font-sans);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
}

.wv-chat-input:focus {
  border-color: var(--border-focus);
}

.wv-chat-input::placeholder {
  color: var(--text-faint);
}

.wv-chat-send {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-sm);
  background: var(--accent-dim);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: var(--fs-sm);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.wv-chat-send:hover:not(:disabled) {
  background: rgba(63, 207, 142, 0.22);
}

.wv-chat-send:disabled {
  opacity: 0.4;
  cursor: default;
}

/* ── Slide transition ── */
.wv-slide-enter-active,
.wv-slide-leave-active {
  transition: width 0.22s ease, opacity 0.22s ease;
}

.wv-slide-enter-from,
.wv-slide-leave-to {
  width: 0;
  opacity: 0;
}

/* ── SVG text classes ── */
:deep(.wv-node-label) {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  fill: var(--text-primary);
}

:deep(.wv-node-label--accent)  { fill: var(--accent); }
:deep(.wv-node-label--claude)  { fill: var(--cli-claude); }
:deep(.wv-node-label--gemini)  { fill: var(--cli-gemini); }
:deep(.wv-node-label--copilot) { fill: var(--cli-copilot); }
:deep(.wv-node-label--warn)    { fill: var(--warning); }

:deep(.wv-node-sublabel) {
  font-family: var(--font-mono);
  font-size: 10px;
  fill: var(--text-muted);
}

:deep(.wv-edge-label) {
  font-family: var(--font-mono);
  font-size: 10px;
  fill: var(--text-muted);
}

:deep(.wv-edge-label--warn)   { fill: var(--warning); }
:deep(.wv-edge-label--accent) { fill: var(--accent); }

:deep(.wv-badge-text) {
  font-family: var(--font-sans);
  font-size: 8px;
  font-weight: 600;
  fill: var(--cli-copilot);
  letter-spacing: 0.04em;
}
</style>
