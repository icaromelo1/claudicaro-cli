<template>
  <div
    ref="viewport"
    class="cc-canvas-viewport"
    @mousedown="onBackgroundMouseDown"
    @wheel.prevent="onWheel"
    @click="onBackgroundClick"
  >
    <div
      class="cc-canvas-world"
      :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }"
    >
      <div class="cc-canvas-grid" />

      <svg class="cc-canvas-links">
        <rect
          v-for="group in peerGroupBounds"
          :key="group.groupId"
          :x="group.x" :y="group.y" :width="group.width" :height="group.height"
          class="cc-canvas-peer-bounds"
        />
        <path
          v-for="link in links"
          :key="link.id"
          :d="linkPath(link)"
          class="cc-canvas-link-path"
        />
      </svg>

      <template v-for="card in cards" :key="card.id">
        <TerminalCard
          v-if="card.engine === 'pty'"
          :card="card"
          @drag-start="(e) => onCardDragStart(card, e)"
          @link-start="() => onLinkStart(card)"
          @close="() => onCardClose(card)"
        />
        <TaskCard
          v-else-if="card.engine === 'headless-task'"
          :card="card"
          @close="() => onCardClose(card)"
        />
        <PeerCard
          v-else-if="card.engine === 'headless-peer'"
          :card="card"
          :label="peerLabels.get(card.id) ?? card.cli"
          @close="() => onCardClose(card)"
        />
      </template>
    </div>

    <div v-if="linkingFromCardId" class="cc-canvas-linking-hint">
      Clique num espaço vazio pra criar o card filho — Esc pra cancelar
    </div>

    <CanvasToolbar
      @create-terminal="onCreateCard"
      @create-task="onCreateTask"
      @create-peer="onCreatePeer"
    />

    <div class="cc-canvas-zoom">
      <button @click="zoomBy(-0.1)">−</button>
      <span>{{ Math.round(zoom * 100) }}%</span>
      <button @click="zoomBy(0.1)">+</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import TerminalCard from './TerminalCard.vue'
import TaskCard from './TaskCard.vue'
import PeerCard from './PeerCard.vue'
import CanvasToolbar from './CanvasToolbar.vue'
import type { CanvasCard, CanvasLink, PeerTurnOrder } from 'src/types/icarus'

const props = defineProps<{ sessionId?: string | null }>()

const viewport = ref<HTMLDivElement>()
const cards = ref<CanvasCard[]>([])
const links = ref<CanvasLink[]>([])
const peerLabels = ref(new Map<string, string>())
const peerGroupCardIds = ref(new Map<string, string[]>())
const pan = ref({ x: 0, y: 0 })
const zoom = ref(1)

const MIN_ZOOM = 0.3
const MAX_ZOOM = 2

const linkingFromCardId = ref<string | null>(null)

const draggingCard = ref<CanvasCard | null>(null)
let dragStartScreen = { x: 0, y: 0 }
let dragStartCardPos = { x: 0, y: 0 }

const panningBackground = ref(false)
let panStartScreen = { x: 0, y: 0 }
let panStart = { x: 0, y: 0 }

// Quando o canvas é aberto sem uma conversa associada (aba standalone), uma
// conversa nova é criada sob demanda na primeira ação e reutilizada depois.
const autoSessionId = ref<string | null>(null)

async function resolveSessionId(): Promise<string> {
  if (props.sessionId) return props.sessionId
  if (autoSessionId.value) return autoSessionId.value
  const session = await window.icarus.session.create('Canvas')
  autoSessionId.value = session.id
  return session.id
}

onMounted(async () => {
  if (props.sessionId) {
    cards.value = await window.icarus.canvas.listCards(props.sessionId)
    links.value = await window.icarus.canvas.listLinks(props.sessionId)

    const peerGroups = await window.icarus.canvas.listPeerGroups(props.sessionId)
    const labels = new Map<string, string>()
    const groupCardIds = new Map<string, string[]>()
    for (const { group, members } of peerGroups) {
      groupCardIds.set(group.id, members.map((m) => m.cardId))
    }
    peerGroupCardIds.value = groupCardIds
    peerLabels.value = labels
  }
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('keydown', onKeyDown)
})

const peerGroupBounds = computed(() => {
  const PADDING = 24
  const bounds: { groupId: string; x: number; y: number; width: number; height: number }[] = []
  for (const [groupId, cardIds] of peerGroupCardIds.value) {
    const members = cards.value.filter((c) => cardIds.includes(c.id))
    if (members.length === 0) continue
    const minX = Math.min(...members.map((c) => c.x)) - PADDING
    const minY = Math.min(...members.map((c) => c.y)) - PADDING
    const maxX = Math.max(...members.map((c) => c.x + c.width)) + PADDING
    const maxY = Math.max(...members.map((c) => c.y + c.height)) + PADDING
    bounds.push({ groupId, x: minX, y: minY, width: maxX - minX, height: maxY - minY })
  }
  return bounds
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('keydown', onKeyDown)
})

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') linkingFromCardId.value = null
}

function screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
  const rect = viewport.value?.getBoundingClientRect()
  const originX = rect?.left ?? 0
  const originY = rect?.top ?? 0
  return {
    x: (screenX - originX - pan.value.x) / zoom.value,
    y: (screenY - originY - pan.value.y) / zoom.value,
  }
}

function zoomBy(delta: number) {
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value + delta))
}

function onWheel(e: WheelEvent) {
  zoomBy(-e.deltaY * 0.001)
}

function onBackgroundMouseDown(e: MouseEvent) {
  if (draggingCard.value) return
  panningBackground.value = true
  panStartScreen = { x: e.clientX, y: e.clientY }
  panStart = { ...pan.value }
}

function onCardDragStart(card: CanvasCard, e: MouseEvent) {
  draggingCard.value = card
  dragStartScreen = { x: e.clientX, y: e.clientY }
  dragStartCardPos = { x: card.x, y: card.y }
}

function onMouseMove(e: MouseEvent) {
  if (draggingCard.value) {
    const dx = (e.clientX - dragStartScreen.x) / zoom.value
    const dy = (e.clientY - dragStartScreen.y) / zoom.value
    draggingCard.value.x = dragStartCardPos.x + dx
    draggingCard.value.y = dragStartCardPos.y + dy
    return
  }
  if (panningBackground.value) {
    pan.value = {
      x: panStart.x + (e.clientX - panStartScreen.x),
      y: panStart.y + (e.clientY - panStartScreen.y),
    }
  }
}

function onMouseUp() {
  if (draggingCard.value) {
    void window.icarus.canvas.moveCard(draggingCard.value.id, draggingCard.value.x, draggingCard.value.y)
    draggingCard.value = null
  }
  panningBackground.value = false
}

function viewportCenter(): { x: number; y: number } {
  const rect = viewport.value?.getBoundingClientRect()
  return screenToWorld((rect?.left ?? 0) + (rect?.width ?? 800) / 2, (rect?.top ?? 0) + (rect?.height ?? 600) / 2)
}

async function onCreateCard(cli: string) {
  const sessionId = await resolveSessionId()
  const center = viewportCenter()
  const card = await window.icarus.canvas.createCard(sessionId, cli, center.x - 240, center.y - 180)
  cards.value.push(card)
}

async function onCreateTask(cli: string, task: string) {
  const sessionId = await resolveSessionId()
  const center = viewportCenter()
  const card = await window.icarus.canvas.createTask(sessionId, cli, center.x - 240, center.y - 180, task)
  cards.value.push(card)
}

async function onCreatePeer(
  members: { cli: string; label: string }[],
  turnOrder: PeerTurnOrder,
  maxRounds: number,
  openingPrompt: string,
) {
  const sessionId = await resolveSessionId()
  const center = viewportCenter()
  const CARD_GAP = 40
  const positions = members.map((_, i) => ({
    x: center.x - 240 + i * (480 + CARD_GAP),
    y: center.y - 180,
  }))

  const { group, cards: newCards } = await window.icarus.canvas.createPeerGroup(
    sessionId, members, turnOrder, maxRounds, openingPrompt, positions,
  )

  const labels = new Map(peerLabels.value)
  const cardIds: string[] = []
  newCards.forEach((card, i) => {
    labels.set(card.id, members[i]!.label)
    cardIds.push(card.id)
  })
  peerLabels.value = labels

  const groupCardIds = new Map(peerGroupCardIds.value)
  groupCardIds.set(group.id, cardIds)
  peerGroupCardIds.value = groupCardIds

  cards.value.push(...newCards)
}

function onLinkStart(card: CanvasCard) {
  linkingFromCardId.value = card.id
}

async function onBackgroundClick(e: MouseEvent) {
  if (!linkingFromCardId.value) return
  const parentId = linkingFromCardId.value
  linkingFromCardId.value = null

  const parent = cards.value.find((c) => c.id === parentId)
  if (!parent) return

  const sessionId = await resolveSessionId()
  const point = screenToWorld(e.clientX, e.clientY)
  const { card, link } = await window.icarus.canvas.createLinkedCard(sessionId, parentId, parent.cli, point.x, point.y)
  cards.value.push(card)
  links.value.push(link)
}

async function onCardClose(card: CanvasCard) {
  await window.icarus.canvas.deleteCard(card.id)
  cards.value = cards.value.filter((c) => c.id !== card.id)
  links.value = links.value.filter((l) => l.fromCardId !== card.id && l.toCardId !== card.id)
}

function linkPath(link: CanvasLink): string {
  const from = cards.value.find((c) => c.id === link.fromCardId)
  const to = cards.value.find((c) => c.id === link.toCardId)
  if (!from || !to) return ''
  const x1 = from.x + from.width / 2
  const y1 = from.y + from.height
  const x2 = to.x + to.width / 2
  const y2 = to.y
  const midY = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
}
</script>

<style scoped>
.cc-canvas-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-canvas);
  cursor: grab;
}

.cc-canvas-viewport:active {
  cursor: grabbing;
}

.cc-canvas-world {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}

.cc-canvas-grid {
  position: absolute;
  width: 6000px;
  height: 6000px;
  left: -3000px;
  top: -3000px;
  background-image: radial-gradient(circle, var(--border-subtle) 1px, transparent 1px);
  background-size: 24px 24px;
}

.cc-canvas-links {
  position: absolute;
  overflow: visible;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.cc-canvas-link-path {
  fill: none;
  stroke: var(--border-strong);
  stroke-width: 1.5;
  stroke-dasharray: 4 4;
}

.cc-canvas-peer-bounds {
  fill: var(--accent-dim);
  stroke: var(--accent);
  stroke-width: 1;
  stroke-opacity: 0.4;
  rx: 16;
}

.cc-canvas-linking-hint {
  position: absolute;
  bottom: var(--s-4);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--s-2) var(--s-4);
  border-radius: var(--r-full);
  background: var(--accent-dim);
  color: var(--accent);
  font-size: var(--fs-xs);
  z-index: 10;
}

.cc-canvas-zoom {
  position: absolute;
  bottom: var(--s-4);
  right: var(--s-4);
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-1) var(--s-2);
  border-radius: var(--r-full);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  z-index: 10;
}

.cc-canvas-zoom button {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
}

.cc-canvas-zoom button:hover {
  background: var(--bg-hover);
}
</style>
