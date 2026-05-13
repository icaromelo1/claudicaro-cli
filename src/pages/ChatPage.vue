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
            <span v-for="cli in activeClis" :key="cli" class="cc-cli-dot" :style="{ background: cliColors[cli] }" :title="cli" />
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
            <ChatLoading v-if="isLoading" :cli="loadingCli" />
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
import { ref, computed, nextTick } from 'vue'
import ChatMessage from 'components/ChatMessage.vue'
import ChatInput from 'components/ChatInput.vue'
import ChatLoading from 'components/ChatLoading.vue'

const sidebarOpen = ref(true)
const currentSessionId = ref<string | null>(null)
const messages = ref<any[]>([])
const isLoading = ref(false)
const loadingCli = ref<string>('claude')
const scrollArea = ref()

const cliColors: Record<string, string> = {
  claude: 'var(--cli-claude)',
  gemini: 'var(--cli-gemini)',
  copilot: 'var(--cli-copilot)',
}

const activeClis = ref(['claude', 'gemini', 'copilot'])

// Mock sessions para UI funcionar antes do backend
const sessions = ref([
  { id: 's1', title: 'Nova conversa', messageCount: 0 },
])

const currentSession = computed(() =>
  sessions.value.find(s => s.id === currentSessionId.value) ?? sessions.value[0]
)

function newSession() {
  const id = `s${Date.now()}`
  sessions.value.unshift({ id, title: 'Nova conversa', messageCount: 0 })
  currentSessionId.value = id
  messages.value = []
}

function selectSession(id: string) {
  currentSessionId.value = id
  messages.value = []
}

async function sendMessage(content: string) {
  if (!content.trim() || isLoading.value) return

  messages.value.push({
    id: Date.now().toString(),
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  })

  isLoading.value = true
  loadingCli.value = 'claude'

  await nextTick()
  scrollArea.value?.setScrollPercentage('vertical', 1.0, 300)

  // Placeholder até dispatcher estar integrado (T9)
  setTimeout(() => {
    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      cli: 'claude',
      model: 'claude-sonnet-4-6',
      content: 'Dispatcher ainda não conectado. Aguardando T9.',
      routingMeta: '{"reason":"placeholder","toolRequirement":"code_analysis"}',
      createdAt: new Date().toISOString(),
    })
    isLoading.value = false
    nextTick(() => scrollArea.value?.setScrollPercentage('vertical', 1.0, 300))
  }, 1200)
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
