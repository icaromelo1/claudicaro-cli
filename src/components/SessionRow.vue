<template>
  <div
    class="cc-session-row"
    :class="{ active: isActive }"
    @click="handleClick"
  >
    <span class="cc-dot" />
    <!-- Rename inline -->
    <input
      v-if="renaming"
      ref="renameInput"
      v-model="renameValue"
      class="cc-session-rename-input"
      @keydown.enter.prevent="commitRename"
      @keydown.escape.prevent="renaming = false"
      @blur="commitRename"
      @click.stop
    />
    <span v-else class="cc-session-title">{{ session.title }}</span>
    <svg v-if="session.pinnedAt && !renaming" class="cc-pin-icon" width="9" height="9" viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.5 1.5a1 1 0 0 1 1.5 0l3.5 3.5a1 1 0 0 1 0 1.5L12.3 8.2a1 1 0 0 1-.4.2L10 8.9l-4 4-.3.3H4.6L3 14.7l-.7-.7 1.5-1.6v-1l.3-.3 4-4 .5-1.9c0-.14.08-.28.2-.4L9.5 1.5z"/>
    </svg>
    <span v-if="!renaming" class="cc-session-time">{{ formatTime(session.createdAt) }}</span>
    <button
      v-if="!renaming"
      class="cc-session-more"
      title="Opções"
      @click.stop="openMenu"
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="3" cy="8" r="1.1" fill="currentColor"/>
        <circle cx="8" cy="8" r="1.1" fill="currentColor"/>
        <circle cx="13" cy="8" r="1.1" fill="currentColor"/>
      </svg>
    </button>

    <!-- Context menu -->
    <div v-if="menuOpen" class="cc-session-menu" @click.stop>
      <button class="cc-menu-item" @click="startRename">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 2l3 3-8 8H3v-3L11 2z"/>
        </svg>
        Renomear
      </button>
      <button class="cc-menu-item" @click="togglePin">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 2l5 5-3 1-4 4v3H6v-3L2 9l1-3 6-4z"/>
        </svg>
        {{ session.pinnedAt ? 'Desafixar' : 'Fixar' }}
      </button>

      <!-- Mover para grupo -->
      <div class="cc-menu-separator" />
      <div class="cc-menu-sub-header">Mover para grupo</div>
      <button
        v-if="session.groupId"
        class="cc-menu-item"
        @click="emit('move-group', session.id, null)"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <path d="M4 4l8 8M12 4l-8 8"/>
        </svg>
        Remover do grupo
      </button>
      <button
        v-for="group in groups"
        :key="group.id"
        class="cc-menu-item"
        :class="{ 'cc-menu-item--active': session.groupId === group.id }"
        @click="emit('move-group', session.id, group.id)"
      >
        <span class="cc-group-dot" :style="{ background: group.color }" />
        {{ group.name }}
      </button>
      <button class="cc-menu-item cc-menu-item--create" @click="createGroupAndMove">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <path d="M8 3v10M3 8h10"/>
        </svg>
        Criar novo grupo
      </button>

      <div class="cc-menu-separator" />
      <button class="cc-menu-item cc-menu-item--danger" @click="emit('delete', session.id)">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"/>
        </svg>
        Excluir
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import type { SessionSummary, SessionGroup } from 'src/types/icarus'

const props = defineProps<{
  session: SessionSummary
  isActive: boolean
  groups: SessionGroup[]
}>()

const emit = defineEmits<{
  select: []
  rename: [id: string, title: string]
  pin: [id: string, pinned: boolean]
  'move-group': [sessionId: string, groupId: string | null]
  delete: [id: string]
}>()

const menuOpen = ref(false)
const renaming = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement>()

function handleClick() {
  if (!menuOpen.value && !renaming.value) emit('select')
}

function openMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function startRename() {
  closeMenu()
  renameValue.value = props.session.title
  renaming.value = true
  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}

function commitRename() {
  if (!renaming.value) return
  renaming.value = false
  const title = renameValue.value.trim()
  if (title && title !== props.session.title) {
    emit('rename', props.session.id, title)
  }
}

function togglePin() {
  closeMenu()
  emit('pin', props.session.id, !props.session.pinnedAt)
}

async function createGroupAndMove() {
  closeMenu()
  const name = window.prompt('Nome do novo grupo:')
  if (!name?.trim()) return
  const group = await window.icarus.group.create(name.trim())
  emit('move-group', props.session.id, group.id)
}

function formatTime(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function handleOutsideClick() {
  if (menuOpen.value) closeMenu()
}

onMounted(() => document.addEventListener('click', handleOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', handleOutsideClick))
</script>

<style scoped>
.cc-session-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 1px;
  transition: background 0.1s;
  position: relative;
}

.cc-session-row:hover {
  background: var(--bg-hover);
}

.cc-session-row.active {
  background: var(--vibrancy-strong);
}

.cc-session-row:hover .cc-session-more {
  opacity: 1;
}

.cc-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
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

.cc-pin-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.cc-session-time {
  font-size: 10.5px;
  color: var(--text-faint);
  flex-shrink: 0;
}

.cc-session-rename-input {
  flex: 1;
  background: var(--bg-surface);
  border: 1px solid var(--accent);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12.5px;
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
}

.cc-session-more {
  opacity: 0;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, opacity 0.15s;
}

.cc-session-more:hover {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

/* Context menu */
.cc-session-menu {
  position: absolute;
  top: calc(100% + 2px);
  right: 0;
  z-index: 200;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  padding: 4px;
  min-width: 180px;
}

.cc-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  background: none;
  border: none;
  border-radius: 5px;
  font-size: 12.5px;
  color: var(--text-secondary);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s, color 0.12s;
}

.cc-menu-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.cc-menu-item--active {
  color: var(--accent);
}

.cc-menu-item--danger {
  color: var(--error);
}

.cc-menu-item--danger:hover {
  background: rgba(255, 80, 80, 0.1);
  color: var(--error);
}

.cc-menu-item--create {
  color: var(--text-muted);
  font-style: italic;
}

.cc-menu-separator {
  height: 1px;
  background: var(--border-subtle);
  margin: 3px 4px;
}

.cc-menu-sub-header {
  font-size: 10px;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  font-weight: 600;
}

.cc-group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
