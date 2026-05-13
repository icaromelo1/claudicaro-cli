import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import type { MessageRecord, DispatchResult } from 'src/types/claudicaro'
import { useSessions } from './useSessions'

export function useChat(scrollToBottom?: () => void) {
  const { sessions, currentSessionId } = useSessions()

  const messages = ref<MessageRecord[]>([])
  const isLoading = ref(false)
  const loadingCli = ref<string>('claude')
  const streamingContent = ref('')
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

  async function loadHistory(sessionId: string) {
    messages.value = await window.claudicaro.session.history(sessionId)
  }

  watch(currentSessionId, async (id) => {
    messages.value = []
    if (id) {
      await loadHistory(id)
      nextTick(() => scrollToBottom?.())
    }
  })

  onMounted(() => {
    unsubscribeToken = window.claudicaro.onToken((chunk, sessionId) => {
      if (sessionId === currentSessionId.value) {
        streamingContent.value += chunk
        nextTick(() => scrollToBottom?.())
      }
    })
  })

  onUnmounted(() => {
    unsubscribeToken?.()
  })

  async function sendMessage(content: string, mode?: string) {
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
    const forceCli = mode && mode !== 'auto' ? mode : undefined
    if (forceCli) loadingCli.value = forceCli

    await nextTick()
    scrollToBottom?.()

    try {
      const result: DispatchResult = await window.claudicaro.dispatch(content, currentSessionId.value, forceCli)

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
        cli: loadingCli.value,
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
    activeClis,
    currentSession,
    streamingMessage,
    sendMessage,
  }
}
