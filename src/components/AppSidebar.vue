<template>
  <aside class="cc-sidebar" :class="{ collapsed: expanded === false }">
    <!-- Titlebar com botão toggle -->
    <div class="cc-sidebar-titlebar">
      <button
        class="cc-toggle-btn"
        @click="emit('toggle')"
        :title="expanded === false ? 'Expandir sidebar' : 'Recolher sidebar'"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path v-if="expanded !== false" d="M10 3L6 8l4 5M6 3L2 8l4 5"/>
          <path v-else d="M6 3l4 5-4 5M10 3l4 5-4 5"/>
        </svg>
      </button>
    </div>

    <!-- Brand -->
    <div class="cc-sidebar-brand">
      <div class="cc-brand-icon">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M4 4l4 8 4-8M5 4h6" stroke="#0B0B0E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span v-show="expanded !== false" class="cc-brand-name">Claudicaro</span>
      <span v-show="expanded !== false" class="cc-brand-beta">BETA</span>
    </div>

    <!-- Nova conversa -->
    <div class="cc-sidebar-new">
      <button class="cc-new-btn" @click="emit('new-session')">
        <span class="cc-new-btn-left">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <path d="M8 3v10M3 8h10"/>
          </svg>
          <span v-show="expanded !== false">Nova conversa</span>
        </span>
        <span v-show="expanded !== false" class="cc-new-btn-kbd">
          <kbd class="cc-kbd">⌘</kbd><kbd class="cc-kbd">N</kbd>
        </span>
      </button>
    </div>

    <!-- Search -->
    <div v-show="expanded !== false" class="cc-sidebar-search">
      <div class="cc-search-box">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <circle cx="7" cy="7" r="4.5"/><path d="M11 11l2.5 2.5"/>
        </svg>
        <input
          v-model="searchQuery"
          class="cc-search-input"
          placeholder="Buscar conversas"
          type="text"
        />
        <button v-if="searchQuery" class="cc-search-clear" @click="searchQuery = ''">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 4l8 8M12 4l-8 8"/>
          </svg>
        </button>
        <span v-else class="cc-search-kbd"><kbd class="cc-kbd">⌘</kbd><kbd class="cc-kbd">K</kbd></span>
      </div>
    </div>

    <!-- Nav -->
    <nav class="cc-sidebar-nav">
      <router-link v-for="item in navItems" :key="item.to" :to="item.to" class="cc-nav-item" :title="item.label">
        <span class="cc-nav-icon" v-html="item.iconSvg" />
        <span v-show="expanded !== false" class="cc-nav-label">{{ item.label }}</span>
        <span v-if="item.badge !== undefined && expanded !== false" class="cc-nav-badge">{{ item.badge }}</span>
      </router-link>
    </nav>

    <!-- Sessions (condicional) -->
    <template v-if="showSessions && expanded !== false">
      <!-- Sessões fixadas -->
      <template v-if="pinnedSessions.length > 0">
        <div class="cc-sessions-header">
          <span>Fixadas</span>
          <span class="cc-sessions-count">{{ pinnedSessions.length }}</span>
        </div>
        <div class="cc-sessions-list cc-sessions-list--pinned">
          <SessionRow
            v-for="session in pinnedSessions"
            :key="session.id"
            :session="session"
            :is-active="session.id === currentSessionId"
            :groups="groups"
            @select="selectSession(session.id)"
            @rename="(id, title) => handleRename(id, title)"
            @pin="(id, pinned) => handlePin(id, pinned)"
            @move-group="(id, gid) => handleMoveGroup(id, gid)"
            @delete="(id) => handleDelete(id)"
          />
        </div>
      </template>

      <!-- Grupos -->
      <template v-for="group in groups" :key="group.id">
        <div v-if="sessionsByGroup[group.id]?.length" class="cc-sessions-header cc-sessions-header--group" @click="toggleGroup(group.id)">
          <span class="cc-group-chevron" :class="{ open: !collapsedGroups.has(group.id) }">▶</span>
          <span class="cc-group-dot" :style="{ background: group.color }" />
          <span>{{ group.name }}</span>
          <span class="cc-sessions-count">{{ sessionsByGroup[group.id]?.length }}</span>
        </div>
        <div v-if="!collapsedGroups.has(group.id) && sessionsByGroup[group.id]?.length" class="cc-sessions-list">
          <SessionRow
            v-for="session in sessionsByGroup[group.id]"
            :key="session.id"
            :session="session"
            :is-active="session.id === currentSessionId"
            :groups="groups"
            @select="selectSession(session.id)"
            @rename="(id, title) => handleRename(id, title)"
            @pin="(id, pinned) => handlePin(id, pinned)"
            @move-group="(id, gid) => handleMoveGroup(id, gid)"
            @delete="(id) => handleDelete(id)"
          />
        </div>
      </template>

      <!-- Sessões sem grupo -->
      <template v-if="ungroupedSessions.length > 0">
        <div class="cc-sessions-header">
          <span>Sessões recentes</span>
          <span class="cc-sessions-count">{{ ungroupedSessions.length }}</span>
        </div>
        <div class="cc-sessions-list">
          <SessionRow
            v-for="session in ungroupedSessions"
            :key="session.id"
            :session="session"
            :is-active="session.id === currentSessionId"
            :groups="groups"
            @select="selectSession(session.id)"
            @rename="(id, title) => handleRename(id, title)"
            @pin="(id, pinned) => handlePin(id, pinned)"
            @move-group="(id, gid) => handleMoveGroup(id, gid)"
            @delete="(id) => handleDelete(id)"
          />
        </div>
      </template>
    </template>

    <!-- Spacer -->
    <div style="flex: 1" />

    <!-- User footer -->
    <div class="cc-sidebar-footer">
      <button class="cc-user-avatar-btn" @click="showProfile = true" title="Perfil">
        <div class="cc-user-avatar">I</div>
      </button>
      <div v-show="expanded !== false" class="cc-user-info">
        <span class="cc-user-name">Icaro</span>
        <span class="cc-user-status">
          <span class="cc-dot cc-dot--green" />
          {{ connectedCount }} CLIs conectadas
        </span>
      </div>
      <button class="cc-footer-settings-btn" @click="$router.push('/settings')" title="Configurações">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>
        </svg>
      </button>
    </div>

    <UserProfileModal v-if="showProfile" @close="showProfile = false" />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSessions } from 'src/composables/useSessions'
import type { SessionSummary } from 'src/types/claudicaro'
import SessionRow from './SessionRow.vue'
import UserProfileModal from './UserProfileModal.vue'

defineProps<{ showSessions?: boolean; expanded?: boolean }>()
const emit = defineEmits<{ 'new-session': []; toggle: [] }>()

const { sessions, groups, currentSessionId, selectSession, renameSession, pinSession, moveToGroup, deleteSession } = useSessions()

const searchQuery = ref('')
const collapsedGroups = ref(new Set<string>())
const showProfile = ref(false)

let debounceTimer: ReturnType<typeof setTimeout>
const filteredSessions = ref<SessionSummary[]>(sessions.value)

watch([sessions, searchQuery], ([newSessions, q]) => {
  clearTimeout(debounceTimer)
  if (!q || q.length < 2) {
    filteredSessions.value = newSessions
    return
  }
  debounceTimer = setTimeout(async () => {
    filteredSessions.value = await window.claudicaro.session.search(q)
  }, 300)
}, { immediate: true })

const pinnedSessions = computed(() =>
  filteredSessions.value.filter((s) => s.pinnedAt != null)
)

const sessionsByGroup = computed(() => {
  const map: Record<string, SessionSummary[]> = {}
  for (const s of filteredSessions.value) {
    if (s.groupId && !s.pinnedAt) {
      (map[s.groupId] ??= []).push(s)
    }
  }
  return map
})

const ungroupedSessions = computed(() =>
  filteredSessions.value.filter((s) => !s.pinnedAt && !s.groupId)
)

function toggleGroup(id: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsedGroups.value = next
}

async function handleRename(id: string, title: string) {
  await renameSession(id, title)
}

async function handlePin(id: string, pinned: boolean) {
  await pinSession(id, pinned)
}

async function handleMoveGroup(sessionId: string, groupId: string | null) {
  await moveToGroup(sessionId, groupId)
}

async function handleDelete(id: string) {
  if (!window.confirm('Excluir essa conversa?')) return
  await deleteSession(id)
}

const connectedCount = computed(() => 3)

const navItems = [
  {
    to: '/',
    label: 'Chat',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>`,
  },
  {
    to: '/workflow',
    label: 'Workflows',
    badge: '',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 12h3M12 12V6h3M12 12v6h3"/></svg>`,
  },
  {
    to: '/history',
    label: 'Histórico',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/></svg>`,
  },
]
</script>

<style scoped>
.cc-sidebar {
  width: 248px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-subtle);
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.2s ease;
}

.cc-sidebar.collapsed {
  width: var(--sidebar-w-collapsed);
}

.cc-sidebar-titlebar {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  padding: 0 14px;
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.cc-toggle-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.cc-toggle-btn:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.cc-sidebar.collapsed .cc-nav-item {
  justify-content: center;
  padding: 6px 8px;
}

.cc-sidebar.collapsed .cc-sidebar-brand {
  justify-content: center;
  padding: 4px 0 12px;
}

.cc-sidebar.collapsed .cc-sidebar-new {
  padding: 0 6px;
}

.cc-sidebar.collapsed .cc-new-btn {
  justify-content: center;
  padding: 7px;
  min-width: 0;
}

.cc-sidebar.collapsed .cc-sidebar-footer {
  justify-content: center;
  padding: 10px 6px;
}

.cc-sidebar-brand {
  padding: 4px 14px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cc-brand-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--accent), #2FB97A);
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 1px rgba(63, 207, 142, 0.2), 0 2px 6px rgba(63, 207, 142, 0.18);
  flex-shrink: 0;
}

.cc-brand-name {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.cc-brand-beta {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--text-muted);
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
}

.cc-sidebar-new {
  padding: 0 10px;
  flex-shrink: 0;
}

.cc-new-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: var(--vibrancy-strong);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.cc-new-btn:hover {
  background: var(--bg-hover);
}

.cc-new-btn-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cc-new-btn-kbd {
  display: flex;
  gap: 2px;
}

.cc-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--vibrancy-strong);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: inherit;
  line-height: 1;
}

.cc-sidebar-search {
  padding: 8px 10px 4px;
  flex-shrink: 0;
}

.cc-search-box {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 9px;
  background: var(--vibrancy);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-muted);
  transition: border-color 0.15s;
}

.cc-search-box:focus-within {
  border-color: var(--accent);
}

.cc-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 12px;
  color: var(--text-primary);
  font-family: inherit;
}

.cc-search-input::placeholder {
  color: var(--text-muted);
}

.cc-search-clear {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  background: var(--bg-elevated);
  border: none;
  border-radius: 50%;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
}

.cc-search-clear:hover {
  color: var(--text-primary);
}

.cc-search-kbd {
  display: flex;
  gap: 2px;
}

.cc-sidebar-nav {
  padding: 6px 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
}

.cc-nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--text-secondary);
  text-decoration: none;
  cursor: pointer;
  position: relative;
  transition: background 0.15s, color 0.15s;
}

.cc-nav-item:hover {
  background: var(--bg-hover);
}

.cc-nav-item.router-link-exact-active {
  color: var(--text-primary);
  background: var(--vibrancy-strong);
}

.cc-nav-item.router-link-exact-active::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--accent);
  border-radius: 2px;
}

.cc-nav-icon {
  color: var(--text-muted);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.cc-nav-item.router-link-exact-active .cc-nav-icon {
  color: var(--accent);
}

.cc-nav-label {
  flex: 1;
}

.cc-nav-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--vibrancy-strong);
  color: var(--text-secondary);
}

.cc-sessions-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 14px 4px;
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.cc-sessions-header--group {
  cursor: pointer;
  user-select: none;
  padding: 8px 14px 4px;
}

.cc-sessions-header--group:hover {
  color: var(--text-secondary);
}

.cc-group-chevron {
  font-size: 8px;
  transition: transform 0.15s;
  display: inline-block;
}

.cc-group-chevron.open {
  transform: rotate(90deg);
}

.cc-group-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cc-sessions-count {
  color: var(--text-faint);
  margin-left: auto;
}

.cc-sessions-list {
  overflow-y: auto;
  padding: 2px 8px 8px;
  min-height: 0;
  flex: 1;
}

.cc-sessions-list--pinned {
  flex: 0;
}

.cc-sidebar-footer {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-base);
  flex-shrink: 0;
}

.cc-user-avatar-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  transition: opacity 0.15s;
}

.cc-user-avatar-btn:hover {
  opacity: 0.8;
}

.cc-user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5187F2, #7C5CFF);
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.cc-user-info {
  min-width: 0;
  flex: 1;
}

.cc-user-name {
  display: block;
  font-size: 12.5px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.cc-user-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  color: var(--text-muted);
}

.cc-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cc-dot--green {
  background: var(--success);
}

.cc-footer-settings-btn {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.cc-footer-settings-btn:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}
</style>
