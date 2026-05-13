<template>
  <div class="cc-settings-page">
    <!-- Header -->
    <header class="cc-settings-header-bar">
      <span class="cc-settings-header-title">Configurações</span>
    </header>

    <div class="cc-settings-layout">
      <!-- Nav lateral -->
      <nav class="cc-settings-nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="cc-settings-nav-item"
          :class="{ active: activeNav === item.id }"
          @click="activeNav = item.id"
        >{{ item.label }}</button>
      </nav>

      <!-- Conteúdo -->
      <div class="cc-settings-content">
        <div class="cc-settings-body">

          <!-- ─── Seção 1: CLIs ──────────────────────────────────────────── -->
          <div v-show="activeNav === 'clis'" class="cc-section">
            <div class="cc-section-header">
              <span class="cc-section-label">CLIs</span>
            </div>

            <div class="cc-section-body">
              <div
                v-for="cliKey in cliKeys"
                :key="cliKey"
                class="cc-cli-block"
              >
                <div class="cc-cli-block-header">
                  <span class="cc-cli-dot" :style="{ background: `var(--cli-${cliKey})` }" />
                  <span class="cc-cli-block-name">{{ cliLabels[cliKey] }}</span>
                  <label class="cc-toggle">
                    <input type="checkbox" v-model="settings.clis[cliKey].enabled" />
                    <span class="cc-toggle-track" />
                  </label>
                </div>

                <div class="cc-cli-fields" :class="{ disabled: !settings.clis[cliKey].enabled }">
                  <div class="cc-field-row">
                    <label class="cc-field-label">Caminho do binário</label>
                    <input
                      class="cc-input"
                      type="text"
                      v-model="settings.clis[cliKey].binaryPath"
                      :placeholder="cliKey === 'copilot' ? 'gh' : cliKey"
                      :disabled="!settings.clis[cliKey].enabled"
                    />
                  </div>

                  <div v-if="modelsByCliMap[cliKey].length > 0" class="cc-field-row">
                    <label class="cc-field-label">Modelo padrão</label>
                    <select
                      class="cc-select"
                      v-model="settings.clis[cliKey].defaultModel"
                      :disabled="!settings.clis[cliKey].enabled"
                    >
                      <option
                        v-for="opt in modelsByCliMap[cliKey]"
                        :key="opt.value"
                        :value="opt.value"
                      >{{ opt.label }}</option>
                    </select>
                  </div>

                  <div class="cc-field-row cc-field-row--inline">
                    <label class="cc-field-label">Usar bypass por padrão</label>
                    <label class="cc-toggle">
                      <input
                        type="checkbox"
                        v-model="settings.clis[cliKey].defaultBypass"
                        :disabled="!settings.clis[cliKey].enabled"
                      />
                      <span class="cc-toggle-track" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ─── Seção 2: Token Budget ──────────────────────────────────── -->
          <div v-show="activeNav === 'tokens'" class="cc-section">
            <div class="cc-section-header">
              <span class="cc-section-label">Token Budget</span>
            </div>

            <div class="cc-section-body">
              <div class="cc-field-row">
                <label class="cc-field-label">
                  Budget padrão por sessão
                  <span class="cc-field-value-badge">{{ formatTokens(settings.tokenBudget) }}</span>
                </label>
                <div class="cc-slider-row">
                  <span class="cc-slider-min">1k</span>
                  <input
                    class="cc-slider"
                    type="range"
                    min="1000"
                    max="500000"
                    step="1000"
                    v-model.number="settings.tokenBudget"
                  />
                  <span class="cc-slider-max">500k</span>
                </div>
                <input
                  class="cc-input cc-input--number"
                  type="number"
                  min="1000"
                  max="500000"
                  step="1000"
                  v-model.number="settings.tokenBudget"
                />
              </div>
            </div>
          </div>

          <!-- ─── Seção 3: Orquestrador Padrão ──────────────────────────── -->
          <div v-show="activeNav === 'orchestrator'" class="cc-section">
            <div class="cc-section-header">
              <span class="cc-section-label">Orquestrador Padrão</span>
            </div>

            <div class="cc-section-body">

              <!-- CLI -->
              <div class="cc-field-row">
                <label class="cc-field-label">CLI</label>
                <div class="cc-cli-radio-group">
                  <label
                    v-for="cli in cliOptions"
                    :key="cli.id"
                    class="cc-cli-radio"
                    :class="{ selected: settings.defaultOrchestrator.cli === cli.id }"
                  >
                    <input
                      type="radio"
                      :value="cli.id"
                      v-model="settings.defaultOrchestrator.cli"
                      class="cc-radio-hidden"
                      @change="onOrchestratorCliChange(cli.id)"
                    />
                    <span class="cc-cli-dot" :style="{ background: `var(--cli-${cli.id})` }" />
                    <span class="cc-cli-radio-label">{{ cli.name }}</span>
                  </label>
                </div>
              </div>

              <!-- Modelo -->
              <div class="cc-field-row">
                <label class="cc-field-label">Modelo</label>
                <select class="cc-select" v-model="settings.defaultOrchestrator.model">
                  <option
                    v-for="opt in currentOrchestratorModels"
                    :key="opt.value"
                    :value="opt.value"
                  >{{ opt.label }}</option>
                </select>
              </div>

              <!-- Agente -->
              <div class="cc-field-row">
                <label class="cc-field-label">Agente</label>
                <select class="cc-select" v-model="settings.defaultOrchestrator.agentFile">
                  <option :value="null">Nenhum</option>
                  <optgroup label="Pessoal">
                    <option value="pessoal/.agent/claudicaro.md">claudicaro (padrão)</option>
                  </optgroup>
                  <optgroup label="DSG">
                    <option value="dsg/.agent/tech-lead.md">tech-lead</option>
                    <option value="dsg/.agent/especialista-deposito.md">especialista-deposito</option>
                    <option value="dsg/.agent/especialista-banco-de-dados.md">especialista-banco-de-dados</option>
                    <option value="dsg/.agent/especialista-cache.md">especialista-cache</option>
                    <option value="dsg/.agent/especialista-filas.md">especialista-filas</option>
                    <option value="dsg/.agent/especialista-frontend.md">especialista-frontend</option>
                    <option value="dsg/.agent/especialista-arquitetura.md">especialista-arquitetura</option>
                    <option value="dsg/.agent/especialista-grupos-permissoes.md">especialista-grupos-permissoes</option>
                    <option value="dsg/.agent/especialista-reserva-horario.md">especialista-reserva-horario</option>
                    <option value="dsg/.agent/especialista-luma.md">especialista-luma</option>
                    <option value="dsg/.agent/especialista-traceai.md">especialista-traceai</option>
                  </optgroup>
                  <optgroup label="CAST">
                    <option value="cast/.agent/tech-lead.md">tech-lead</option>
                    <option value="cast/.agent/especialista-sgsa.md">especialista-sgsa</option>
                    <option value="cast/.agent/especialista-contratos.md">especialista-contratos</option>
                    <option value="cast/.agent/especialista-sisdoc.md">especialista-sisdoc</option>
                  </optgroup>
                </select>
              </div>

              <!-- Modo de permissão -->
              <div class="cc-field-row">
                <label class="cc-field-label">Modo de permissão</label>
                <div class="cc-perm-radio-group">
                  <label
                    v-for="opt in permissionOptions"
                    :key="opt.value"
                    class="cc-perm-radio"
                    :class="{ selected: settings.defaultOrchestrator.permissionMode === opt.value }"
                  >
                    <input
                      type="radio"
                      :value="opt.value"
                      v-model="settings.defaultOrchestrator.permissionMode"
                      class="cc-radio-hidden"
                    />
                    <div class="cc-radio-dot" />
                    <div class="cc-perm-info">
                      <span class="cc-perm-label">{{ opt.label }}</span>
                      <span class="cc-perm-desc">{{ opt.desc }}</span>
                    </div>
                  </label>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="cc-settings-footer">
          <button class="cc-btn-reset" @click="resetDefaults">Restaurar padrões</button>
          <div class="cc-footer-right">
            <transition name="cc-fade">
              <span v-if="savedFeedback" class="cc-saved-badge">Salvo!</span>
            </transition>
            <transition name="cc-fade">
              <span v-if="saveError" class="cc-saved-badge cc-saved-badge--error">Erro ao salvar</span>
            </transition>
            <button class="cc-btn-save" @click="save">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { AppSettings } from 'src/types/claudicaro'

// ─── Default settings (mirror do electron-side) ───────────────────────────
const DEFAULT_SETTINGS: AppSettings = {
  clis: {
    claude: { enabled: true, binaryPath: 'claude', defaultModel: 'claude-sonnet-4-6', defaultBypass: true },
    gemini: { enabled: true, binaryPath: 'gemini', defaultModel: 'gemini-2.5-flash', defaultBypass: true },
    copilot: { enabled: true, binaryPath: 'gh', defaultModel: '', defaultBypass: false },
  },
  tokenBudget: 100000,
  defaultOrchestrator: {
    cli: 'claude',
    model: 'claude-sonnet-4-6',
    agentFile: null,
    permissionMode: 'bypass',
  },
}

// ─── Nav state ───────────────────────────────────────────────────────────
const activeNav = ref('clis')

const navItems = [
  { id: 'clis', label: 'CLIs' },
  { id: 'tokens', label: 'Token Budget' },
  { id: 'orchestrator', label: 'Orquestrador' },
]

// ─── State ────────────────────────────────────────────────────────────────
const settings = reactive<AppSettings>(structuredClone(DEFAULT_SETTINGS))
const savedFeedback = ref(false)
const saveError = ref(false)

// ─── Constants ───────────────────────────────────────────────────────────
const cliKeys = ['claude', 'gemini', 'copilot'] as const

const cliLabels: Record<string, string> = {
  claude: 'Claude',
  gemini: 'Gemini',
  copilot: 'Copilot',
}

const cliOptions = [
  { id: 'claude' as const, name: 'Claude' },
  { id: 'gemini' as const, name: 'Gemini' },
  { id: 'copilot' as const, name: 'Copilot' },
]

const modelsByCliMap: Record<string, { value: string; label: string }[]> = {
  claude: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite' },
  ],
  copilot: [],
}

const permissionOptions = [
  { value: 'bypass' as const, label: 'Bypass', desc: '--dangerously-skip-permissions' },
  { value: 'normal' as const, label: 'Normal', desc: 'Permissões padrão do Claude Code' },
  { value: 'ask' as const, label: 'Ask', desc: 'Pergunta antes de cada ação' },
]

const currentOrchestratorModels = computed(() =>
  modelsByCliMap[settings.defaultOrchestrator.cli] ?? []
)

// ─── Methods ─────────────────────────────────────────────────────────────
function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
  return String(n)
}

function onOrchestratorCliChange(cli: string) {
  const models = modelsByCliMap[cli]
  if (models && models.length > 0) {
    settings.defaultOrchestrator.model = models[0]!.value
  } else {
    settings.defaultOrchestrator.model = ''
  }
}

function applySettings(loaded: AppSettings) {
  Object.assign(settings.clis.claude, loaded.clis.claude)
  Object.assign(settings.clis.gemini, loaded.clis.gemini)
  Object.assign(settings.clis.copilot, loaded.clis.copilot)
  settings.tokenBudget = loaded.tokenBudget
  Object.assign(settings.defaultOrchestrator, loaded.defaultOrchestrator)
}

async function save() {
  saveError.value = false
  try {
    await window.claudicaro.settings.save({ ...settings } as AppSettings)
    savedFeedback.value = true
    setTimeout(() => { savedFeedback.value = false }, 2000)
  } catch {
    saveError.value = true
    setTimeout(() => { saveError.value = false }, 3000)
  }
}

function resetDefaults() {
  applySettings(structuredClone(DEFAULT_SETTINGS))
}

// ─── Load on mount ───────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const loaded = await window.claudicaro.settings.get()
    applySettings(loaded)
  } catch {
    // Keep defaults
  }
})
</script>

<style scoped>
/* ─── Page layout ─────────────────────────────────────────────────────── */
.cc-settings-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.cc-settings-header-bar {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-subtle);
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.cc-settings-header-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.cc-settings-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.cc-settings-nav {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-subtle);
  background: var(--bg-sidebar);
  padding: 12px 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cc-settings-nav-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.1s, color 0.1s;
}

.cc-settings-nav-item:hover {
  background: var(--bg-hover);
}

.cc-settings-nav-item.active {
  background: var(--vibrancy-strong);
  color: var(--text-primary);
  font-weight: 500;
}

.cc-settings-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cc-settings-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--s-5) var(--s-7);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

/* ─── Section ─────────────────────────────────────────────────────────── */
.cc-section {
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  overflow: hidden;
  background: var(--bg-surface);
}

.cc-section-header {
  width: 100%;
  display: flex;
  align-items: center;
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--border);
}

.cc-section-label {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text-primary);
}

.cc-section-body {
  padding: var(--s-5);
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

/* ─── CLI block ───────────────────────────────────────────────────────── */
.cc-cli-block {
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: var(--s-4);
  background: var(--bg-elevated);
}

.cc-cli-block-header {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin-bottom: var(--s-4);
}

.cc-cli-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cc-cli-block-name {
  flex: 1;
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text-primary);
}

.cc-cli-fields {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  transition: opacity 0.15s;
}

.cc-cli-fields.disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* ─── Fields ──────────────────────────────────────────────────────────── */
.cc-field-row {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.cc-field-row--inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.cc-field-label {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.cc-field-value-badge {
  font-size: var(--fs-xs);
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: var(--r-full);
  padding: 2px var(--s-2);
  font-weight: 600;
}

/* ─── Input / Select ──────────────────────────────────────────────────── */
.cc-input {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-primary);
  font-size: var(--fs-base);
  font-family: var(--font-sans);
  padding: var(--s-2) var(--s-3);
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}

.cc-input:focus {
  border-color: var(--border-focus);
}

.cc-input--number {
  width: 120px;
}

.cc-select {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-primary);
  font-size: var(--fs-base);
  font-family: var(--font-sans);
  padding: var(--s-2) var(--s-3);
  outline: none;
  cursor: pointer;
  width: 100%;
  transition: border-color 0.15s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6C73' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--s-3) center;
  padding-right: var(--s-7);
}

.cc-select:focus {
  border-color: var(--border-focus);
}

.cc-select option,
.cc-select optgroup {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

/* ─── Toggle switch ───────────────────────────────────────────────────── */
.cc-toggle {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
  cursor: pointer;
}

.cc-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.cc-toggle-track {
  position: absolute;
  inset: 0;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  transition: background 0.2s, border-color 0.2s;
}

.cc-toggle-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: transform 0.2s, background 0.2s;
}

.cc-toggle input:checked + .cc-toggle-track {
  background: var(--accent-dim);
  border-color: var(--accent);
}

.cc-toggle input:checked + .cc-toggle-track::after {
  transform: translateX(16px);
  background: var(--accent);
}

/* ─── Slider ──────────────────────────────────────────────────────────── */
.cc-slider-row {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.cc-slider-min,
.cc-slider-max {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.cc-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: var(--bg-hover);
  outline: none;
  cursor: pointer;
}

.cc-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: none;
}

/* ─── CLI radio group (orchestrator) ─────────────────────────────────── */
.cc-cli-radio-group {
  display: flex;
  gap: var(--s-2);
}

.cc-cli-radio {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  cursor: pointer;
  background: var(--bg-elevated);
  transition: border-color 0.15s, background 0.15s;
}

.cc-cli-radio:hover {
  background: var(--bg-hover);
}

.cc-cli-radio.selected {
  border-color: var(--accent);
  background: var(--accent-dim);
}

.cc-cli-radio-label {
  font-size: var(--fs-sm);
  color: var(--text-primary);
  font-weight: 500;
}

/* ─── Permission radio group ─────────────────────────────────────────── */
.cc-perm-radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.cc-perm-radio {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  cursor: pointer;
  background: var(--bg-elevated);
  transition: border-color 0.15s, background 0.15s;
}

.cc-perm-radio:hover {
  background: var(--bg-hover);
}

.cc-perm-radio.selected {
  border-color: var(--accent);
  background: var(--accent-dim);
}

.cc-radio-hidden {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.cc-radio-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s;
}

.cc-perm-radio.selected .cc-radio-dot {
  border-color: var(--accent);
  background: var(--accent);
}

.cc-perm-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cc-perm-label {
  font-size: var(--fs-base);
  font-weight: 500;
  color: var(--text-primary);
}

.cc-perm-desc {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

/* ─── Footer ──────────────────────────────────────────────────────────── */
.cc-settings-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--s-4) var(--s-7);
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
  flex-shrink: 0;
}

.cc-footer-right {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.cc-btn-reset {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  font-family: var(--font-sans);
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-sm);
  transition: color 0.12s, background 0.12s;
}

.cc-btn-reset:hover {
  color: var(--text-secondary);
  background: var(--bg-hover);
}

.cc-btn-save {
  background: var(--accent);
  color: var(--bg-base);
  border: none;
  cursor: pointer;
  font-size: var(--fs-sm);
  font-weight: 600;
  font-family: var(--font-sans);
  padding: var(--s-2) var(--s-5);
  border-radius: var(--r-sm);
  transition: background 0.12s;
}

.cc-btn-save:hover {
  background: var(--accent-hover);
}

.cc-saved-badge {
  font-size: var(--fs-sm);
  color: var(--accent);
  font-weight: 500;
}

.cc-saved-badge--error {
  color: var(--error);
}

/* ─── Transition ──────────────────────────────────────────────────────── */
.cc-fade-enter-active,
.cc-fade-leave-active {
  transition: opacity 0.3s;
}

.cc-fade-enter-from,
.cc-fade-leave-to {
  opacity: 0;
}
</style>
