<template>
  <div class="cc-chat-page">
    <!-- Header -->
    <header class="cc-chat-header">
      <div class="cc-chat-header-left">
        <span class="cc-chat-title">{{ currentSession?.title ?? 'Nova conversa' }}</span>
        <span class="cc-chat-subtitle">{{ messages.length }} mensagens · {{ activeClis.length }} CLIs envolvidas</span>
      </div>
      <div class="cc-chat-header-right">
        <button class="cc-header-chip" title="Abrir diretório" @click="openDir">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="12" height="10" rx="2"/>
            <path d="M5 7l2 2-2 2"/>
            <path d="M9 11h2"/>
          </svg>
          ~/claudicaro
        </button>
        <div class="cc-header-divider" />
        <button class="cc-header-chip cc-header-chip--active" @click="showWorkflow = true">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="6" width="4" height="4" rx="0.8"/>
            <rect x="11" y="2" width="4" height="4" rx="0.8"/>
            <rect x="11" y="10" width="4" height="4" rx="0.8"/>
            <path d="M5 8h3M8 8V4h3M8 8v4h3"/>
          </svg>
          Workflow
        </button>
        <div class="cc-header-divider" />
        <div class="cc-more-wrap" ref="moreWrap">
          <button class="cc-header-more" @click="moreOpen = !moreOpen">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="3" cy="8" r="1.2" fill="currentColor"/>
              <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
              <circle cx="13" cy="8" r="1.2" fill="currentColor"/>
            </svg>
          </button>
          <div v-if="moreOpen" class="cc-more-menu">
            <button class="cc-more-item" @click="clearChat">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"/>
              </svg>
              Limpar chat
            </button>
            <button class="cc-more-item" @click="exportMarkdown">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 2v9M5 8l3 3 3-3M3 13h10"/>
              </svg>
              Exportar Markdown
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Estado vazio: sem sessão -->
    <div v-if="!currentSessionId" class="cc-chat-empty">
      <div class="cc-empty-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <p class="cc-empty-title">Nenhuma conversa selecionada</p>
      <p class="cc-empty-sub">Clique em "Nova conversa" na barra lateral para começar.</p>
    </div>

    <!-- Mensagens -->
    <div v-else class="cc-messages-area" ref="messagesContainer">
      <div class="cc-messages-inner">
        <ChatMessage
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
        />
        <ChatLoading v-if="isLoading && !streamingContent" :cli="loadingCli" />
        <ChatMessage
          v-if="streamingContent"
          :message="streamingMessage"
        />
      </div>
    </div>

    <!-- Input -->
    <ChatInput :disabled="isLoading || !currentSessionId" @send="onSend" @cancel="cancelDispatch" />

    <!-- WorkflowDrawer -->
    <WorkflowDrawer v-model="showWorkflow" :session-id="currentSessionId" />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import ChatMessage from 'components/ChatMessage.vue'
import ChatInput from 'components/ChatInput.vue'
import ChatLoading from 'components/ChatLoading.vue'
import WorkflowDrawer from 'components/WorkflowDrawer.vue'
import { useChat } from 'src/composables/useChat'
import { useSessions } from 'src/composables/useSessions'

const messagesContainer = ref<HTMLElement>()
const showWorkflow = ref(false)
const moreOpen = ref(false)
const moreWrap = ref<HTMLElement>()

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const { loadSessions, createSession, currentSessionId, sessions } = useSessions()
const {
  messages,
  isLoading,
  loadingCli,
  streamingContent,
  activeClis,
  currentSession,
  streamingMessage,
  sendMessage,
  cancelDispatch,
} = useChat(scrollToBottom)

onMounted(async () => {
  await loadSessions()
  if (sessions.value.length > 0 && !currentSessionId.value) {
    currentSessionId.value = sessions.value[0]!.id
  } else if (sessions.value.length === 0) {
    await createSession({ title: 'Nova conversa' })
  }

  document.addEventListener('click', handleOutsideMore)
})

onBeforeUnmount(() => document.removeEventListener('click', handleOutsideMore))

function handleOutsideMore(e: MouseEvent) {
  if (moreOpen.value && moreWrap.value && !moreWrap.value.contains(e.target as Node)) {
    moreOpen.value = false
  }
}

async function onSend(payload: { content: string; mode: string }) {
  await sendMessage(payload.content, payload.mode)
}

async function openDir() {
  if (currentSessionId.value) {
    await window.icarus.session.openDir(currentSessionId.value)
  }
}

async function clearChat() {
  moreOpen.value = false
  if (!currentSessionId.value) return
  if (!window.confirm('Limpar todo o histórico desta conversa?')) return
  // Re-create session (soft-delete current, create new)
  await createSession({ title: currentSession.value?.title ?? 'Nova conversa' })
}

function exportMarkdown() {
  moreOpen.value = false
  if (!messages.value.length) return
  const md = messages.value
    .map((m) => `## ${m.role === 'user' ? 'Você' : 'IA'}\n\n${m.content}`)
    .join('\n\n---\n\n')
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentSession.value?.title ?? 'chat'}.md`
  a.click()
  URL.revokeObjectURL(url)
}

watch(() => messages.value.length, scrollToBottom)
</script>

<style scoped>
.cc-chat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-canvas);
  overflow: hidden;
}

.cc-chat-header {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 12px;
  border-bottom: 1px solid var(--border-subtle);
  gap: 12px;
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.cc-chat-header-left {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
}

.cc-chat-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cc-chat-subtitle {
  font-size: 10.5px;
  color: var(--text-muted);
}

.cc-chat-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.cc-header-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 5px;
  font-size: 11.5px;
  color: var(--text-secondary);
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.cc-header-chip:hover {
  background: var(--bg-hover);
}

.cc-header-chip--active {
  background: var(--accent-dim);
  border-color: rgba(63, 207, 142, 0.25);
  color: var(--accent);
}

.cc-header-divider {
  width: 1px;
  height: 16px;
  background: var(--border-subtle);
  margin: 0 4px;
}

.cc-more-wrap {
  position: relative;
}

.cc-header-more {
  width: 28px;
  height: 26px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s;
}

.cc-header-more:hover {
  background: var(--bg-hover);
}

.cc-more-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 200;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  padding: 4px;
  min-width: 180px;
}

.cc-more-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  background: none;
  border: none;
  border-radius: 5px;
  font-size: 12.5px;
  color: var(--text-secondary);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}

.cc-more-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.cc-chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-muted);
  padding: 40px;
}

.cc-empty-icon {
  opacity: 0.3;
}

.cc-empty-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0;
}

.cc-empty-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  text-align: center;
}

.cc-messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.cc-messages-inner {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 24px;
}
</style>
