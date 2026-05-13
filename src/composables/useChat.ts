import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import type { SessionSummary, MessageRecord, DispatchResult, OrchestratorConfig } from 'src/types/claudicaro'

export function useChat(scrollToBottom?: () => void) {
  const currentSessionId = ref<string | null>(null)
  const messages = ref<MessageRecord[]>([])
  const isLoading = ref(false)
  const loadingCli = ref<string>('claude')
  const streamingContent = ref('')
  const sessions = ref<SessionSummary[]>([])
  const showConfigModal = ref(false)
  const pendingConfig = ref<OrchestratorConfig | null>(null)
  const activeClis = ref(['claude', 'gemini', 'copilot'])

  const currentSession = computed(() =>
    sessions.value.find(s => s.id === currentSessionId.value)
  )

  const streamingMessage = computed(() => ({
    id: 'streaming',
    sessionId: currentSessionId.value ?? '',
    role: 'assistant' as const,
    content: streamingContent.value,
    cli: loadingCli.value,
    model: '',
    createdAt: new Date(),
  }))

  let unsubscribeToken: (() => void) | null = null

  onMounted(async () => {
    unsubscribeToken = window.claudicaro.onToken((chunk, sessionId) => {
      if (sessionId === currentSessionId.value) {
        streamingContent.value += chunk
        nextTick(() => scrollToBottom?.())
      }
    })
    await loadSessions()
    if (sessions.value.length === 0) {
      showConfigModal.value = true
    } else {
      currentSessionId.value = sessions.value[0]!.id
      await loadHistory(sessions.value[0]!.id)
    }
  })

  onUnmounted(() => {
    unsubscribeToken?.()
  })

  async function loadSessions() {
    sessions.value = await window.claudicaro.session.list()
  }

  async function loadHistory(sessionId: string) {
    messages.value = await window.claudicaro.session.history(sessionId)
  }

  async function newSession() {
    showConfigModal.value = true
  }

  async function onConfigConfirm(config: OrchestratorConfig) {
    showConfigModal.value = false
    pendingConfig.value = config
    const orchestratorConfig = JSON.stringify(config)
    const { id, title } = await window.claudicaro.session.create(undefined, orchestratorConfig)
    sessions.value.unshift({ id, title, createdAt: new Date(), messageCount: 0, orchestratorConfig })
    currentSessionId.value = id
    messages.value = []
  }

  async function selectSession(id: string) {
    currentSessionId.value = id
    messages.value = []
    await loadHistory(id)
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading.value || !currentSessionId.value) return

    const userMsg: MessageRecord = {
      id: Date.now().toString(),
      sessionId: currentSessionId.value,
      role: 'user',
      content,
      createdAt: new Date(),
    }
    messages.value.push(userMsg)

    const session = sessions.value.find(s => s.id === currentSessionId.value)
    if (session) session.messageCount++

    isLoading.value = true
    streamingContent.value = ''

    await nextTick()
    scrollToBottom?.()

    try {
      const result: DispatchResult = await window.claudicaro.dispatch(content, currentSessionId.value)

      loadingCli.value = result.cli

      messages.value.push({
        id: (Date.now() + 1).toString(),
        sessionId: currentSessionId.value,
        role: 'assistant',
        content: result.content,
        cli: result.cli,
        model: result.model,
        routingMeta: result.routingMeta,
        tokens: result.tokens,
        latencyMs: result.latencyMs,
        createdAt: new Date(),
      })

      if (session) session.messageCount++
    } catch (err) {
      messages.value.push({
        id: (Date.now() + 1).toString(),
        sessionId: currentSessionId.value,
        role: 'assistant',
        content: `Erro ao processar: ${(err as Error).message}`,
        cli: 'claude',
        createdAt: new Date(),
      })
    } finally {
      streamingContent.value = ''
      isLoading.value = false
      await nextTick()
      scrollToBottom?.()
    }
  }

  return {
    currentSessionId,
    messages,
    isLoading,
    loadingCli,
    streamingContent,
    sessions,
    showConfigModal,
    pendingConfig,
    activeClis,
    currentSession,
    streamingMessage,
    loadSessions,
    loadHistory,
    newSession,
    onConfigConfirm,
    selectSession,
    sendMessage,
  }
}
