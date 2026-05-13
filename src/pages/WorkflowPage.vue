<template>
  <div class="cc-workflow-page">
    <!-- Header -->
    <header class="cc-workflow-header">
      <span class="cc-workflow-title">Workflows</span>
      <span class="cc-workflow-sub">{{ sessions.length }} conversas</span>
    </header>

    <!-- Corpo: lista de sessões com mini-workflow -->
    <div class="cc-workflow-body">
      <div v-if="sessions.length === 0" class="cc-workflow-empty">
        Nenhuma conversa ativa
      </div>

      <div
        v-for="session in sessions"
        :key="session.id"
        class="cc-workflow-card"
        :class="{ active: session.id === currentSessionId }"
      >
        <div class="cc-wf-card-header">
          <span class="cc-wf-card-title">{{ session.title }}</span>
          <span class="cc-wf-card-msgs">{{ session.messageCount }} msgs</span>
          <button class="cc-wf-card-btn" @click="openChat(session.id)">Abrir chat</button>
        </div>
        <!-- Mini workflow viewer inline para esta sessão -->
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
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import WorkflowViewer from 'src/components/WorkflowViewer.vue'
import { useSessions } from 'src/composables/useSessions'

const router = useRouter()
const { sessions, currentSessionId, loadSessions, selectSession } = useSessions()

onMounted(async () => {
  await loadSessions()
})

function sessionCli(session: any): string {
  // tenta extrair o CLI do orchestratorConfig se disponível
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
  gap: 12px;
  border-bottom: 1px solid var(--border-subtle);
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.cc-workflow-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.cc-workflow-sub {
  font-size: 11px;
  color: var(--text-muted);
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

.cc-wf-card-title {
  flex: 1;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  align-items: center;
  justify-content: center;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
</style>
