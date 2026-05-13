<template>
  <q-layout view="lHh lpR lFf" class="cc-app">
    <!-- Sidebar de sessões -->
    <q-drawer
      v-model="sidebarOpen"
      :width="248"
      :breakpoint="700"
      class="cc-sidebar"
    >
      <div class="cc-sidebar-header">
        <span class="cc-sidebar-title">Claudicaro</span>
        <q-btn flat round dense icon="add" @click="newSession" class="cc-icon-btn" />
      </div>
      <q-scroll-area class="cc-sidebar-sessions">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="cc-session-item"
          :class="{ active: session.id === currentSessionId }"
          @click="selectSession(session.id)"
        >
          <span class="cc-session-title">{{ session.title }}</span>
          <span class="cc-session-meta">{{ session.messageCount }} msgs</span>
        </div>
      </q-scroll-area>
    </q-drawer>

    <!-- Área principal -->
    <q-page-container>
      <q-page class="cc-chat-page">
        <!-- Header -->
        <div class="cc-chat-header">
          <q-btn flat round dense icon="menu" @click="sidebarOpen = !sidebarOpen" class="cc-icon-btn" />
          <span class="cc-chat-title">{{ currentSession?.title ?? 'Nova conversa' }}</span>
          <div class="cc-active-clis">
            <span
              v-for="cli in activeClis"
              :key="cli"
              class="cc-cli-dot"
              :style="{ background: cliColors[cli] }"
              :title="cli"
            />
          </div>
        </div>

        <!-- Mensagens -->
        <q-scroll-area ref="scrollArea" class="cc-messages-area">
          <div class="cc-messages-inner">
            <ChatMessage
              v-for="msg in messages"
              :key="msg.id"
              :message="msg"
            />
            <ChatLoading v-if="isLoading && !streamingContent" :cli="loadingCli" />
            <!-- Mensagem em streaming -->
            <ChatMessage
              v-if="streamingContent"
              :message="streamingMessage"
            />
          </div>
        </q-scroll-area>

        <!-- Input -->
        <ChatInput
          :disabled="isLoading"
          @send="sendMessage"
        />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import ChatMessage from 'components/ChatMessage.vue'
import ChatInput from 'components/ChatInput.vue'
import ChatLoading from 'components/ChatLoading.vue'
import type { SessionSummary, MessageRecord, DispatchResult } from 'src/types/claudicaro'

const sidebarOpen = ref(true)
const currentSessionId = ref<string | null>(null)
const messages = ref<MessageRecord[]>([])
const isLoading = ref(false)
const loadingCli = ref<string>('claude')
const streamingContent = ref('')
const scrollArea = ref()
const sessions = ref<SessionSummary[]>([])

const cliColors: Record<string, string> = {
  claude: 'var(--cli-claude)',
  gemini: 'var(--cli-gemini)',
  copilot: 'var(--cli-copilot)',
}

const activeClis = ref(['claude', 'gemini', 'copilot'])

const currentSession = computed(() =>
  sessions.value.find(s => s.id === currentSessionId.value)
)

const streamingMessage = computed(() => ({
  id: 'streaming',
  sessionId: currentSessionId.value ?? '',
  role: 'assistant' as const,
  content: streamingContent.value,
  cli: loadingCli.value,
  model: '',
  createdAt: new Date(),
}))

let unsubscribeToken: (() => void) | null = null

onMounted(async () => {
  unsubscribeToken = window.claudicaro.onToken((chunk, sessionId) => {
    if (sessionId === currentSessionId.value) {
      streamingContent.value += chunk
      nextTick(() => scrollArea.value?.setScrollPercentage('vertical', 1.0, 150))
    }
  })
  await loadSessions()
  if (sessions.value.length === 0) {
    await newSession()
  } else {
    currentSessionId.value = sessions.value[0]!.id
    await loadHistory(sessions.value[0]!.id)
  }
})

onUnmounted(() => {
  unsubscribeToken?.()
})

async function loadSessions() {
  sessions.value = await window.claudicaro.session.list()
}

async function loadHistory(sessionId: string) {
  messages.value = await window.claudicaro.session.history(sessionId)
}

async function newSession() {
  const { id, title } = await window.claudicaro.session.create()
  sessions.value.unshift({ id, title, createdAt: new Date(), messageCount: 0 })
  currentSessionId.value = id
  messages.value = []
}

async function selectSession(id: string) {
  currentSessionId.value = id
  messages.value = []
  await loadHistory(id)
}

async function sendMessage(content: string) {
  if (!content.trim() || isLoading.value || !currentSessionId.value) return

  const userMsg: MessageRecord = {
    id: Date.now().toString(),
    sessionId: currentSessionId.value,
    role: 'user',
    content,
    createdAt: new Date(),
  }
  messages.value.push(userMsg)

  const session = sessions.value.find(s => s.id === currentSessionId.value)
  if (session) session.messageCount++

  isLoading.value = true
  streamingContent.value = ''

  await nextTick()
  scrollArea.value?.setScrollPercentage('vertical', 1.0, 300)

  try {
    const result: DispatchResult = await window.claudicaro.dispatch(content, currentSessionId.value)

    loadingCli.value = result.cli

    messages.value.push({
      id: (Date.now() + 1).toString(),
      sessionId: currentSessionId.value,
      role: 'assistant',
      content: result.content,
      cli: result.cli,
      model: result.model,
      routingMeta: result.routingMeta,
      tokens: result.tokens,
      latencyMs: result.latencyMs,
      createdAt: new Date(),
    })

    if (session) session.messageCount++
  } catch (err) {
    messages.value.push({
      id: (Date.now() + 1).toString(),
      sessionId: currentSessionId.value,
      role: 'assistant',
      content: `Erro ao processar: ${(err as Error).message}`,
      cli: 'claude',
      createdAt: new Date(),
    })
  } finally {
    streamingContent.value = ''
    isLoading.value = false
    await nextTick()
    scrollArea.value?.setScrollPercentage('vertical', 1.0, 300)
  }
}
</script>

<style scoped>
.cc-app {
  background: var(--bg-base);
}
.cc-sidebar {
  background: var(--bg-sidebar) !important;
  border-right: 1px solid var(--border-subtle);
}
.cc-sidebar-header {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  padding: 0 var(--s-3);
  border-bottom: 1px solid var(--border-subtle);
  justify-content: space-between;
  -webkit-app-region: drag;
}
.cc-sidebar-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}
.cc-sidebar-sessions {
  height: calc(100% - var(--titlebar-h));
}
.cc-session-item {
  padding: var(--s-2) var(--s-3);
  cursor: pointer;
  border-radius: var(--r-md);
  margin: 2px var(--s-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: background 0.12s;
}
.cc-session-item:hover { background: var(--bg-hover); }
.cc-session-item.active { background: var(--bg-active); }
.cc-session-title {
  font-size: var(--fs-sm);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cc-session-meta {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}
.cc-chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-canvas);
}
.cc-chat-header {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 0 var(--s-4);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  flex-shrink: 0;
  -webkit-app-region: drag;
}
.cc-chat-title {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}
.cc-active-clis {
  display: flex;
  align-items: center;
  gap: var(--s-1);
  -webkit-app-region: no-drag;
}
.cc-cli-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.cc-messages-area {
  flex: 1;
}
.cc-messages-inner {
  max-width: 760px;
  margin: 0 auto;
  padding: var(--s-3) var(--s-6);
}
.cc-icon-btn {
  color: var(--text-muted) !important;
  -webkit-app-region: no-drag;
}
</style>
