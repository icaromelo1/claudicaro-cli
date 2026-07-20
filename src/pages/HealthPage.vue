<template>
  <q-layout view="lHh lpR lFf" class="cc-app">
    <q-page-container>
      <q-page class="cc-health-page">
        <!-- Header -->
        <div class="cc-health-header">
          <span class="cc-health-title">Observabilidade</span>
          <q-btn
            flat
            dense
            icon="refresh"
            class="cc-icon-btn"
            :loading="refreshing"
            @click="refresh"
          />
        </div>

        <q-scroll-area class="cc-health-content">
          <div class="cc-health-inner">
            <!-- CLI cards grid -->
            <div class="cc-cards-grid">
              <div
                v-for="cli in CLI_LIST"
                :key="cli.key"
                class="cc-cli-card"
              >
                <div class="cc-cli-card-header">
                  <span class="cc-dot" :style="{ background: `var(--cli-${cli.key})` }" />
                  <span class="cc-cli-card-name" :style="{ color: `var(--cli-${cli.key})` }">
                    {{ cli.label }}
                  </span>
                  <span
                    class="cc-status-badge"
                    :class="statusClass(cli.key)"
                  >
                    {{ statusLabel(cli.key) }}
                  </span>
                </div>
                <div class="cc-cli-card-body">
                  <div class="cc-cli-info-row">
                    <span class="cc-label">Versão</span>
                    <span class="cc-value">{{ healthData[cli.key]?.version ?? '—' }}</span>
                  </div>
                  <div v-if="healthData[cli.key]?.error" class="cc-cli-info-row cc-error-row">
                    <span class="cc-label">Erro</span>
                    <span class="cc-value cc-error-text">{{ healthData[cli.key]?.error }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Logs table -->
            <div class="cc-logs-section">
              <span class="cc-section-title">Logs recentes</span>
              <div class="cc-logs-table-wrap">
                <table class="cc-logs-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Evento</th>
                      <th>CLI</th>
                      <th>Latência</th>
                      <th>Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="logs.length === 0">
                      <td colspan="5" class="cc-empty-row">Nenhum log registrado</td>
                    </tr>
                    <tr
                      v-for="(log, idx) in logs"
                      :key="idx"
                      :class="rowClass(log.level)"
                    >
                      <td class="cc-mono">{{ formatTs(log.timestamp) }}</td>
                      <td>
                        <span class="cc-event-tag" :class="`cc-event-${levelClass(log.level)}`">
                          {{ log.event }}
                        </span>
                      </td>
                      <td>
                        <span v-if="log.cli" class="cc-dot cc-dot-sm" :style="{ background: `var(--cli-${log.cli})` }" />
                        <span v-if="log.cli" class="cc-cli-label">{{ log.cli }}</span>
                        <span v-else class="cc-muted">—</span>
                      </td>
                      <td class="cc-mono">
                        <span v-if="log.latencyMs != null">{{ log.latencyMs }}ms</span>
                        <span v-else class="cc-muted">—</span>
                      </td>
                      <td class="cc-error-cell">
                        <span v-if="log.error" class="cc-error-text cc-mono">{{ log.error }}</span>
                        <span v-else class="cc-muted">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </q-scroll-area>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { LogEntry } from 'src/types/claudicaro'

interface HealthRecord {
  available: boolean
  version?: string
  error?: string
}

const CLI_LIST = [
  { key: 'claude', label: 'Claude' },
  { key: 'agy', label: 'Agy' },
  { key: 'copilot', label: 'Copilot' },
]

const healthData = ref<Record<string, HealthRecord>>({})
const logs = ref<LogEntry[]>([])
const refreshing = ref(false)

let autoRefreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await refresh()
  autoRefreshTimer = setInterval(() => { void refresh() }, 30_000)
})

onUnmounted(() => {
  if (autoRefreshTimer !== null) clearInterval(autoRefreshTimer)
})

async function refresh() {
  refreshing.value = true
  try {
    const [health, entries] = await Promise.all([
      window.claudicaro.health(),
      window.claudicaro.logs(100),
    ])
    healthData.value = health as Record<string, HealthRecord>
    logs.value = entries
  } finally {
    refreshing.value = false
  }
}

function statusClass(cli: string): string {
  const h = healthData.value[cli]
  if (!h) return 'cc-status-unknown'
  return h.available ? 'cc-status-online' : 'cc-status-offline'
}

function statusLabel(cli: string): string {
  const h = healthData.value[cli]
  if (!h) return 'desconhecido'
  return h.available ? 'online' : 'offline'
}

function levelClass(level: LogEntry['level']): string {
  return level
}

function rowClass(level: LogEntry['level']): string {
  if (level === 'error') return 'cc-row-error'
  if (level === 'warn') return 'cc-row-warn'
  return ''
}

function formatTs(ts: Date | string): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })
}
</script>

<style scoped>
.cc-app {
  background: var(--bg-base);
}

.cc-health-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-canvas);
}

.cc-health-header {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--s-4);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.cc-health-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.cc-icon-btn {
  color: var(--text-muted) !important;
  -webkit-app-region: no-drag;
}

.cc-health-content {
  flex: 1;
}

.cc-health-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--s-6) var(--s-6);
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
}

/* Cards */
.cc-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s-4);
}

.cc-cli-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: var(--s-4);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.cc-cli-card-header {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.cc-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cc-dot-sm {
  width: 6px;
  height: 6px;
  vertical-align: middle;
  margin-right: 4px;
}

.cc-cli-card-name {
  font-size: var(--fs-md);
  font-weight: 600;
  flex: 1;
}

.cc-status-badge {
  font-size: var(--fs-xs);
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--r-full);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cc-status-online {
  background: rgba(63, 207, 142, 0.14);
  color: var(--success);
}

.cc-status-offline {
  background: rgba(242, 109, 109, 0.14);
  color: var(--error);
}

.cc-status-unknown {
  background: var(--vibrancy-strong);
  color: var(--text-muted);
}

.cc-cli-card-body {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}

.cc-cli-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--s-2);
}

.cc-label {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.cc-value {
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.cc-error-row .cc-value {
  color: var(--error);
  word-break: break-all;
  text-align: right;
  max-width: 160px;
}

/* Logs section */
.cc-logs-section {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.cc-section-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.cc-logs-table-wrap {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.cc-logs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-xs);
}

.cc-logs-table thead tr {
  background: var(--bg-elevated);
}

.cc-logs-table th {
  text-align: left;
  padding: var(--s-2) var(--s-3);
  color: var(--text-muted);
  font-weight: 500;
  font-size: var(--fs-xs);
  border-bottom: 1px solid var(--border-subtle);
  white-space: nowrap;
}

.cc-logs-table td {
  padding: var(--s-2) var(--s-3);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.cc-logs-table tbody tr:last-child td {
  border-bottom: none;
}

.cc-logs-table tbody tr:hover {
  background: var(--bg-hover);
}

.cc-row-error {
  background: rgba(242, 109, 109, 0.06);
}

.cc-row-warn {
  background: rgba(245, 165, 36, 0.06);
}

.cc-empty-row {
  text-align: center;
  color: var(--text-faint);
  padding: var(--s-6) !important;
}

.cc-mono {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
}

.cc-event-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--r-xs);
  font-family: var(--font-mono);
  font-size: 10px;
}

.cc-event-info {
  background: rgba(81, 135, 242, 0.12);
  color: var(--info);
}

.cc-event-warn {
  background: rgba(245, 165, 36, 0.12);
  color: var(--warning);
}

.cc-event-error {
  background: rgba(242, 109, 109, 0.12);
  color: var(--error);
}

.cc-cli-label {
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  vertical-align: middle;
}

.cc-muted {
  color: var(--text-faint);
}

.cc-error-cell {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cc-error-text {
  color: var(--error);
}
</style>
