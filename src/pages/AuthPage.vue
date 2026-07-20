<template>
  <div class="auth-page">
    <div class="auth-card">
      <!-- Logo e subtítulo -->
      <div class="auth-header">
        <span class="auth-logo">Claudicaro</span>
        <span class="auth-subtitle">Seu hub de IAs, em um só lugar</span>
      </div>

      <!-- Estado autenticado -->
      <div v-if="authState?.user" class="auth-user">
        <img
          :src="authState.user.picture"
          :alt="authState.user.name"
          class="auth-avatar"
          referrerpolicy="no-referrer"
        />
        <div class="auth-user-info">
          <span class="auth-user-name">{{ authState.user.name }}</span>
          <span class="auth-user-email">{{ authState.user.email }}</span>
        </div>
        <button class="auth-btn auth-btn--secondary" @click="handleSignOut">
          Sair
        </button>
      </div>

      <!-- Estado não autenticado -->
      <div v-else class="auth-actions">
        <button
          class="auth-btn auth-btn--google"
          :disabled="loading"
          @click="handleSignIn"
        >
          <span v-if="loading" class="auth-spinner" aria-hidden="true" />
          <svg
            v-else
            class="auth-google-icon"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {{ loading ? 'Aguardando...' : 'Entrar com Google' }}
        </button>

        <p v-if="errorMsg" class="auth-error">{{ errorMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { AuthState } from 'src/types/icarus'

const router = useRouter()
const authState = ref<AuthState | null>(null)
const loading = ref(false)
const errorMsg = ref<string | null>(null)

onMounted(async () => {
  authState.value = await window.icarus.auth.getState()
  if (authState.value?.user) {
    void router.push('/')
  }
})

async function handleSignIn() {
  loading.value = true
  errorMsg.value = null
  try {
    await window.icarus.auth.signIn()
    authState.value = await window.icarus.auth.getState()
    void router.push('/')
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha na autenticação'
  } finally {
    loading.value = false
  }
}

async function handleSignOut() {
  await window.icarus.auth.signOut()
  authState.value = await window.icarus.auth.getState()
}
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-base);
  padding: var(--s-6);
}

.auth-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-7);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  padding: var(--s-9) var(--s-8);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
}

.auth-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
  text-align: center;
}

.auth-logo {
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.auth-subtitle {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.auth-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
  width: 100%;
}

.auth-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-2);
  height: 40px;
  padding: 0 var(--s-5);
  border-radius: var(--r-md);
  font-size: var(--fs-base);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  border: none;
  outline: none;
  width: 100%;
}

.auth-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-btn--google {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.auth-btn--google:hover:not(:disabled) {
  background: var(--bg-hover);
}

.auth-btn--secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  width: auto;
  font-size: var(--fs-sm);
  height: 32px;
  padding: 0 var(--s-4);
}

.auth-btn--secondary:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.auth-google-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.auth-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-error {
  font-size: var(--fs-xs);
  color: var(--error);
  text-align: center;
  margin: 0;
}

/* Estado autenticado */
.auth-user {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  width: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: var(--s-3) var(--s-4);
}

.auth-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--r-full);
  object-fit: cover;
  flex-shrink: 0;
}

.auth-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.auth-user-name {
  font-size: var(--fs-base);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auth-user-email {
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
