<template>
  <div class="cc-message" :class="`cc-message--${message.role}`">
    <!-- Avatar -->
    <div class="cc-message-avatar-wrap">
      <div class="cc-avatar" :class="message.role === 'user' ? 'cc-avatar--user' : `cc-avatar--${message.cli}`">
        <svg v-if="message.role === 'assistant' && message.cli" class="cc-avatar-glyph" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" v-html="cliGlyph" />
        <span v-else class="cc-avatar-initial">{{ message.role === 'user' ? 'V' : cliInitial }}</span>
      </div>
    </div>

    <div class="cc-message-body">
      <!-- Header line -->
      <div class="cc-message-header">
        <span class="cc-message-name">{{ message.role === 'user' ? 'Você' : cliMeta.name }}</span>
        <span v-if="message.role === 'assistant' && message.cli" class="cc-cli-pill" :style="cliPillStyle">
          <span class="cc-pill-dot" :style="{ background: cliMeta.color }" />
          {{ cliMeta.name.toUpperCase() }}
        </span>
        <span class="cc-message-time">{{ formatTime(message.createdAt) }}</span>
        <span v-if="routingMeta?.reason" class="cc-message-meta-reason">· {{ routingMeta.reason }}</span>
        <span v-if="message.tokens" class="cc-message-tokens">{{ message.tokens }} tok</span>
      </div>

      <!-- Content -->
      <div class="cc-message-content" v-html="renderedContent" />
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
  createdAt?: Date | string
}

const props = defineProps<{ message: Message }>()

const CLI_META: Record<string, { name: string; color: string; bg: string }> = {
  claude: { name: 'Claude', color: '#D97757', bg: 'rgba(217,119,87,0.12)' },
  gemini: { name: 'Gemini', color: '#5187F2', bg: 'rgba(81,135,242,0.12)' },
  copilot: { name: 'Copilot', color: '#B5C0CC', bg: 'rgba(181,192,204,0.12)' },
}

const CLI_GLYPHS: Record<string, string> = {
  claude: `<path fill="currentColor" d="M4.709 15.955l4.72-2.647.079-.23-.079-.128h-.23l-.792-.049-2.703-.073-2.344-.097-2.27-.122-.572-.121L0 11.784l.055-.352.481-.322.689.06 1.523.103 2.284.158 1.658.097 2.455.255h.39l.055-.158-.134-.097-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.907 1.476 2.491 1.833.365.304.146-.103.018-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.42 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.243.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76.564-.34 2.205-1.064 1.353-.881 1.142-1.264 1.7-.79 1.359.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.85-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.139.079-.673 7.244-.315.37-.728.279-.607-.462-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.087-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"/>`,
  gemini: `<path fill="currentColor" d="M12 24A14.304 14.304 0 0 0 0 12 14.304 14.304 0 0 0 12 0a14.305 14.305 0 0 0 12 12 14.305 14.305 0 0 0-12 12"/>`,
  copilot: `<path fill="currentColor" d="M11.999 2.05c-1.97 0-3.62.55-4.61 2.04-.5.75-.79 1.7-.96 2.78a8.99 8.99 0 0 0-1.55-.13c-.85 0-1.55.18-2.06.65-.5.46-.71 1.09-.81 1.71-.18 1.17-.02 2.44.13 3.43.02.16.05.31.07.46-.49.74-.78 1.61-.78 2.55v.69c0 1.94.95 3.5 2.55 4.55 1.57 1.04 3.74 1.58 6.04 1.78 1.99.18 4 .18 5.99 0 2.3-.2 4.47-.74 6.04-1.78 1.6-1.05 2.55-2.61 2.55-4.55v-.69c0-.94-.29-1.81-.78-2.55.02-.15.05-.3.07-.46.15-.99.31-2.26.13-3.43-.1-.62-.31-1.25-.81-1.71-.51-.47-1.21-.65-2.06-.65-.5 0-1.03.05-1.55.13-.17-1.08-.46-2.03-.96-2.78-.99-1.49-2.64-2.04-4.61-2.04Zm0 1.9c1.69 0 2.55.45 3.03 1.17.38.58.62 1.45.75 2.66-.7.27-1.35.6-1.86 1-.42.32-.92.5-1.92.5s-1.5-.18-1.92-.5c-.51-.4-1.16-.73-1.86-1 .13-1.21.37-2.08.75-2.66.48-.72 1.34-1.17 3.03-1.17Zm-7.05 4.59c.32 0 .69.03 1.06.09a8.6 8.6 0 0 0-.12 1.42c0 .89.09 1.74.27 2.51-.45-.13-.91-.36-1.3-.7-.39-.34-.66-.78-.78-1.36-.13-.62-.04-1.21.09-1.65.16-.21.4-.31.78-.31Zm14.1 0c.38 0 .62.1.78.31.13.44.22 1.03.09 1.65-.12.58-.39 1.02-.78 1.36-.39.34-.85.57-1.3.7.18-.77.27-1.62.27-2.51 0-.49-.04-.97-.12-1.42.37-.06.74-.09 1.06-.09ZM8.5 13c.83 0 1.5.84 1.5 1.88s-.67 1.87-1.5 1.87S7 15.92 7 14.88 7.67 13 8.5 13Zm7 0c.83 0 1.5.84 1.5 1.88s-.67 1.87-1.5 1.87-1.5-.83-1.5-1.87S14.67 13 15.5 13Z"/>`,
}

const cliMeta = computed(() => {
  const cli = props.message.cli ?? 'claude'
  return CLI_META[cli] ?? { name: cli, color: '#888', bg: 'rgba(136,136,136,0.12)' }
})

const cliGlyph = computed(() => CLI_GLYPHS[props.message.cli ?? ''] ?? '')

const cliInitial = computed(() => {
  const labels: Record<string, string> = { claude: 'C', gemini: 'G', copilot: 'P' }
  return labels[props.message.cli ?? ''] ?? '?'
})

const cliPillStyle = computed(() => ({
  background: cliMeta.value.bg,
  color: cliMeta.value.color,
}))

const routingMeta = computed(() => {
  if (!props.message.routingMeta) return null
  try { return JSON.parse(props.message.routingMeta) } catch { return null }
})

function formatTime(date?: Date | string): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const renderedContent = computed(() => {
  return props.message.content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_: string, lang: string, code: string) =>
      `<div class="cc-code-wrap"><div class="cc-code-header"><span class="cc-code-lang">${lang ?? 'text'}</span></div><pre class="cc-code-block"><code>${escapeHtml(code.trim())}</code></pre></div>`
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
  gap: 12px;
  padding: 14px 0;
}

.cc-message-avatar-wrap {
  flex-shrink: 0;
  padding-top: 1px;
}

.cc-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cc-avatar--user {
  background: var(--accent-dim);
  color: var(--accent);
}

.cc-avatar--claude {
  background: rgba(217, 119, 87, 0.12);
  color: #D97757;
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.18);
}

.cc-avatar--gemini {
  background: rgba(81, 135, 242, 0.12);
  color: #5187F2;
  box-shadow: inset 0 0 0 1px rgba(81, 135, 242, 0.18);
}

.cc-avatar--copilot {
  background: rgba(181, 192, 204, 0.12);
  color: #B5C0CC;
  box-shadow: inset 0 0 0 1px rgba(181, 192, 204, 0.18);
}

.cc-avatar-glyph {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cc-avatar-initial {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.cc-message-body {
  flex: 1;
  min-width: 0;
}

.cc-message-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}

.cc-message-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.cc-cli-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.cc-pill-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cc-message-time {
  font-size: 11px;
  color: var(--text-faint);
}

.cc-message-meta-reason {
  font-size: 11px;
  color: var(--text-muted);
}

.cc-message-tokens {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--text-faint);
  font-family: var(--font-mono);
}

.cc-message-content {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-primary);
}

:deep(.cc-code-wrap) {
  margin: 8px 0;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-canvas);
}

:deep(.cc-code-header) {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
}

:deep(.cc-code-lang) {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  font-weight: 500;
}

:deep(.cc-code-block) {
  padding: 12px 16px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.55;
  margin: 0;
  color: var(--text-primary);
}

:deep(.cc-inline-code) {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
  font-family: var(--font-mono);
  font-size: 0.875em;
  color: var(--accent);
}
</style>
