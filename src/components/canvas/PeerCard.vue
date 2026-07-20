<template>
  <div class="cc-peer-card" :style="{ left: card.x + 'px', top: card.y + 'px', width: card.width + 'px', height: card.height + 'px' }">
    <div class="cc-peer-card-header">
      <span class="cc-term-cli-dot" :style="{ background: `var(--cli-${card.cli}, var(--text-muted))` }" />
      <span class="cc-term-title">{{ label }}</span>
      <span class="cc-peer-round-badge">{{ turns.length }} turno(s)</span>
      <button class="cc-term-close-btn" title="Fechar" @click="emit('close')">×</button>
    </div>
    <div class="cc-peer-body">
      <div v-for="turn in turns" :key="turn.id" class="cc-peer-turn">
        <div class="cc-peer-turn-round">Rodada {{ turn.round }}</div>
        <div class="cc-peer-turn-content">{{ turn.content }}</div>
      </div>
      <div v-if="turns.length === 0" class="cc-peer-empty">Aguardando o primeiro turno…</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { CanvasCard, PeerTurn } from 'src/types/icarus'

const props = defineProps<{ card: CanvasCard; label: string }>()
const emit = defineEmits<{ close: [] }>()

const turns = ref<PeerTurn[]>([])
let unsubscribe: (() => void) | undefined

onMounted(async () => {
  turns.value = await window.claudicaro.canvas.listPeerTurns(props.card.id)
  unsubscribe = window.claudicaro.canvas.onPeerTurn((cardId, round, content) => {
    if (cardId !== props.card.id) return
    turns.value.push({ id: `live-${round}`, groupId: '', cardId, round, content, createdAt: new Date() })
  })
})

onBeforeUnmount(() => unsubscribe?.())
</script>

<style scoped>
.cc-peer-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.cc-peer-card-header {
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
}

.cc-peer-round-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--r-sm);
  background: var(--bg-hover);
  color: var(--text-faint);
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

.cc-peer-body {
  flex: 1;
  padding: var(--s-3);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.cc-peer-turn-round {
  font-size: 10px;
  color: var(--text-faint);
  margin-bottom: 2px;
}

.cc-peer-turn-content {
  font-size: var(--fs-sm);
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.cc-peer-empty {
  font-size: var(--fs-xs);
  color: var(--text-faint);
}
</style>
