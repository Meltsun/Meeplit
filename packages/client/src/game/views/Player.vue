<script setup lang="ts">
import { ref, watch } from 'vue';
import {CardList} from '@/game/components';
import type { Card } from '@meeplit/shared/game';

const props = defineProps<{
    cards: Card[];
    maxSelection?: number;
    selectableCardIds?: Array<Card['id']>;
}>();

const hoveredCardId = ref<string | null>(null);
const selectedIndices = ref<number[]>([]);

watch(() => props.maxSelection, () => {
    selectedIndices.value = [];
});

watch(
    () => [props.cards, props.selectableCardIds],
    () => {
        selectedIndices.value = selectedIndices.value.filter((index) => isSelectableIndex(index));
    },
    { deep: true }
);

const isSelectableIndex = (index: number) => {
    const card = props.cards[index];
    if (!card) return false;
    const allowedIds = props.selectableCardIds;
    return allowedIds?.includes(card.id);
};

const toggleSelection = (index: number) => {
    if (!isSelectableIndex(index)) return;
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
    getSelectedCards: function () {
        return selectedIndices.value.map((i) => props.cards[i]).filter(Boolean);
    },
    getHoveredCardId: function () {
        return hoveredCardId.value;
    },
});
</script>

<template>
    <div class="relative w-full h-full bg-[#e6f7ff]">
        <CardList
            :cards="cards"
            :selected-indices="selectedIndices"
            :selectable-card-ids="selectableCardIds"
            @toggle="toggleSelection"
            @hover="hoveredCardId = $event"
            @unhover="hoveredCardId = null"
        >
        </CardList>

        <!-- 数量提示 -->
        <div v-if="cards.length" class="absolute top-1 right-2 bg-black/20 text-[#0f1d3a] text-xs font-bold px-2 py-1 rounded-full pointer-events-none backdrop-blur-[2px]">
            {{ cards.length }}
        </div>
    </div>
</template>