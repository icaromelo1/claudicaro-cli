<template>
  <q-layout view="lHh lpR lFf" class="cc-app">
    <q-page-container>
      <q-page class="cc-workflow-page">
        <WorkflowViewer
          :active-cli="activeCli"
          :session-id="sessionId"
        />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import WorkflowViewer from 'src/components/WorkflowViewer.vue'

const activeCli = ref('')
const sessionId = ref('')

onMounted(async () => {
  // Resolve active CLI from health check
  try {
    const health = await window.claudicaro.health()
    const cliOrder: string[] = ['claude', 'gemini', 'copilot']
    for (const cli of cliOrder) {
      if (health[cli]?.available) {
        activeCli.value = cli
        break
      }
    }
  } catch {
    // silently ignore — activeCli stays empty
  }

  // Resolve current session (first in list)
  try {
    const sessions = await window.claudicaro.session.list()
    if (sessions.length > 0 && sessions[0]) {
      sessionId.value = sessions[0].id
    }
  } catch {
    // silently ignore
  }
})
</script>

<style scoped>
.cc-app {
  background: var(--bg-base);
}

.cc-workflow-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-canvas);
  overflow: hidden;
}
</style>
