<template>
  <div class="cc-composer">
    <div class="cc-composer-inner">
      <!-- Container principal -->
      <div class="cc-composer-box" :class="{ focused }">
        <!-- Textarea -->
        <textarea
          ref="textarea"
          v-model="value"
          class="cc-composer-textarea"
          :placeholder="disabled ? 'Aguarde a resposta...' : 'Mensagem…'"
          :disabled="disabled"
          :rows="rows"
          @focus="focused = true"
          @blur="focused = false"
          @keydown.enter.exact.prevent="submit"
          @keydown.shift.enter.exact="newline"
        />

        <!-- Toolbar inferior -->
        <div class="cc-composer-toolbar">
          <!-- Botões esquerda -->
          <div class="cc-toolbar-left">
            <button class="cc-tool-btn" title="Anexar arquivo" :disabled="disabled">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M13.5 7.5 7 14a4 4 0 0 1-5.7-5.6l6.5-6.5a2.5 2.5 0 0 1 3.5 3.5L5 11.9a1 1 0 0 1-1.4-1.4L9.5 5"/>
              </svg>
            </button>
            <button class="cc-tool-btn" title="Mencionar" :disabled="disabled">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8" cy="8" r="3"/>
                <path d="M11 5A5 5 0 1 0 12 9.5V8"/>
              </svg>
            </button>
            <button class="cc-tool-btn" title="Código" :disabled="disabled">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 4 1 8l4 4M11 4l4 4-4 4M9 2l-2 12"/>
              </svg>
            </button>
            <div class="cc-toolbar-sep" />
            <!-- Mode picker -->
            <div class="cc-mode-wrap">
              <button class="cc-mode-picker" @click="cycleMode" :disabled="disabled">
                <span class="cc-mode-dot" :style="{ background: modeColor }" />
                <span class="cc-mode-label">{{ modeLabel }}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                  <path d="M2 4l3 3 3-3"/>
                </svg>
              </button>
              <div v-if="showDropdown" class="cc-mode-dropdown">
                <button
                  v-for="m in MODES"
                  :key="m"
                  class="cc-mode-option"
                  :class="{ active: mode === m }"
                  @click="selectMode(m)"
                >
                  <span class="cc-mode-dot" :style="{ background: MODE_META[m].color }" />
                  {{ MODE_META[m].label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Send btn -->
          <button
            class="cc-send-btn"
            :disabled="!value.trim() || disabled"
            @click="submit"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 8h12M10 4l4 4-4 4"/>
            </svg>
            <kbd class="cc-send-kbd">↵</kbd>
          </button>
        </div>
      </div>

      <!-- Footer hint -->
      <div class="cc-composer-hint">
        <span>Roteamento automático ativo · markdown e código suportados</span>
        <div class="cc-hint-kbds">
          <kbd class="cc-kbd">↵</kbd>
          <span>enviar</span>
          <span class="cc-hint-sep">·</span>
          <kbd class="cc-kbd">⇧↵</kbd>
          <span>nova linha</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ send: [payload: { content: string; mode: string }] }>()

const value = ref('')
const focused = ref(false)
const textarea = ref<HTMLTextAreaElement>()

type Mode = 'auto' | 'claude' | 'gemini' | 'copilot'
const mode = ref<Mode>('auto')
const MODES: Mode[] = ['auto', 'claude', 'gemini', 'copilot']

const MODE_META: Record<Mode, { label: string; color: string }> = {
  auto: { label: 'Auto', color: 'var(--accent)' },
  claude: { label: 'Claude', color: '#D97757' },
  gemini: { label: 'Gemini', color: '#5187F2' },
  copilot: { label: 'Copilot', color: '#B5C0CC' },
}

const modeLabel = computed(() => MODE_META[mode.value].label)
const modeColor = computed(() => MODE_META[mode.value].color)

const showDropdown = ref(false)

function cycleMode() {
  showDropdown.value = !showDropdown.value
}

function selectMode(m: Mode) {
  mode.value = m
  showDropdown.value = false
}

const rows = computed(() => {
  const lineCount = (value.value.match(/\n/g) ?? []).length + 1
  return Math.min(Math.max(lineCount, 1), 8)
})

function submit() {
  if (!value.value.trim() || props.disabled) return
  emit('send', { content: value.value.trim(), mode: mode.value })
  value.value = ''
}

function newline() {
  value.value += '\n'
}
</script>

<style scoped>
.cc-composer {
  padding: 10px 24px 16px;
  background: var(--bg-base);
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.cc-composer-inner {
  max-width: 760px;
  margin: 0 auto;
}

.cc-composer-box {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px 8px;
  box-shadow: var(--shadow-md);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.cc-composer-box.focused {
  border-color: var(--border-focus);
  box-shadow: var(--shadow-glow);
}

.cc-composer-textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: var(--font-sans);
  font-size: 13.5px;
  color: var(--text-primary);
  line-height: 1.55;
  min-height: 38px;
  display: block;
}

.cc-composer-textarea::placeholder {
  color: var(--text-faint);
}

.cc-composer-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cc-composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  gap: 8px;
}

.cc-toolbar-left {
  display: flex;
  align-items: center;
  gap: 2px;
}

.cc-tool-btn {
  width: 28px;
  height: 26px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.cc-tool-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.cc-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cc-toolbar-sep {
  width: 1px;
  height: 14px;
  background: var(--border-subtle);
  margin: 0 4px;
}

.cc-mode-picker {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: var(--vibrancy-strong);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11.5px;
  color: var(--text-primary);
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
}

.cc-mode-picker:hover:not(:disabled) {
  background: var(--bg-hover);
}

.cc-mode-picker:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cc-mode-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cc-mode-label {
  font-weight: 500;
}

.cc-mode-wrap {
  position: relative;
}

.cc-mode-dropdown {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  box-shadow: var(--shadow-md);
  z-index: 100;
  min-width: 130px;
}

.cc-mode-option {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 5px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-family: inherit;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  transition: background 0.1s, color 0.1s;
}

.cc-mode-option:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.cc-mode-option.active {
  background: var(--accent-dim);
  color: var(--accent);
  font-weight: 500;
}

.cc-send-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: #0B0B0E;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
  flex-shrink: 0;
}

.cc-send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.cc-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cc-send-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
  font-family: inherit;
  border: none;
}

.cc-composer-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-faint);
  padding: 0 2px;
}

.cc-hint-kbds {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cc-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--vibrancy-strong);
  border: 1px solid var(--border);
  border-radius: 3px;
  font-family: inherit;
  line-height: 1;
}

.cc-hint-sep {
  color: var(--text-faint);
  margin: 0 2px;
}
</style>
