<template>
  <div class="cc-loading">
    <div class="cc-loading-avatar">
      <span class="cc-avatar-cli" :style="{ background: cliColor }">
        {{ cliLabel }}
      </span>
    </div>
    <div class="cc-loading-dots">
      <span /><span /><span />
    </div>
    <span class="cc-loading-text">{{ cli }} processando...</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ cli?: string }>()

const cliColors: Record<string, string> = {
  claude: '#D97757', agy: '#5187F2', copilot: '#B5C0CC',
}
const cliLabels: Record<string, string> = {
  claude: 'C', agy: 'G', copilot: 'P',
}

const cliColor = computed(() => cliColors[props.cli ?? 'claude'] ?? '#888')
const cliLabel = computed(() => cliLabels[props.cli ?? 'claude'] ?? '?')
</script>

<style scoped>
.cc-loading {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) 0;
  color: var(--text-muted);
  font-size: var(--fs-sm);
}
.cc-loading-avatar .cc-avatar-cli {
  width: 22px;
  height: 22px;
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}
.cc-loading-dots {
  display: flex;
  gap: 3px;
  align-items: center;
}
.cc-loading-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-faint);
  animation: bounce 1.2s infinite ease-in-out;
}
.cc-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.cc-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
.cc-loading-text { color: var(--text-faint); }
</style>
