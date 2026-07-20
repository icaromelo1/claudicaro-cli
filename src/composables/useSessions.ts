import { shallowRef, ref } from 'vue'
import type { SessionSummary, SessionGroup, OrchestratorConfig } from 'src/types/icarus'

const sessions = shallowRef<SessionSummary[]>([])
const groups = shallowRef<SessionGroup[]>([])
const currentSessionId = ref<string | null>(null)

export function useSessions() {
  async function loadSessions() {
    sessions.value = await window.icarus.session.list()
  }

  async function loadGroups() {
    groups.value = await window.icarus.group.list()
  }

  async function createSession(opts: { title?: string; config?: OrchestratorConfig }) {
    const orchestratorConfig = opts.config ? JSON.stringify(opts.config) : undefined
    const { id, title } = await window.icarus.session.create(opts.title, orchestratorConfig)
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
    const current = sessions.value.find((s) => s.id === currentSessionId.value)
    if (current && current.messageCount === 0 && current.id !== id) {
      await deleteSession(current.id)
    }
    currentSessionId.value = id
  }

  async function deleteSession(id: string) {
    await window.icarus.session.delete(id)
    sessions.value = sessions.value.filter((s) => s.id !== id)
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0]?.id ?? null
    }
  }

  async function renameSession(id: string, title: string) {
    await window.icarus.session.rename(id, title)
    sessions.value = sessions.value.map((s) =>
      s.id === id ? { ...s, title } : s
    )
  }

  async function pinSession(id: string, pinned: boolean) {
    await window.icarus.session.pin(id, pinned)
    sessions.value = sessions.value.map((s) =>
      s.id === id ? { ...s, pinnedAt: pinned ? new Date() : undefined } : s
    )
  }

  async function searchSessions(query: string): Promise<SessionSummary[]> {
    return window.icarus.session.search(query)
  }

  async function createGroup(name: string, color?: string): Promise<SessionGroup> {
    const group = await window.icarus.group.create(name, color)
    groups.value = [...groups.value, group]
    return group
  }

  async function moveToGroup(sessionId: string, groupId: string | null) {
    await window.icarus.session.moveGroup(sessionId, groupId)
    sessions.value = sessions.value.map((s) =>
      s.id === sessionId ? { ...s, groupId: groupId ?? undefined } : s
    )
  }

  return {
    sessions,
    groups,
    currentSessionId,
    loadSessions,
    loadGroups,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    pinSession,
    searchSessions,
    createGroup,
    moveToGroup,
  }
}
