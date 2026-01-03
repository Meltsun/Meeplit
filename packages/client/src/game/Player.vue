<script setup lang="ts">
import type { Card } from '@meeplit/shared/game';

defineProps<{
    cards: Card[];
}>();
</script>

<template>
    <div class="w-full h-full flex items-center gap-3 overflow-x-auto px-4 py-2 bg-[#e6f7ff]">
        <template v-if="cards.length">
            <div
                v-for="(card, index) in cards"
                :key="card.name + index"
                class="shrink-0 flex flex-col items-center gap-2"
            >
                <img
                    :src="card.img"
                    :alt="card.name"
                    class="h-32 w-24 object-contain rounded-md shadow-md bg-white"
                />
                <!-- <span class="text-sm text-[#0f1d3a]">{{ card.name }}</span> -->
            </div>
        </template>
        <p v-else class="text-sm text-[#0f1d3a]">暂无卡牌</p>
    </div>
</template>