<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="modelValue" class="cc-drawer-overlay" @click.self="emit('update:modelValue', false)">
        <div class="cc-drawer" @click.stop>
          <div class="cc-drawer-header">
            <div class="cc-drawer-title-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="9" width="6" height="6" rx="1"/>
                <rect x="15" y="3" width="6" height="6" rx="1"/>
                <rect x="15" y="15" width="6" height="6" rx="1"/>
                <path d="M9 12h3M12 12V6h3M12 12v6h3"/>
              </svg>
              <span class="cc-drawer-title">Workflow</span>
              <span v-if="sessionTitle" class="cc-drawer-subtitle">{{ sessionTitle }}</span>
            </div>
            <button class="cc-drawer-close" @click="emit('update:modelValue', false)" title="Fechar">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M4 4l8 8M12 4l-8 8"/>
              </svg>
            </button>
          </div>
          <div class="cc-drawer-body">
            <WorkflowViewer v-if="sessionId" :session-id="sessionId" :compact="false" />
            <div v-else class="cc-drawer-empty">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="9" width="6" height="6" rx="1"/>
                <rect x="15" y="3" width="6" height="6" rx="1"/>
                <rect x="15" y="15" width="6" height="6" rx="1"/>
                <path d="M9 12h3M12 12V6h3M12 12v6h3"/>
              </svg>
              <p>Selecione uma conversa para ver o workflow</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import WorkflowViewer from './WorkflowViewer.vue'
import { useSessions } from 'src/composables/useSessions'

const props = defineProps<{
  modelValue: boolean
  sessionId?: string | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { sessions } = useSessions()

const sessionTitle = computed(() => {
  if (!props.sessionId) return null
  return sessions.value.find((s) => s.id === props.sessionId)?.title ?? null
})

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) emit('update:modelValue', false)
}

onMounted(() => document.addEventListener('keydown', handleKey))
onBeforeUnmount(() => document.removeEventListener('keydown', handleKey))
</script>

<style scoped>
.cc-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
}

.cc-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  background: var(--bg-canvas);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.25);
}

.cc-drawer-header {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.cc-drawer-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
}

.cc-drawer-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.cc-drawer-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.cc-drawer-close {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s;
}

.cc-drawer-close:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.cc-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.cc-drawer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  color: var(--text-muted);
  opacity: 0.5;
}

.cc-drawer-empty p {
  font-size: 13px;
  margin: 0;
}

/* Transition */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-enter-active .cc-drawer,
.drawer-leave-active .cc-drawer {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .cc-drawer,
.drawer-leave-to .cc-drawer {
  transform: translateX(100%);
}
</style>
