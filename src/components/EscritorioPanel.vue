<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="modelValue" class="cc-drawer-overlay" @click.self="emit('update:modelValue', false)">
        <div class="cc-drawer cc-escritorio" @click.stop>
          <div class="cc-drawer-header">
            <div class="cc-drawer-title-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7l9-4 9 4-9 4-9-4z"/>
                <path d="M3 7v10l9 4 9-4V7"/>
                <path d="M12 11v10"/>
              </svg>
              <span class="cc-drawer-title">Escritório</span>
            </div>
            <div class="cc-escritorio-actions">
              <button
                class="cc-escritorio-reload"
                :disabled="indisponivel || carregando"
                title="Recarregar"
                @click="recarregar"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" :class="{ 'cc-escritorio-reload-icon--spin': carregando }">
                  <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9"/>
                  <path d="M13.5 2.5V6h-3.5"/>
                </svg>
              </button>
              <button class="cc-drawer-close" @click="emit('update:modelValue', false)" title="Fechar">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M4 4l8 8M12 4l-8 8"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="cc-drawer-body">
            <div v-if="indisponivel" class="cc-drawer-empty">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7l9-4 9 4-9 4-9-4z"/>
                <path d="M3 7v10l9 4 9-4V7"/>
              </svg>
              <p>O Escritório não está instalado nesta máquina.</p>
            </div>

            <template v-else>
              <section class="cc-escritorio-secao">
                <h3 class="cc-escritorio-secao-titulo">Quem está no escritório</h3>

                <div v-if="presentesSeparados.cards.length === 0 && presentesSeparados.externos.length === 0" class="cc-escritorio-vazio">
                  ninguém visto na última hora
                </div>

                <template v-else>
                  <div v-if="presentesSeparados.cards.length > 0" class="cc-escritorio-grupo">
                    <span class="cc-escritorio-grupo-label">Cards deste app</span>
                    <div class="cc-escritorio-chips">
                      <span v-for="nome in presentesSeparados.cards" :key="`card-${nome}`" class="cc-escritorio-chip cc-escritorio-chip--card">
                        {{ nome }}
                      </span>
                    </div>
                  </div>

                  <div v-if="presentesSeparados.externos.length > 0" class="cc-escritorio-grupo">
                    <span class="cc-escritorio-grupo-label">Sessões e especialistas</span>
                    <div class="cc-escritorio-chips">
                      <span v-for="nome in presentesSeparados.externos" :key="`externo-${nome}`" class="cc-escritorio-chip">
                        {{ nome }}
                      </span>
                    </div>
                  </div>
                </template>
              </section>

              <section class="cc-escritorio-secao">
                <h3 class="cc-escritorio-secao-titulo">Threads abertas</h3>

                <div v-if="threadsAbertas.length === 0" class="cc-escritorio-vazio">
                  nenhuma conversa aberta
                </div>

                <ul v-else class="cc-escritorio-lista">
                  <li v-for="thread in threadsAbertas" :key="thread.id" class="cc-escritorio-item">
                    <div class="cc-escritorio-item-linha">
                      <span class="cc-escritorio-item-titulo">{{ thread.assunto }}</span>
                      <span
                        class="cc-escritorio-folego"
                        :class="`cc-escritorio-folego--${folegoDaThread(thread.hops)}`"
                        :title="`${thread.hops} hop(s) restante(s)`"
                      >
                        {{ thread.hops }} hop{{ thread.hops === 1 ? '' : 's' }}
                      </span>
                    </div>
                    <span class="cc-escritorio-item-sub">dono: {{ thread.dono }}</span>
                  </li>
                </ul>
              </section>

              <section class="cc-escritorio-secao">
                <h3 class="cc-escritorio-secao-titulo">Recursos reivindicados</h3>

                <div v-if="claims.length === 0" class="cc-escritorio-vazio">
                  nada reivindicado
                </div>

                <ul v-else class="cc-escritorio-lista">
                  <li v-for="(claim, idx) in claims" :key="`${claim.recurso}-${idx}`" class="cc-escritorio-item">
                    <div class="cc-escritorio-item-linha">
                      <span class="cc-escritorio-item-titulo">{{ claim.recurso }}</span>
                    </div>
                    <span class="cc-escritorio-item-sub">{{ claim.dono }} · {{ claim.intencao }}</span>
                  </li>
                </ul>
              </section>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import type { EstadoEscritorio } from 'src/types/icarus'
import { separarPresentes, folegoDaThread } from './escritorio-painel'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const indisponivel = ref(false)
const carregando = ref(false)
const estado = ref<EstadoEscritorio | null>(null)

let pararEscuta: (() => void) | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const presentesSeparados = computed(() => separarPresentes(estado.value?.presentes ?? []))
const threadsAbertas = computed(() => estado.value?.threadsAbertas ?? [])
const claims = computed(() => estado.value?.claims ?? [])

async function carregarEstado() {
  carregando.value = true
  try {
    const resultado = await window.icarus.escritorio.estado()
    estado.value = (resultado as EstadoEscritorio | null) ?? null
  } finally {
    carregando.value = false
  }
}

function agendarRecarga() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void carregarEstado()
  }, 300)
}

async function recarregar() {
  if (indisponivel.value) return
  await carregarEstado()
}

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('update:modelValue', false)
}

onMounted(async () => {
  document.addEventListener('keydown', handleKey)

  const disponivel = await window.icarus.escritorio.disponivel()
  if (!disponivel) {
    indisponivel.value = true
    return
  }

  await carregarEstado()
  pararEscuta = window.icarus.escritorio.onEvento(() => agendarRecarga())
})

onBeforeUnmount(() => document.removeEventListener('keydown', handleKey))

onUnmounted(() => {
  if (pararEscuta) pararEscuta()
  if (debounceTimer) clearTimeout(debounceTimer)
})
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

.cc-escritorio-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cc-escritorio-reload,
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

.cc-escritorio-reload:disabled {
  opacity: 0.4;
  cursor: default;
}

.cc-escritorio-reload:not(:disabled):hover,
.cc-drawer-close:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.cc-escritorio-reload-icon--spin {
  animation: cc-escritorio-spin 0.8s linear infinite;
}

@keyframes cc-escritorio-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.cc-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  text-align: center;
}

.cc-escritorio-secao-titulo {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.cc-escritorio-vazio {
  font-size: 12.5px;
  color: var(--text-faint);
  font-style: italic;
}

.cc-escritorio-grupo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.cc-escritorio-grupo:last-child {
  margin-bottom: 0;
}

.cc-escritorio-grupo-label {
  font-size: 11px;
  color: var(--text-faint);
}

.cc-escritorio-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cc-escritorio-chip {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
}

.cc-escritorio-chip--card {
  border-color: var(--border-focus);
  color: var(--text-primary);
}

.cc-escritorio-lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cc-escritorio-item {
  padding: 8px 10px;
  border-radius: var(--r-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cc-escritorio-item-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cc-escritorio-item-titulo {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cc-escritorio-item-sub {
  font-size: 11.5px;
  color: var(--text-muted);
}

.cc-escritorio-folego {
  flex-shrink: 0;
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: var(--r-sm);
  background: var(--bg-surface);
  color: var(--text-muted);
  white-space: nowrap;
}

.cc-escritorio-folego--atencao {
  background: rgba(242, 169, 59, 0.14);
  color: var(--warning);
}

.cc-escritorio-folego--critico {
  background: rgba(242, 84, 91, 0.14);
  color: var(--error);
}

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
