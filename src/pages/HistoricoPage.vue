<template>
  <div class="historico-page">
    <header class="page-header">
      <span class="page-title">Histórico</span>
    </header>

    <!-- CLI Health mini-cards -->
    <div class="cli-status-bar">
      <div
        v-for="cli in cliStatuses"
        :key="cli.name"
        class="cli-card"
      >
        <span class="cli-dot" :style="{ background: cli.color }" />
        <span class="cli-name">{{ cli.name }}</span>
        <span class="cli-badge" :class="cli.available ? 'cli-badge--online' : 'cli-badge--offline'">
          {{ cli.available ? 'online' : 'offline' }}
        </span>
      </div>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <div class="search-input-wrap">
        <svg class="search-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <circle cx="7" cy="7" r="4.5"/><path d="M11 11l2.5 2.5"/>
        </svg>
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="Buscar conversas…"
          type="text"
        />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 4l8 8M12 4l-8 8"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="page-body">
      <div v-if="loading" class="state-center">
        <div class="spinner" />
      </div>

      <div v-else-if="displayedSessions.length === 0" class="state-center">
        <div class="empty-icon">💬</div>
        <p class="empty-text">{{ searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma conversa no histórico' }}</p>
      </div>

      <ul v-else class="session-list">
        <li
          v-for="session in displayedSessions"
          :key="session.id"
          class="session-card"
          @click="openSession(session.id)"
        >
          <span class="dot" />
          <div class="card-body">
            <div class="card-title-row">
              <span class="card-title">{{ session.title }}</span>
              <svg v-if="session.pinnedAt" class="pin-icon" width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <path d="M9.5 1.5a1 1 0 0 1 1.5 0l3.5 3.5a1 1 0 0 1 0 1.5L12.3 8.2a1 1 0 0 1-.4.2L10 8.9l-4 4-.3.3H4.6L3 14.7l-.7-.7 1.5-1.6v-1l.3-.3 4-4 .5-1.9c0-.14.08-.28.2-.4L9.5 1.5z"/>
              </svg>
            </div>
            <span class="card-meta">{{ formatDate(session.createdAt) }}</span>
          </div>
          <span class="badge">{{ session.messageCount }} msgs</span>
          <button
            class="delete-btn"
            title="Excluir conversa"
            @click.stop="confirmDelete(session)"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"/>
            </svg>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessions } from 'src/composables/useSessions'
import type { SessionSummary } from 'src/types/icarus'

const router = useRouter()
const { selectSession, deleteSession } = useSessions()

const allSessions = ref<SessionSummary[]>([])
const loading = ref(true)
const searchQuery = ref('')
const searchResults = ref<SessionSummary[] | null>(null)
const cliStatuses = ref<{ name: string; color: string; available: boolean }[]>([])

const CLI_COLORS: Record<string, string> = {
  Claude: '#D97757',
  Agy: '#5187F2',
  Copilot: '#B5C0CC',
}

onMounted(async () => {
  try {
    const [sessions, health] = await Promise.all([
      window.claudicaro.session.list(),
      window.claudicaro.health(),
    ])
    allSessions.value = sessions

    cliStatuses.value = ['Claude', 'Agy', 'Copilot'].map((name) => {
      const key = name.toLowerCase()
      const info = health[key] as { available: boolean } | undefined
      return { name, color: CLI_COLORS[name]!, available: info?.available ?? false }
    })
  } finally {
    loading.value = false
  }
})

let debounceTimer: ReturnType<typeof setTimeout>
watch(searchQuery, async (q) => {
  clearTimeout(debounceTimer)
  if (!q || q.length < 2) {
    searchResults.value = null
    return
  }
  debounceTimer = setTimeout(async () => {
    const results = await window.claudicaro.session.search(q)
    searchResults.value = results
  }, 300)
})

const displayedSessions = computed<SessionSummary[]>(() => {
  return searchResults.value !== null ? searchResults.value : allSessions.value
})

async function openSession(id: string) {
  selectSession(id)
  await router.push('/')
}

async function confirmDelete(session: SessionSummary) {
  if (!window.confirm(`Excluir a conversa "${session.title}"?`)) return
  await deleteSession(session.id)
  allSessions.value = allSessions.value.filter((s) => s.id !== session.id)
  if (searchResults.value) {
    searchResults.value = searchResults.value.filter((s) => s.id !== session.id)
  }
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

/* ── CLI status bar ── */
.cli-status-bar {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.cli-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-size: 12px;
}

.cli-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cli-name {
  font-weight: 500;
  color: var(--text-primary);
}

.cli-badge {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.cli-badge--online {
  background: rgba(63, 207, 142, 0.12);
  color: var(--success);
}

.cli-badge--offline {
  background: var(--bg-elevated);
  color: var(--text-muted);
}

/* ── Search ── */
.search-bar {
  padding: 10px 16px 4px;
  flex-shrink: 0;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  transition: border-color 0.15s;
}

.search-input-wrap:focus-within {
  border-color: var(--accent);
}

.search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 12.5px;
  color: var(--text-primary);
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-clear {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  background: var(--bg-elevated);
  border: none;
  border-radius: 50%;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}

.search-clear:hover {
  color: var(--text-primary);
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
  position: relative;
}

.session-card:hover {
  background: var(--bg-hover);
}

.session-card:hover .delete-btn {
  opacity: 1;
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

.card-title-row {
  display: flex;
  align-items: center;
  gap: 5px;
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

.pin-icon {
  color: var(--accent);
  flex-shrink: 0;
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

.delete-btn {
  opacity: 0;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, opacity 0.15s;
}

.delete-btn:hover {
  background: rgba(255, 80, 80, 0.1);
  color: var(--error);
}
</style>
