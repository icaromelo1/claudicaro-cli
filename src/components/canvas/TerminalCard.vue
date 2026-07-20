<template>
  <div class="cc-term-card" :style="{ left: card.x + 'px', top: card.y + 'px', width: card.width + 'px', height: card.height + 'px' }">
    <div class="cc-term-card-header" @mousedown="emit('drag-start', $event)">
      <span class="cc-term-cli-dot" :style="{ background: `var(--cli-${card.cli}, var(--text-muted))` }" />
      <span class="cc-term-title">{{ card.cli }}</span>
      <span v-if="!card.ptyAlive" class="cc-term-dead-badge">encerrado</span>
      <button class="cc-term-link-btn" title="Criar card filho a partir daqui" @click="emit('link-start')">+</button>
      <button class="cc-term-close-btn" title="Fechar" @click="emit('close')">×</button>
    </div>
    <div ref="termContainer" class="cc-term-body" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { CanvasCard } from 'src/types/icarus'

const props = defineProps<{ card: CanvasCard }>()
const emit = defineEmits<{
  'drag-start': [MouseEvent]
  'link-start': []
  close: []
}>()

const termContainer = ref<HTMLDivElement>()
let terminal: Terminal | undefined
let fitAddon: FitAddon | undefined
let unsubscribeData: (() => void) | undefined
let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  if (!termContainer.value) return

  terminal = new Terminal({
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    theme: {
      background: '#16161A',
      foreground: '#F2F2F5',
    },
  })
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.open(termContainer.value)
  fitAddon.fit()

  terminal.onData((data) => {
    void window.icarus.pty.write(props.card.id, data)
  })

  unsubscribeData = window.icarus.pty.onData((cardId, chunk) => {
    if (cardId === props.card.id) terminal?.write(chunk)
  })

  resizeObserver = new ResizeObserver(() => {
    fitAddon?.fit()
    if (terminal) void window.icarus.pty.resize(props.card.id, terminal.cols, terminal.rows)
  })
  resizeObserver.observe(termContainer.value)
})

watch(() => [props.card.width, props.card.height], () => {
  fitAddon?.fit()
})

onBeforeUnmount(() => {
  unsubscribeData?.()
  resizeObserver?.disconnect()
  terminal?.dispose()
})
</script>

<style scoped>
.cc-term-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.cc-term-card-header {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);
  cursor: grab;
  user-select: none;
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

.cc-term-dead-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--r-sm);
  background: var(--bg-hover);
  color: var(--text-faint);
}

.cc-term-link-btn,
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

.cc-term-link-btn:hover,
.cc-term-close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.cc-term-body {
  flex: 1;
  padding: var(--s-2);
  overflow: hidden;
}
</style>
