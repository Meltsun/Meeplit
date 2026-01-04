<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Card } from '@meeplit/shared/game';

const props = defineProps<{
    cards: Card[];
    maxSelection?: number;
}>();

const hoveredCardName = ref('');
const selectedIndices = ref<number[]>([]);

watch(() => props.maxSelection, () => {
    selectedIndices.value = [];
});

const toggleSelection = (index: number) => {
    const i = selectedIndices.value.indexOf(index);
    if (i > -1) {
        selectedIndices.value.splice(i, 1);
    } else {
        if (props.maxSelection && selectedIndices.value.length >= props.maxSelection) {
            selectedIndices.value.shift();
        }
        selectedIndices.value.push(index);
    }
};

defineExpose({
    getSelectedNames: () => selectedIndices.value.map(i => props.cards[i]?.name).filter(Boolean)
});
</script>

<template>
    <div class="relative w-full h-full bg-[#e6f7ff]">
        <div class="w-full h-full flex items-center gap-3 overflow-x-auto overflow-y-hidden px-4 pt-2 pb-4">
            <template v-if="cards.length">
                <div
                    v-for="(card, index) in cards"
                    :key="card.name + index"
                    class="h-full shrink-0 flex flex-col items-center justify-center transition-transform duration-200 hover:scale-105 cursor-pointer rounded-lg"
                    :class="{ 'ring-4 ring-[#3167cd]': selectedIndices.includes(index) }"
                    @mouseenter="hoveredCardName = card.name"
                    @mouseleave="hoveredCardName = ''"
                    @click="toggleSelection(index)"
                >
                    <img
                        :src="card.img"
                        :alt="card.name"
                        class="h-full w-auto object-contain rounded-md shadow-md bg-white cursor-help"
                    />
                    <!-- <span class="text-sm text-[#0f1d3a]">{{ card.name }}</span> -->
                </div>
            </template>
        </div>

        <!-- 数量提示 -->
        <div v-if="cards.length" class="absolute top-1 right-2 bg-black/20 text-[#0f1d3a] text-xs font-bold px-2 py-1 rounded-full pointer-events-none backdrop-blur-[2px]">
            {{ cards.length }}
        </div>
    </div>
</template>