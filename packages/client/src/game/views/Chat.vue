<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameState } from '@/game/GameService'

const gameState = useGameState()
const emit = defineEmits<{ (e: 'send', text: string): void }>()

const inputText = ref('')
const listEl = ref<HTMLDivElement | null>(null)
const rootEl = ref<HTMLElement | null>(null)
const atBottom = ref(true)
const showFilter = ref(false)
const selectedPlayers = ref<Set<string>>(new Set())
const showSystem = ref(true)

const availablePlayers = computed(() => {
	const names = new Set<string>()
	for (const m of gameState.chatMessages.value) {
		if (m.type === 'player') names.add(m.playerName)
	}
	return Array.from(names.values())
})

watch(availablePlayers, (players) => {
	const next = new Set(selectedPlayers.value)
	players.forEach((p) => next.add(p))
	selectedPlayers.value = next
}, { immediate: true })

const filteredMessages = computed(() => {
	return gameState.chatMessages.value.filter((m) => {
		if (m.type === 'divider') return true
		if (m.type === 'system') return showSystem.value
		return selectedPlayers.value.has(m.playerName)
	})
})

// 生成紧凑行文本，区分玩家与系统格式
const compactLines = computed(() => {
	return filteredMessages.value.map((m) => {
		const time = new Date(m.timeStamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		if (m.type === 'player') {
			return { key: `${m.timeStamp}-${m.playerId}`, text: `[${time}] ${m.playerName}: ${m.text}`, type: 'player' as const }
		}
		if (m.type === 'system') {
			return { key: `${m.timeStamp}-sys`, text: `[${time}] ${m.text}`, type: 'system' as const }
		}
		return { key: `${m.timeStamp}-divider`, text: m.text ?? '', type: 'divider' as const }
	})
})

function handleScroll() {
	const el = listEl.value
	if (!el) return
	const threshold = 8
	// 只要未离底部过多，就认为在底部（便于自动滚动）
	atBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
}

watch(
	() => filteredMessages.value.length,
	async () => {
		if (!listEl.value) return
		if (!atBottom.value) return
		// 仅在仍在底部时自动滚动到底
		await nextTick()
		listEl.value.scrollTop = listEl.value.scrollHeight
	}
)

onMounted(() => {
	// 初始滚动到底
	if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
	document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
	document.removeEventListener('click', handleOutsideClick)
})

function doSend() {
	const text = inputText.value.trim()
	if (!text) return
	emit('send', text)
	inputText.value = ''
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault()
		doSend()
	}
}

function togglePlayer(name: string, checked: boolean) {
	const next = new Set(selectedPlayers.value)
	if (checked) next.add(name); else next.delete(name)
	selectedPlayers.value = next
}

function handleOutsideClick(e: MouseEvent) {
	if (!showFilter.value) return
	const target = e.target as Node
	if (rootEl.value && !rootEl.value.contains(target)) {
		showFilter.value = false
	}
}
</script>

<template>
	<div class="chat-root" ref="rootEl">
		<div class="chat-header">
			<div class="chat-title">聊天</div>
			<div class="chat-filter">
				<button class="filter-btn" @click.stop="showFilter = !showFilter">筛选</button>
				<div v-if="showFilter" class="filter-menu">
					<label class="filter-item">
						<input type="checkbox" :checked="showSystem" @change="showSystem = ($event.target as HTMLInputElement).checked" />
						<span>系统</span>
					</label>
					<label v-for="p in availablePlayers" :key="p" class="filter-item">
						<input type="checkbox" :checked="selectedPlayers.has(p)" @change="togglePlayer(p, ($event.target as HTMLInputElement).checked)" />
						<span>{{ p }}</span>
					</label>
				</div>
			</div>
		</div>
		<div ref="listEl" class="chat-list" @scroll="handleScroll">
			<template v-for="line in compactLines" :key="line.key">
				<div v-if="line.type !== 'divider'" :class="['chat-line', line.type]">
					{{ line.text }}
				</div>
				<div v-else class="chat-divider">
					<div class="chat-divider-line"></div>
					<span v-if="line.text" class="chat-divider-text">{{ line.text }}</span>
					<div class="chat-divider-line"></div>
				</div>
			</template>
		</div>
		<div class="chat-input">
			<input
				v-model="inputText"
				class="chat-text"
				type="text"
				placeholder="输入消息，回车发送"
				@keydown="onKeydown"
			/>
			<button class="chat-send" @click="doSend">发送</button>
		</div>
	</div>
</template>

<style scoped>
.chat-root {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	padding: 8px;
	box-sizing: border-box;
	gap: 8px;
}

.chat-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.chat-title { font-weight: 700; color: #0f1d3a; }

.chat-filter { position: relative; }

.filter-btn {
	padding: 4px 10px;
	border-radius: 6px;
	border: 1px solid #cbd5e1;
	background: #f8fafc;
	color: #0f1d3a;
	cursor: pointer;
}
.filter-btn:hover { background: #e2e8f0; }

.filter-menu {
	position: absolute;
	top: 110%;
	right: 0;
	min-width: 160px;
	background: #ffffff;
	border: 1px solid #e5e7eb;
	box-shadow: 0 4px 16px rgba(15, 29, 58, 0.12);
	border-radius: 8px;
	padding: 8px;
	box-sizing: border-box;
	z-index: 10;
}

.filter-item {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	color: #0f1d3a;
	padding: 4px 2px;
}

.chat-list {
	flex: 1;
	overflow: auto;
	background: #ffffff;
	border-radius: 6px;
	padding: 8px;
	box-sizing: border-box;
}

.chat-line {
	font-size: 14px;
	line-height: 1.1;
	color: #0f1d3a;
	white-space: pre-wrap;
}
.chat-line + .chat-line { margin-top: 2px; }
.chat-line.system {
	color: #b45309;
	font-weight: 700;
	background: #fff7ed;
}
.chat-line.player { color: #0f1d3a; }

.chat-input {
	display: flex;
	gap: 8px;
	align-items: center;
}
.chat-text {
	flex: 1;
	height: 32px;
	border-radius: 6px;
	border: 1px solid #d1d5db;
	padding: 0 10px;
}
.chat-send {
	height: 32px;
	padding: 0 12px;
	border-radius: 6px;
	background: #3167cd;
	color: white;
	border: none;
	cursor: pointer;
}
.chat-send:hover { background: #2959b1; }

.chat-divider {
	margin: 6px 0;
	display: flex;
	align-items: center;
	gap: 8px;
}

.chat-divider-text {
	font-size: 12px;
	color: #6b7280;
	white-space: nowrap;
}

.chat-divider-line {
	flex: 1;
	height: 1px;
	background: #e5e7eb;
}
</style>