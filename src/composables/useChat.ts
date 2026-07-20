import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import type { MessageRecord, DispatchResult } from 'src/types/icarus'
import { useSessions } from './useSessions'

export function useChat(scrollToBottom?: () => void) {
  const { sessions, currentSessionId } = useSessions()

  const messages = ref<MessageRecord[]>([])
  const isLoading = ref(false)
  const loadingCli = ref<string>('claude')
  const streamingContent = ref('')
  const activeClis = ref(['claude', 'agy', 'copilot'])

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
    messages.value = await window.icarus.session.history(sessionId)
  }

  watch(currentSessionId, async (id) => {
    messages.value = []
    if (id) {
      await loadHistory(id)
      nextTick(() => scrollToBottom?.())
    }
  })

  onMounted(() => {
    unsubscribeToken = window.icarus.onToken((chunk, sessionId) => {
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
      const result: DispatchResult = await window.icarus.dispatch(content, currentSessionId.value, forceCli)

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
      const e = err as Error & { userMessage?: string; rawOutput?: string }
      const userMsg: string = e.userMessage ?? e.message
      const raw: string | undefined = e.rawOutput
      const content = raw ? `${userMsg}\n\n---\n*Saída completa:* \`\`\`\n${raw}\n\`\`\`` : userMsg
      messages.value.push({
        id: (Date.now() + 1).toString(),
        sessionId: currentSessionId.value,
        role: 'assistant',
        content,
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

  function cancelDispatch() {
    if (currentSessionId.value) {
      void window.icarus.cancel(currentSessionId.value)
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
    cancelDispatch,
  }
}
