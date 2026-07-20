<template>
  <Teleport to="body">
    <div class="cc-modal-overlay" @click.self="emit('close')">
      <div class="cc-modal" @click.stop>
        <button class="cc-modal-close" @click="emit('close')" title="Fechar">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 4l8 8M12 4l-8 8"/>
          </svg>
        </button>

        <!-- Avatar + info -->
        <div class="cc-profile-avatar">{{ initial }}</div>
        <div class="cc-profile-name">{{ user?.name ?? 'Usuário' }}</div>
        <div class="cc-profile-email">{{ user?.email ?? '—' }}</div>

        <!-- Actions -->
        <div class="cc-profile-actions">
          <button class="cc-profile-btn cc-profile-btn--danger" @click="handleSignOut">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M11 11l3-3-3-3M14 8H6"/>
            </svg>
            Sair
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import type { GoogleUser } from 'src/types/icarus'

const emit = defineEmits<{ close: [] }>()
const router = useRouter()

const user = ref<GoogleUser | null>(null)

onMounted(async () => {
  try {
    const state = await window.claudicaro.auth.getState()
    user.value = state.user
  } catch {
    // auth not available
  }

  document.addEventListener('keydown', handleKey)
})

onBeforeUnmount(() => document.removeEventListener('keydown', handleKey))

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

const initial = computed(() => {
  const name = user.value?.name ?? 'I'
  return name.charAt(0).toUpperCase()
})

async function handleSignOut() {
  await window.claudicaro.auth.signOut()
  emit('close')
  await router.push('/auth')
}
</script>

<style scoped>
.cc-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cc-modal {
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 32px 28px 24px;
  width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.cc-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s;
}

.cc-modal-close:hover {
  background: var(--bg-hover);
}

.cc-profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5187F2, #7C5CFF);
  display: grid;
  place-items: center;
  font-size: 22px;
  font-weight: 700;
  color: white;
  margin-bottom: 4px;
}

.cc-profile-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.cc-profile-email {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.cc-profile-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
}

.cc-profile-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-secondary);
}

.cc-profile-btn:hover {
  background: var(--bg-hover);
}

.cc-profile-btn--danger {
  border-color: rgba(255, 80, 80, 0.3);
  color: var(--error);
}

.cc-profile-btn--danger:hover {
  background: rgba(255, 80, 80, 0.08);
}
</style>
