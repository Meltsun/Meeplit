<script setup lang="ts">
import { computed } from 'vue';
import { useGameState } from '@/game/GameService';

const gameState = useGameState();

const opponentSlots = computed(() => {
    const players = gameState.players.value ?? [];
    if (!players.length) return [] as Array<{ seat: number; id: string | null }>;

    const currentId = gameState.playerInfo.value?.id ?? null;
    const currentSeat = currentId ? players.findIndex((id) => id === currentId) : -1;
    const seatCount = players.length;

    // 若无法定位自身座位，则按数组顺序排除 null/currentId
    if (currentSeat === -1) {
        return players
            .map((id, idx) => ({ seat: idx, id }))
            .filter((slot) => slot.id && slot.id !== currentId);
    }

    const slots: Array<{ seat: number; id: string | null }> = [];
    for (let offset = 1; offset < seatCount; offset += 1) {
        const seat = ((currentSeat - offset) % seatCount + seatCount) % seatCount;
        slots.push({ seat, id: players[seat] ?? null });
    }
    return slots;
});
</script>

<template>
    <div class="flex flex-1 gap-2.5 overflow-hidden w-full h-full">
        <div
            v-for="slot in opponentSlots"
            :key="slot.seat"
            class="relative flex-1 bg-[#d6e4ff] text-[#0f1d3a] overflow-hidden flex items-center justify-center"
        >
            <span v-if="slot.id">玩家 {{ slot.id }}</span>
            <span v-else class="text-[#6b7a99]">空位</span>
            <span class="absolute top-1 right-1 bg-[#0f1d3a] text-white text-[10px] leading-none px-1.5 py-1 rounded-sm">
                {{ slot.seat + 1 }}
            </span>
        </div>
        <div
            v-if="!opponentSlots.length"
            class="flex-1 bg-[#d6e4ff] text-[#6b7a99] overflow-hidden flex items-center justify-center"
        >
            等待其他玩家加入
        </div>
    </div>
</template>
