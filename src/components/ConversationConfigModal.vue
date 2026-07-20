<template>
  <q-dialog v-model="open" persistent class="cc-config-dialog">
    <q-card class="cc-config-card">
      <!-- Header -->
      <div class="cc-config-header">
        <span class="cc-config-title">Nova conversa</span>
        <span class="cc-config-subtitle">Configure o orquestrador antes de iniciar</span>
      </div>

      <!-- Stepper visual -->
      <div class="cc-stepper">
        <div
          v-for="(step, i) in steps"
          :key="step.key"
          class="cc-step"
          :class="{ active: currentStep === i, done: currentStep > i }"
          @click="currentStep > i && (currentStep = i)"
        >
          <div class="cc-step-dot">
            <span v-if="currentStep > i" class="cc-step-check">✓</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="cc-step-label">{{ step.label }}</span>
        </div>
      </div>

      <!-- Step content -->
      <div class="cc-config-body">

        <!-- Passo 1: CLI -->
        <div v-if="currentStep === 0" class="cc-step-content">
          <p class="cc-step-desc">Qual CLI você quer usar nessa conversa?</p>
          <div class="cc-cli-cards">
            <div
              v-for="cli in cliOptions"
              :key="cli.id"
              class="cc-cli-card"
              :class="{ selected: config.cli === cli.id }"
              @click="selectCli(cli.id)"
            >
              <div class="cc-cli-card-header">
                <span class="cc-cli-dot-badge" :style="{ background: `var(--cli-${cli.id})` }" />
                <span class="cc-cli-name">{{ cli.name }}</span>
              </div>
              <p class="cc-cli-desc">{{ cli.desc }}</p>
            </div>
          </div>
        </div>

        <!-- Passo 2: Modelo -->
        <div v-if="currentStep === 1" class="cc-step-content">
          <p class="cc-step-desc">Qual modelo/modo você quer usar?</p>
          <div class="cc-model-list">
            <label
              v-for="opt in currentModelOptions"
              :key="opt.value"
              class="cc-model-option"
              :class="{ selected: config.model === opt.value }"
            >
              <input
                type="radio"
                :value="opt.value"
                v-model="config.model"
                class="cc-radio-hidden"
              />
              <div class="cc-model-dot" />
              <div class="cc-model-info">
                <span class="cc-model-name">{{ opt.label }}</span>
                <span v-if="opt.desc" class="cc-model-desc">{{ opt.desc }}</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Passo 3: Agente -->
        <div v-if="currentStep === 2" class="cc-step-content">
          <p class="cc-step-desc">Qual agente deve ser carregado no contexto?</p>
          <div class="cc-agent-list">
            <div
              v-for="group in agentGroups"
              :key="group.label"
              class="cc-agent-group"
            >
              <span class="cc-agent-group-label">{{ group.label }}</span>
              <label
                v-for="agent in group.agents"
                :key="agent.value ?? 'none'"
                class="cc-agent-option"
                :class="{ selected: config.agentFile === agent.value }"
              >
                <input
                  type="radio"
                  :value="agent.value"
                  v-model="config.agentFile"
                  class="cc-radio-hidden"
                />
                <div class="cc-model-dot" />
                <span class="cc-model-name">{{ agent.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Passo 4: Permissão -->
        <div v-if="currentStep === 3" class="cc-step-content">
          <p class="cc-step-desc">Como o Claude deve lidar com permissões?</p>
          <div class="cc-model-list">
            <label
              v-for="opt in permissionOptions"
              :key="opt.value"
              class="cc-model-option"
              :class="{ selected: config.permissionMode === opt.value }"
            >
              <input
                type="radio"
                :value="opt.value"
                v-model="config.permissionMode"
                class="cc-radio-hidden"
              />
              <div class="cc-model-dot" />
              <div class="cc-model-info">
                <span class="cc-model-name">{{ opt.label }}</span>
                <span class="cc-model-desc">{{ opt.desc }}</span>
              </div>
            </label>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="cc-config-footer">
        <q-btn
          flat
          label="Usar padrões"
          class="cc-btn-defaults"
          @click="useDefaults"
        />
        <div class="cc-footer-nav">
          <q-btn
            v-if="currentStep > 0"
            flat
            label="Voltar"
            class="cc-btn-back"
            @click="currentStep--"
          />
          <q-btn
            v-if="currentStep < steps.length - 1"
            unelevated
            label="Próximo"
            class="cc-btn-next"
            @click="currentStep++"
          />
          <q-btn
            v-if="currentStep === steps.length - 1"
            unelevated
            label="Iniciar conversa"
            class="cc-btn-confirm"
            @click="confirm"
          />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OrchestratorConfig } from 'src/types/icarus'

const emit = defineEmits<{
  (e: 'confirm', config: OrchestratorConfig): void
  (e: 'cancel'): void
}>()

const open = ref(true)
const currentStep = ref(0)

const DEFAULT_CONFIG: OrchestratorConfig = {
  cli: 'claude',
  model: 'claude-sonnet-4-6',
  agentFile: 'pessoal/.agent/claudicaro.md',
  permissionMode: 'bypass',
}

const config = ref<OrchestratorConfig>({ ...DEFAULT_CONFIG })

const steps = [
  { key: 'cli', label: 'CLI' },
  { key: 'model', label: 'Modelo' },
  { key: 'agent', label: 'Agente' },
  { key: 'permission', label: 'Permissão' },
]

const cliOptions = [
  { id: 'claude' as const, name: 'Claude', desc: 'Code + MCP' },
  { id: 'agy' as const, name: 'Agy', desc: 'Search + Vision' },
  { id: 'copilot' as const, name: 'Copilot', desc: 'GitHub Native' },
]

const modelsByCliMap: Record<string, { value: string; label: string; desc?: string }[]> = {
  claude: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', desc: 'Rápido e eficiente' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', desc: 'Equilíbrio ideal (padrão)' },
    { value: 'claude-opus-4-7', label: 'Claude Opus 4.7', desc: 'Máxima capacidade' },
  ],
  agy: [
    { value: 'Gemini 3.5 Flash (Medium)', label: 'Gemini 3.5 Flash (Medium)', desc: 'Rápido e econômico' },
    { value: 'Gemini 3.1 Pro (High)', label: 'Gemini 3.1 Pro (High)', desc: 'Alta capacidade' },
    { value: 'GPT-OSS 120B (Medium)', label: 'GPT-OSS 120B (Medium)', desc: 'Próxima geração' },
    { value: 'Claude Sonnet 4.6 (Thinking)', label: 'Claude Sonnet 4.6 (Thinking)', desc: 'Raciocínio profundo' },
  ],
  copilot: [
    { value: 'suggest', label: 'Suggest', desc: 'Sugestões de código inline' },
    { value: 'chat', label: 'Chat', desc: 'Conversa com o Copilot' },
    { value: 'workspace', label: 'Workspace', desc: 'Contexto do projeto inteiro' },
  ],
}

const currentModelOptions = computed(() => modelsByCliMap[config.value.cli] ?? [])

const agentGroups = [
  {
    label: 'Pessoal',
    agents: [
      { value: null, label: 'Nenhum' },
      { value: 'pessoal/.agent/claudicaro.md', label: 'claudicaro (padrão)' },
    ],
  },
  {
    label: 'DSG',
    agents: [
      { value: 'dsg/.agent/tech-lead.md', label: 'tech-lead' },
      { value: 'dsg/.agent/especialista-deposito.md', label: 'especialista-deposito' },
      { value: 'dsg/.agent/especialista-banco-de-dados.md', label: 'especialista-banco-de-dados' },
      { value: 'dsg/.agent/especialista-cache.md', label: 'especialista-cache' },
      { value: 'dsg/.agent/especialista-filas.md', label: 'especialista-filas' },
      { value: 'dsg/.agent/especialista-frontend.md', label: 'especialista-frontend' },
      { value: 'dsg/.agent/especialista-arquitetura.md', label: 'especialista-arquitetura' },
      { value: 'dsg/.agent/especialista-grupos-permissoes.md', label: 'especialista-grupos-permissoes' },
      { value: 'dsg/.agent/especialista-reserva-horario.md', label: 'especialista-reserva-horario' },
      { value: 'dsg/.agent/especialista-luma.md', label: 'especialista-luma' },
      { value: 'dsg/.agent/especialista-traceai.md', label: 'especialista-traceai' },
    ],
  },
  {
    label: 'CAST',
    agents: [
      { value: 'cast/.agent/tech-lead.md', label: 'tech-lead' },
      { value: 'cast/.agent/especialista-sgsa.md', label: 'especialista-sgsa' },
      { value: 'cast/.agent/especialista-contratos.md', label: 'especialista-contratos' },
      { value: 'cast/.agent/especialista-sisdoc.md', label: 'especialista-sisdoc' },
    ],
  },
]

const permissionOptions = [
  {
    value: 'bypass' as const,
    label: 'Bypass',
    desc: '--dangerously-skip-permissions (padrão)',
  },
  {
    value: 'normal' as const,
    label: 'Normal',
    desc: 'Permissões padrão do Claude Code',
  },
  {
    value: 'ask' as const,
    label: 'Ask',
    desc: 'Pergunta antes de cada ação',
  },
]

// Ao trocar de CLI, redefine modelo para o primeiro da lista
watch(() => config.value.cli, (newCli) => {
  const opts = modelsByCliMap[newCli]
  if (opts && opts.length > 0) {
    config.value.model = opts[0]!.value
  }
})

function selectCli(cli: 'claude' | 'agy' | 'copilot') {
  config.value.cli = cli
  const opts = modelsByCliMap[cli]
  if (opts && opts.length > 0) {
    config.value.model = opts[0]!.value
  }
}

function useDefaults() {
  config.value = { ...DEFAULT_CONFIG }
  emit('confirm', { ...DEFAULT_CONFIG })
}

function confirm() {
  emit('confirm', { ...config.value })
}
</script>

<style scoped>
.cc-config-card {
  width: 520px;
  max-width: 95vw;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.cc-config-header {
  padding: var(--s-5) var(--s-6) var(--s-4);
  border-bottom: 1px solid var(--border);
}

.cc-config-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--s-1);
}

.cc-config-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}

/* Stepper */
.cc-stepper {
  display: flex;
  align-items: center;
  gap: 0;
  padding: var(--s-4) var(--s-6);
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}

.cc-step {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  flex: 1;
  position: relative;
}

.cc-step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: calc(50% + 10px);
  right: calc(-50% + 10px);
  top: 50%;
  height: 1px;
  background: var(--border);
}

.cc-step.done:not(:last-child)::after {
  background: var(--accent);
  opacity: 0.4;
}

.cc-step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-elevated);
  flex-shrink: 0;
  z-index: 1;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.cc-step.active .cc-step-dot {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--bg-elevated);
}

.cc-step.done .cc-step-dot {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--bg-base);
}

.cc-step-check {
  font-size: 12px;
  font-weight: 700;
}

.cc-step-label {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.cc-step.active .cc-step-label {
  color: var(--text-primary);
  font-weight: 500;
}

.cc-step.done .cc-step-label {
  color: var(--text-secondary);
}

.cc-step.done {
  cursor: pointer;
}

/* Body */
.cc-config-body {
  padding: var(--s-5) var(--s-6);
  min-height: 240px;
}

.cc-step-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 var(--s-4);
}

/* CLI Cards */
.cc-cli-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s-3);
}

.cc-cli-card {
  border: 1.5px solid var(--border);
  border-radius: var(--r-lg);
  padding: var(--s-3) var(--s-4);
  cursor: pointer;
  background: var(--bg-surface);
  transition: border-color 0.15s, background 0.15s;
}

.cc-cli-card:hover {
  background: var(--bg-hover);
}

.cc-cli-card.selected {
  border-color: var(--accent);
  background: rgba(63, 207, 142, 0.06);
}

.cc-cli-card-header {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin-bottom: var(--s-1);
}

.cc-cli-dot-badge {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cc-cli-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.cc-cli-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

/* Model list */
.cc-model-list {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.cc-model-option {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  border: 1.5px solid var(--border);
  border-radius: var(--r-lg);
  cursor: pointer;
  background: var(--bg-surface);
  transition: border-color 0.15s, background 0.15s;
}

.cc-model-option:hover {
  background: var(--bg-hover);
}

.cc-model-option.selected {
  border-color: var(--accent);
  background: rgba(63, 207, 142, 0.06);
}

.cc-radio-hidden {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.cc-model-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s;
}

.cc-model-option.selected .cc-model-dot {
  border-color: var(--accent);
  background: var(--accent);
}

.cc-model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cc-model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.cc-model-desc {
  font-size: 12px;
  color: var(--text-muted);
}

/* Agent list */
.cc-agent-list {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  max-height: 280px;
  overflow-y: auto;
  padding-right: var(--s-1);
}

.cc-agent-list::-webkit-scrollbar {
  width: 4px;
}

.cc-agent-list::-webkit-scrollbar-track {
  background: transparent;
}

.cc-agent-list::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.cc-agent-group {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}

.cc-agent-group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0 var(--s-1);
}

.cc-agent-option {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-2) var(--s-3);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
}

.cc-agent-option:hover {
  background: var(--bg-hover);
}

.cc-agent-option.selected {
  background: rgba(63, 207, 142, 0.08);
}

.cc-agent-option.selected .cc-model-dot {
  border-color: var(--accent);
  background: var(--accent);
}

/* Footer */
.cc-config-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--s-4) var(--s-6);
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
}

.cc-footer-nav {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.cc-btn-defaults {
  font-size: 13px;
  color: var(--text-muted) !important;
  padding: 0 var(--s-2);
}

.cc-btn-defaults:hover {
  color: var(--text-secondary) !important;
}

.cc-btn-back {
  font-size: 13px;
  color: var(--text-secondary) !important;
  padding: 0 var(--s-3);
}

.cc-btn-next {
  font-size: 13px;
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
  border-radius: 6px;
  padding: 0 var(--s-4);
}

.cc-btn-confirm {
  font-size: 13px;
  background: var(--accent) !important;
  color: var(--bg-base) !important;
  font-weight: 600;
  border-radius: 6px;
  padding: 0 var(--s-4);
}
</style>
