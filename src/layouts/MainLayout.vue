<template>
  <div class="cc-layout">
    <AppSidebar
      :show-sessions="route.path === '/'"
      :expanded="sidebarExpanded"
      @new-session="handleNewSession"
      @toggle="sidebarExpanded = !sidebarExpanded"
    />
    <div class="cc-layout-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from 'src/components/AppSidebar.vue'
import { useSessions } from 'src/composables/useSessions'

const route = useRoute()
const { createSession } = useSessions()
const sidebarExpanded = ref(true)

async function handleNewSession() {
  await createSession({ title: 'Nova conversa' })
}
</script>

<style scoped>
.cc-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: var(--bg-base);
  overflow: hidden;
}

.cc-layout-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
