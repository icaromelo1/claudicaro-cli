<template>
  <div class="cc-workflow-page">
    <!-- Header com tabs -->
    <header class="cc-workflow-header">
      <span class="cc-workflow-title" style="-webkit-app-region: no-drag">Workflows</span>
      <div class="cc-workflow-tabs" style="-webkit-app-region: no-drag">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="cc-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
          <span v-if="tab.count" class="cc-tab-count">{{ tab.count }}</span>
        </button>
      </div>
    </header>

    <!-- Corpo -->
    <WorkflowCanvas v-if="activeTab === 'canvas'" class="cc-workflow-canvas" />
    <div v-else class="cc-workflow-body">
      <div v-if="displayedSessions.length === 0" class="cc-workflow-empty">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.3">
          <rect x="3" y="9" width="6" height="6" rx="1"/>
          <rect x="15" y="3" width="6" height="6" rx="1"/>
          <rect x="15" y="15" width="6" height="6" rx="1"/>
          <path d="M9 12h3M12 12V6h3M12 12v6h3"/>
        </svg>
        <span>Nenhuma conversa nesta aba</span>
      </div>

      <div
        v-for="session in displayedSessions"
        :key="session.id"
        class="cc-workflow-card"
        :class="{ active: session.id === currentSessionId }"
      >
        <div class="cc-wf-card-header">
          <svg v-if="session.pinnedAt" class="cc-wf-pin" width="10" height="10" viewBox="0 0 16 16" fill="var(--accent)">
            <path d="M9.5 1.5a1 1 0 0 1 1.5 0l3.5 3.5a1 1 0 0 1 0 1.5L12.3 8.2a1 1 0 0 1-.4.2L10 8.9l-4 4-.3.3H4.6L3 14.7l-.7-.7 1.5-1.6v-1l.3-.3 4-4 .5-1.9c0-.14.08-.28.2-.4L9.5 1.5z"/>
          </svg>
          <span class="cc-wf-card-title">{{ session.title }}</span>
          <span class="cc-wf-cli-badge" v-if="sessionCli(session)">{{ sessionCli(session) }}</span>
          <span class="cc-wf-card-msgs">{{ session.messageCount }} msgs</span>
          <button class="cc-wf-card-btn" @click="openChat(session.id)">Abrir chat</button>
        </div>
        <WorkflowViewer
          class="cc-wf-mini"
          :session-id="session.id"
          :active-cli="sessionCli(session)"
          :compact="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import WorkflowViewer from 'src/components/WorkflowViewer.vue'
import WorkflowCanvas from 'src/components/canvas/WorkflowCanvas.vue'
import { useSessions } from 'src/composables/useSessions'
import type { SessionSummary } from 'src/types/icarus'

const router = useRouter()
const { sessions, currentSessionId, loadSessions, selectSession } = useSessions()

const activeTab = ref<'all' | 'active' | 'pinned' | 'canvas'>('all')

onMounted(async () => {
  await loadSessions()
})

const pinnedSessions = computed(() => sessions.value.filter((s) => s.pinnedAt != null))
const activeSessions = computed(() => sessions.value.filter((s) => s.messageCount > 0))

const tabs = computed(() => [
  { id: 'all' as const, label: 'Todos', count: sessions.value.length },
  { id: 'active' as const, label: 'Ativos', count: activeSessions.value.length },
  { id: 'pinned' as const, label: 'Fixados', count: pinnedSessions.value.length },
  { id: 'canvas' as const, label: 'Canvas', count: 0 },
])

const displayedSessions = computed<SessionSummary[]>(() => {
  if (activeTab.value === 'pinned') return pinnedSessions.value
  if (activeTab.value === 'active') return activeSessions.value
  return sessions.value
})

function sessionCli(session: SessionSummary): string {
  if (session.orchestratorConfig) {
    try {
      const cfg = JSON.parse(session.orchestratorConfig)
      return cfg.cli ?? ''
    } catch { return '' }
  }
  return ''
}

async function openChat(id: string) {
  selectSession(id)
  await router.push('/')
}
</script>

<style scoped>
.cc-workflow-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-canvas);
  overflow: hidden;
}

.cc-workflow-header {
  height: var(--titlebar-h);
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid var(--border-subtle);
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.cc-workflow-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.cc-workflow-tabs {
  display: flex;
  gap: 2px;
}

.cc-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: transparent;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  color: var(--text-muted);
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.cc-tab:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.cc-tab.active {
  background: var(--vibrancy-strong);
  color: var(--text-primary);
  font-weight: 500;
}

.cc-tab-count {
  font-size: 10.5px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--bg-elevated);
  color: var(--text-muted);
}

.cc-workflow-canvas {
  flex: 1;
  min-height: 0;
}

.cc-workflow-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--s-4);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.cc-workflow-card {
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  overflow: hidden;
  background: var(--bg-surface);
}

.cc-workflow-card.active {
  border-color: var(--accent);
}

.cc-wf-card-header {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--border-subtle);
}

.cc-wf-pin {
  flex-shrink: 0;
}

.cc-wf-card-title {
  flex: 1;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cc-wf-cli-badge {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.cc-wf-card-msgs {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  flex-shrink: 0;
}

.cc-wf-card-btn {
  padding: 3px 10px;
  border-radius: var(--r-sm);
  border: 1px solid var(--accent);
  background: var(--accent-dim);
  color: var(--accent);
  font-size: var(--fs-xs);
  font-family: var(--font-sans);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.cc-wf-card-btn:hover {
  background: rgba(63, 207, 142, 0.22);
}

.cc-wf-mini {
  height: 200px;
  overflow: hidden;
}

.cc-workflow-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
</style>
