<template>
  <div class="historico-page">
    <header class="page-header">
      <span class="page-title">Histórico</span>
    </header>

    <div class="page-body">
      <div v-if="loading" class="state-center">
        <div class="spinner" />
      </div>

      <div v-else-if="sessions.length === 0" class="state-center">
        <div class="empty-icon">💬</div>
        <p class="empty-text">Nenhuma conversa no histórico</p>
      </div>

      <ul v-else class="session-list">
        <li
          v-for="session in sessions"
          :key="session.id"
          class="session-card"
          @click="openSession(session.id)"
        >
          <span class="dot" />
          <div class="card-body">
            <span class="card-title">{{ session.title }}</span>
            <span class="card-meta">{{ formatDate(session.createdAt) }}</span>
          </div>
          <span class="badge">{{ session.messageCount }} msgs</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessions } from 'src/composables/useSessions'
import type { SessionSummary } from 'src/types/claudicaro'

const router = useRouter()
const { selectSession } = useSessions()

const sessions = ref<SessionSummary[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    sessions.value = await window.claudicaro.session.list()
  } finally {
    loading.value = false
  }
})

async function openSession(id: string) {
  selectSession(id)
  await router.push('/')
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  const day = date.getDate()
  const month = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day} ${month} · ${hours}:${minutes}`
}
</script>

<style scoped>
.historico-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-canvas);
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  height: var(--titlebar-h);
  padding: 0 var(--s-4);
  flex-shrink: 0;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--border-subtle);
}

.page-title {
  font-family: var(--font-sans);
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text-primary);
  -webkit-app-region: no-drag;
}

.page-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--s-3) var(--s-4);
}

/* ── States ── */
.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s-3);
  height: 100%;
  padding: var(--s-8);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: var(--r-full);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 2rem;
  line-height: 1;
  opacity: 0.4;
}

.empty-text {
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  color: var(--text-muted);
  margin: 0;
}

/* ── List ── */
.session-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.session-card {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  cursor: pointer;
  transition: background 0.15s ease;
}

.session-card:hover {
  background: var(--bg-hover);
}

.dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: var(--r-full);
  background: var(--accent);
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-title {
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  font-family: var(--font-sans);
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.badge {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
  padding: 2px var(--s-2);
  white-space: nowrap;
}
</style>
