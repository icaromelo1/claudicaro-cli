<template>
  <div class="cc-canvas-toolbar">
    <div class="cc-toolbar-modes">
      <button class="cc-toolbar-add" @click="toggle('terminal')">+ Terminal</button>
      <button class="cc-toolbar-add" @click="toggle('task')">+ Tarefa</button>
      <button class="cc-toolbar-add" @click="toggle('peer')">+ Grupo de pares</button>
    </div>

    <!-- Terminal: só escolher CLI -->
    <div v-if="mode === 'terminal'" class="cc-toolbar-panel">
      <button v-for="cli in TERMINAL_CLIS" :key="cli" class="cc-toolbar-menu-item" @click="createTerminal(cli)">
        {{ cli }}
      </button>
    </div>

    <!-- Tarefa: CLI + prompt -->
    <div v-if="mode === 'task'" class="cc-toolbar-panel cc-toolbar-panel--wide">
      <label class="cc-toolbar-label">CLI</label>
      <div class="cc-toolbar-cli-row">
        <button
          v-for="cli in HEADLESS_CLIS"
          :key="cli"
          class="cc-toolbar-chip"
          :class="{ active: taskCli === cli }"
          @click="taskCli = cli"
        >{{ cli }}</button>
      </div>
      <textarea v-model="taskPrompt" class="cc-toolbar-textarea" placeholder="O que essa tarefa deve fazer?" />
      <button class="cc-toolbar-confirm" :disabled="!taskPrompt.trim()" @click="submitTask">Criar</button>
    </div>

    <!-- Grupo de pares -->
    <div v-if="mode === 'peer'" class="cc-toolbar-panel cc-toolbar-panel--wide">
      <label class="cc-toolbar-label">Membros</label>
      <div v-for="(member, i) in peerMembers" :key="i" class="cc-toolbar-member-row">
        <select v-model="member.cli" class="cc-toolbar-select">
          <option v-for="cli in HEADLESS_CLIS" :key="cli" :value="cli">{{ cli }}</option>
        </select>
        <input v-model="member.label" class="cc-toolbar-input" placeholder="rótulo (ex: Opus-1)" />
        <button v-if="peerMembers.length > 2" class="cc-toolbar-remove" @click="peerMembers.splice(i, 1)">×</button>
      </div>
      <button class="cc-toolbar-add-member" @click="addMember">+ membro</button>

      <label class="cc-toolbar-label">Ordem</label>
      <div class="cc-toolbar-cli-row">
        <button class="cc-toolbar-chip" :class="{ active: peerTurnOrder === 'roundtable' }" @click="peerTurnOrder = 'roundtable'">Mesa-redonda</button>
        <button class="cc-toolbar-chip" :class="{ active: peerTurnOrder === 'round-robin' }" @click="peerTurnOrder = 'round-robin'">Roda-viva</button>
      </div>

      <label class="cc-toolbar-label">Rodadas máximas</label>
      <input v-model.number="peerMaxRounds" type="number" min="1" max="20" class="cc-toolbar-input" />

      <label class="cc-toolbar-label">Prompt de abertura</label>
      <textarea v-model="peerOpeningPrompt" class="cc-toolbar-textarea" placeholder="O que o grupo deve discutir?" />

      <button class="cc-toolbar-confirm" :disabled="!canStartPeer" @click="submitPeer">Iniciar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PeerTurnOrder } from 'src/types/icarus'

const TERMINAL_CLIS = ['claude', 'agy', 'codex', 'copilot']
const HEADLESS_CLIS = ['claude', 'agy', 'copilot']

const emit = defineEmits<{
  'create-terminal': [cli: string]
  'create-task': [cli: string, task: string]
  'create-peer': [members: { cli: string; label: string }[], turnOrder: PeerTurnOrder, maxRounds: number, openingPrompt: string]
}>()

type Mode = 'terminal' | 'task' | 'peer' | null
const mode = ref<Mode>(null)

function toggle(next: Exclude<Mode, null>) {
  mode.value = mode.value === next ? null : next
}

function createTerminal(cli: string) {
  emit('create-terminal', cli)
  mode.value = null
}

const taskCli = ref('claude')
const taskPrompt = ref('')

function submitTask() {
  if (!taskPrompt.value.trim()) return
  emit('create-task', taskCli.value, taskPrompt.value.trim())
  taskPrompt.value = ''
  mode.value = null
}

const peerMembers = ref([
  { cli: 'claude', label: 'Opus-1' },
  { cli: 'claude', label: 'Opus-2' },
])
const peerTurnOrder = ref<PeerTurnOrder>('roundtable')
const peerMaxRounds = ref(5)
const peerOpeningPrompt = ref('')

function addMember() {
  peerMembers.value.push({ cli: 'claude', label: `Opus-${peerMembers.value.length + 1}` })
}

const canStartPeer = computed(() => peerMembers.value.length >= 2 && peerOpeningPrompt.value.trim().length > 0)

function submitPeer() {
  if (!canStartPeer.value) return
  emit('create-peer', peerMembers.value.map((m) => ({ ...m })), peerTurnOrder.value, peerMaxRounds.value, peerOpeningPrompt.value.trim())
  peerOpeningPrompt.value = ''
  mode.value = null
}
</script>

<style scoped>
.cc-canvas-toolbar {
  position: absolute;
  top: var(--s-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
}

.cc-toolbar-modes {
  display: flex;
  gap: var(--s-2);
}

.cc-toolbar-add {
  padding: var(--s-2) var(--s-4);
  border-radius: var(--r-full);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-size: var(--fs-sm);
  font-family: var(--font-sans);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  white-space: nowrap;
}

.cc-toolbar-add:hover {
  background: var(--bg-hover);
}

.cc-toolbar-panel {
  display: flex;
  flex-direction: column;
  min-width: 160px;
  border-radius: var(--r-md);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  padding: var(--s-2);
  gap: var(--s-2);
}

.cc-toolbar-panel--wide {
  min-width: 280px;
}

.cc-toolbar-menu-item {
  padding: var(--s-2) var(--s-3);
  border: none;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-primary);
  font-size: var(--fs-sm);
  text-transform: capitalize;
  text-align: left;
  cursor: pointer;
}

.cc-toolbar-menu-item:hover {
  background: var(--bg-hover);
}

.cc-toolbar-label {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  margin-top: var(--s-1);
}

.cc-toolbar-cli-row {
  display: flex;
  gap: var(--s-1);
  flex-wrap: wrap;
}

.cc-toolbar-chip {
  padding: 3px 10px;
  border-radius: var(--r-full);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: var(--fs-xs);
  text-transform: capitalize;
  cursor: pointer;
}

.cc-toolbar-chip.active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
}

.cc-toolbar-textarea {
  min-height: 60px;
  padding: var(--s-2);
  border-radius: var(--r-sm);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  resize: vertical;
}

.cc-toolbar-input,
.cc-toolbar-select {
  padding: 4px 8px;
  border-radius: var(--r-sm);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: var(--fs-sm);
  font-family: var(--font-sans);
}

.cc-toolbar-member-row {
  display: flex;
  gap: var(--s-1);
  align-items: center;
}

.cc-toolbar-member-row .cc-toolbar-input {
  flex: 1;
}

.cc-toolbar-remove {
  border: none;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  font-size: 14px;
}

.cc-toolbar-add-member {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: var(--fs-xs);
  cursor: pointer;
  padding: var(--s-1) 0;
}

.cc-toolbar-confirm {
  margin-top: var(--s-2);
  padding: var(--s-2);
  border-radius: var(--r-sm);
  border: none;
  background: var(--accent);
  color: var(--bg-base);
  font-weight: 600;
  font-size: var(--fs-sm);
  cursor: pointer;
}

.cc-toolbar-confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
