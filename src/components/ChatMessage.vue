<template>
  <div class="cc-message" :class="[`cc-message--${message.role}`, message.cli ? `cc-message--${message.cli}` : '']">
    <!-- Avatar / CLI badge -->
    <div class="cc-message-avatar">
      <span v-if="message.role === 'user'" class="cc-avatar-user">U</span>
      <span v-else class="cc-avatar-cli" :style="{ background: cliBadgeColor, color: '#fff' }">
        {{ cliLabel }}
      </span>
    </div>

    <div class="cc-message-body">
      <!-- Badge de roteamento -->
      <div v-if="message.cli && routingMeta" class="cc-routing-badge">
        <span class="cc-dot" :style="{ background: cliBadgeColor }" />
        <span>{{ message.cli }}</span>
        <span class="cc-routing-reason" v-if="routingMeta.reason">· {{ routingMeta.reason }}</span>
      </div>

      <!-- Conteúdo -->
      <div class="cc-message-content" v-html="renderedContent" />

      <!-- Meta: modelo + tokens -->
      <div class="cc-message-meta" v-if="message.model">
        <span>{{ message.model }}</span>
        <span v-if="message.tokens">· {{ message.tokens }} tokens</span>
        <span v-if="message.latencyMs">· {{ message.latencyMs }}ms</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  cli?: string
  model?: string
  routingMeta?: string
  tokens?: number
  latencyMs?: number
}

const props = defineProps<{ message: Message }>()

const cliColors: Record<string, string> = {
  claude: '#D97757',
  gemini: '#5187F2',
  copilot: '#B5C0CC',
}

const cliBadgeColor = computed(() =>
  props.message.cli ? cliColors[props.message.cli] ?? '#888' : '#888'
)

const cliLabel = computed(() => {
  const labels: Record<string, string> = { claude: 'C', gemini: 'G', copilot: 'P' }
  return props.message.cli ? labels[props.message.cli] ?? '?' : '?'
})

const routingMeta = computed(() => {
  if (!props.message.routingMeta) return null
  try { return JSON.parse(props.message.routingMeta) } catch { return null }
})

// Renderer simples — substitui blocos de código por <pre><code>
const renderedContent = computed(() => {
  return props.message.content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_: string, lang: string, code: string) =>
      `<pre class="cc-code-block"><code class="language-${lang ?? 'text'}">${escapeHtml(code.trim())}</code></pre>`
    )
    .replace(/`([^`]+)`/g, '<code class="cc-inline-code">$1</code>')
    .replace(/\n/g, '<br/>')
})

function escapeHtml(str: string) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
</script>

<style scoped>
.cc-message {
  display: flex;
  gap: var(--s-3);
  padding: var(--s-3) 0;
}
.cc-message-avatar {
  flex-shrink: 0;
  width: 28px;
  display: flex;
  justify-content: center;
  padding-top: 2px;
}
.cc-avatar-user,
.cc-avatar-cli {
  width: 22px;
  height: 22px;
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}
.cc-avatar-user {
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}
.cc-message-body { flex: 1; min-width: 0; }
.cc-routing-badge {
  display: flex;
  align-items: center;
  gap: var(--s-1);
  font-size: var(--fs-xs);
  color: var(--text-muted);
  margin-bottom: var(--s-1);
}
.cc-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  display: inline-block;
}
.cc-routing-reason { color: var(--text-faint); }
.cc-message-content {
  font-size: var(--fs-md);
  line-height: 1.65;
  color: var(--text-primary);
}
:deep(.cc-code-block) {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: var(--s-3) var(--s-4);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  margin: var(--s-2) 0;
}
:deep(.cc-inline-code) {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-xs);
  padding: 1px 5px;
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--accent);
}
.cc-message-meta {
  display: flex;
  gap: var(--s-2);
  font-size: var(--fs-xs);
  color: var(--text-faint);
  margin-top: var(--s-1);
}
</style>
