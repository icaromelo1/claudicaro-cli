import { shallowRef, ref } from 'vue'
import type { SessionSummary, OrchestratorConfig } from 'src/types/claudicaro'

const sessions = shallowRef<SessionSummary[]>([])
const currentSessionId = ref<string | null>(null)

export function useSessions() {
  async function loadSessions() {
    sessions.value = await window.claudicaro.session.list()
  }

  async function createSession(opts: { title?: string; config?: OrchestratorConfig }) {
    const orchestratorConfig = opts.config ? JSON.stringify(opts.config) : undefined
    const { id, title } = await window.claudicaro.session.create(opts.title, orchestratorConfig)
    const newSession: SessionSummary = {
      id,
      title,
      createdAt: new Date(),
      messageCount: 0,
      orchestratorConfig: orchestratorConfig,
    }
    sessions.value = [newSession, ...sessions.value]
    currentSessionId.value = id
    return newSession
  }

  async function selectSession(id: string) {
    currentSessionId.value = id
  }

  async function deleteSession(id: string) {
    // TODO: window.claudicaro.session.delete não está no tipo atual
    await (window.claudicaro.session as any).delete(id)
    sessions.value = sessions.value.filter((s) => s.id !== id)
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0]?.id ?? null
    }
  }

  return { sessions, currentSessionId, loadSessions, createSession, selectSession, deleteSession }
}
