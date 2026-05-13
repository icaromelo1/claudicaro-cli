<template>
  <aside class="cc-sidebar">
    <!-- Titlebar com traffic lights -->
    <div class="cc-sidebar-titlebar">
      <div class="cc-traffic-lights">
        <span class="cc-tl cc-tl--close" />
        <span class="cc-tl cc-tl--min" />
        <span class="cc-tl cc-tl--max" />
      </div>
    </div>

    <!-- Brand -->
    <div class="cc-sidebar-brand">
      <div class="cc-brand-icon">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M4 4l4 8 4-8M5 4h6" stroke="#0B0B0E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="cc-brand-name">Claudicaro</span>
      <span class="cc-brand-beta">BETA</span>
    </div>

    <!-- Nova conversa -->
    <div class="cc-sidebar-new">
      <button class="cc-new-btn" @click="emit('new-session')">
        <span class="cc-new-btn-left">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <path d="M8 3v10M3 8h10"/>
          </svg>
          Nova conversa
        </span>
        <span class="cc-new-btn-kbd">
          <kbd class="cc-kbd">⌘</kbd><kbd class="cc-kbd">N</kbd>
        </span>
      </button>
    </div>

    <!-- Search -->
    <div class="cc-sidebar-search">
      <div class="cc-search-box">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <circle cx="7" cy="7" r="4.5"/><path d="M11 11l2.5 2.5"/>
        </svg>
        <span class="cc-search-placeholder">Buscar conversas</span>
        <span class="cc-search-kbd"><kbd class="cc-kbd">⌘</kbd><kbd class="cc-kbd">K</kbd></span>
      </div>
    </div>

    <!-- Nav -->
    <nav class="cc-sidebar-nav">
      <router-link v-for="item in navItems" :key="item.to" :to="item.to" class="cc-nav-item" :title="item.label">
        <span class="cc-nav-icon" v-html="item.iconSvg" />
        <span class="cc-nav-label">{{ item.label }}</span>
        <span v-if="item.badge !== undefined" class="cc-nav-badge">{{ item.badge }}</span>
      </router-link>
    </nav>

    <!-- Sessions (condicional) -->
    <template v-if="showSessions && sessions.length > 0">
      <div class="cc-sessions-header">
        <span>Sessões recentes</span>
        <span class="cc-sessions-count">{{ sessions.length }}</span>
      </div>
      <div class="cc-sessions-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="cc-session-row"
          :class="{ active: session.id === currentSessionId }"
          @click="selectSession(session.id)"
        >
          <span class="cc-dot" :style="{ background: cliColor((session as any).cli) }" />
          <span class="cc-session-title">{{ session.title }}</span>
          <span class="cc-session-time">{{ formatTime(session.createdAt) }}</span>
        </div>
      </div>
    </template>

    <!-- Spacer -->
    <div style="flex: 1" />

    <!-- User footer -->
    <div class="cc-sidebar-footer">
      <div class="cc-user-avatar">I</div>
      <div class="cc-user-info">
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
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSessions } from 'src/composables/useSessions'

const props = defineProps<{ showSessions?: boolean }>()
const emit = defineEmits<{ 'new-session': [] }>()

const { sessions, currentSessionId, selectSession } = useSessions()

const CLI_COLORS: Record<string, string> = {
  claude: '#D97757',
  gemini: '#5187F2',
  copilot: '#B5C0CC',
}

function cliColor(cli?: string) {
  return cli ? (CLI_COLORS[cli] ?? 'var(--text-faint)') : 'var(--text-faint)'
}

function formatTime(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
}

.cc-sidebar-titlebar {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  padding: 0 14px;
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.cc-traffic-lights {
  display: flex;
  gap: 8px;
  align-items: center;
}

.cc-tl {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.18);
  flex-shrink: 0;
}

.cc-tl--close { background: #FF5F57; }
.cc-tl--min { background: #FEBC2E; }
.cc-tl--max { background: #28C840; }

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
  cursor: text;
  color: var(--text-muted);
}

.cc-search-placeholder {
  flex: 1;
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
  justify-content: space-between;
  padding: 12px 14px 4px;
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.cc-sessions-count {
  color: var(--text-faint);
}

.cc-sessions-list {
  overflow-y: auto;
  padding: 2px 8px 8px;
  min-height: 0;
  flex: 1;
}

.cc-session-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 1px;
  transition: background 0.1s;
}

.cc-session-row:hover {
  background: var(--bg-hover);
}

.cc-session-row.active {
  background: var(--vibrancy-strong);
}

.cc-session-title {
  flex: 1;
  font-size: 12.5px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cc-session-row.active .cc-session-title {
  color: var(--text-primary);
  font-weight: 500;
}

.cc-session-time {
  font-size: 10.5px;
  color: var(--text-faint);
  flex-shrink: 0;
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
  flex-shrink: 0;
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
