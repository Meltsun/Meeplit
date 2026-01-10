<script setup lang="ts">
import { ref, watch } from 'vue';
import CardItem from './CardItem.vue';
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
    getSelectedCards:function (){
        return selectedIndices.value.map(i => props.cards[i]).filter(Boolean)
    }
});
</script>

<template>
    <div class="relative w-full h-full bg-[#e6f7ff]">
        <TransitionGroup
            name="card"
            tag="div"
            class="w-full h-full flex items-center gap-3 overflow-x-auto overflow-y-hidden px-4 pt-2 pb-4"
        >
            <CardItem
                v-for="(card, index) in cards"
                :key="card.id"
                :card="card"
                :selected="selectedIndices.includes(index)"
                @toggle="toggleSelection(index)"
                @hover="hoveredCardName = $event"
                @unhover="hoveredCardName = ''"
            />
        </TransitionGroup>

        <!-- 数量提示 -->
        <div v-if="cards.length" class="absolute top-1 right-2 bg-black/20 text-[#0f1d3a] text-xs font-bold px-2 py-1 rounded-full pointer-events-none backdrop-blur-[2px]">
            {{ cards.length }}
        </div>
    </div>
</template>

<style scoped>
.card-enter-from,
.card-leave-to {
    opacity: 0;
    transform: translateY(12px);
}

.card-enter-active,
.card-leave-active {
    transition: opacity 220ms ease, transform 220ms ease;
}

.card-leave-active {
    transform: translateY(-12px);
}

.card-move {
    transition: transform 220ms ease;
}
</style>