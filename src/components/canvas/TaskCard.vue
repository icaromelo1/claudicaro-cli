<template>
  <div class="cc-task-card" :style="{ left: card.x + 'px', top: card.y + 'px', width: card.width + 'px', height: card.height + 'px' }">
    <div class="cc-task-card-header">
      <span class="cc-term-cli-dot" :style="{ background: `var(--cli-${card.cli}, var(--text-muted))` }" />
      <span class="cc-term-title">{{ card.cli }} · tarefa</span>
      <span v-if="done" class="cc-task-done-badge">✓ concluído</span>
      <button class="cc-term-close-btn" title="Fechar" @click="emit('close')">×</button>
    </div>
    <div class="cc-task-body">{{ content }}<span v-if="!done" class="cc-task-cursor">▍</span></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { CanvasCard } from 'src/types/icarus'

const AUTO_CLOSE_DELAY_MS = 8000

const props = defineProps<{ card: CanvasCard }>()
const emit = defineEmits<{ close: [] }>()

const content = ref('')
const done = ref(false)

let unsubscribeToken: (() => void) | undefined
let unsubscribeDone: (() => void) | undefined
let autoCloseTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  unsubscribeToken = window.icarus.canvas.onTaskToken((cardId, chunk) => {
    if (cardId === props.card.id) content.value += chunk
  })
  unsubscribeDone = window.icarus.canvas.onTaskDone((cardId, finalContent) => {
    if (cardId !== props.card.id) return
    content.value = finalContent
    done.value = true
    autoCloseTimer = setTimeout(() => emit('close'), AUTO_CLOSE_DELAY_MS)
  })
})

onBeforeUnmount(() => {
  unsubscribeToken?.()
  unsubscribeDone?.()
  if (autoCloseTimer) clearTimeout(autoCloseTimer)
})
</script>

<style scoped>
.cc-task-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.cc-task-card-header {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);
}

.cc-term-cli-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cc-term-title {
  flex: 1;
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--text-primary);
  text-transform: capitalize;
}

.cc-task-done-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--r-sm);
  background: var(--accent-dim);
  color: var(--accent);
}

.cc-term-close-btn {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}

.cc-term-close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.cc-task-body {
  flex: 1;
  padding: var(--s-3);
  overflow-y: auto;
  font-size: var(--fs-sm);
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.cc-task-cursor {
  color: var(--accent);
  animation: cc-blink 1s step-start infinite;
}

@keyframes cc-blink {
  50% { opacity: 0; }
}
</style>
