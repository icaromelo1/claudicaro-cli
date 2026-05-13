<template>
  <div class="cc-composer">
    <div class="cc-composer-box" :class="{ focused }">
      <textarea
        ref="textarea"
        v-model="value"
        class="cc-composer-input"
        placeholder="Mensagem..."
        :disabled="disabled"
        :rows="rows"
        @focus="focused = true"
        @blur="focused = false"
        @keydown.enter.exact.prevent="submit"
        @keydown.shift.enter.exact="newline"
        @input="adjustHeight"
      />
      <div class="cc-composer-footer">
        <span class="cc-composer-hint">
          <kbd>Enter</kbd> enviar · <kbd>Shift+Enter</kbd> nova linha
        </span>
        <q-btn
          flat
          round
          dense
          icon="send"
          :disabled="!value.trim() || disabled"
          class="cc-send-btn"
          @click="submit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ send: [content: string] }>()

const value = ref('')
const focused = ref(false)
const textarea = ref<HTMLTextAreaElement>()

const rows = computed(() => {
  const lineCount = (value.value.match(/\n/g) ?? []).length + 1
  return Math.min(Math.max(lineCount, 1), 8)
})

function submit() {
  if (!value.value.trim() || props.disabled) return
  emit('send', value.value.trim())
  value.value = ''
}

function newline() {
  value.value += '\n'
}

function adjustHeight() {
  // rows computed já cuida disso
}
</script>

<style scoped>
.cc-composer {
  padding: var(--s-3) var(--s-4) var(--s-4);
  background: var(--bg-canvas);
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.cc-composer-box {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  transition: border-color 0.15s, box-shadow 0.15s;
  overflow: hidden;
  max-width: 760px;
  margin: 0 auto;
}
.cc-composer-box.focused {
  border-color: var(--border-focus);
  box-shadow: var(--shadow-glow);
}
.cc-composer-input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  padding: var(--s-3) var(--s-4) 0;
  font-family: var(--font-sans);
  font-size: var(--fs-md);
  color: var(--text-primary);
  line-height: 1.55;
}
.cc-composer-input::placeholder { color: var(--text-faint); }
.cc-composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--s-1) var(--s-2) var(--s-2) var(--s-4);
}
.cc-composer-hint {
  font-size: var(--fs-xs);
  color: var(--text-faint);
}
.cc-composer-hint kbd {
  background: var(--vibrancy-strong);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0 4px;
  font-size: 10px;
  font-family: var(--font-sans);
}
.cc-send-btn { color: var(--accent) !important; }
</style>
