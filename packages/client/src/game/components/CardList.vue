<script setup lang="ts">
import type { Card } from '@meeplit/shared/game';
import CardItem from './CardItem.vue';

const props = defineProps<{
    cards: Card[];
    selectedIndices: number[];
    selectableCardIds?: Array<Card['id']>;
}>();

const emit = defineEmits<{
    (e: 'toggle', index: number): void;
    (e: 'hover', cardId: string): void;
    (e: 'unhover'): void;
}>();

const containerClass = 'w-full h-full flex items-center gap-3 overflow-x-auto overflow-y-hidden px-4 pt-2 pb-4';

const isSelectable = (card: Card) => !props.selectableCardIds || props.selectableCardIds.includes(card.id);
const handleToggle = (card: Card, index: number) => {
    if (!isSelectable(card)) return;
    emit('toggle', index);
};

const handleHover = (cardId: string) => emit('hover', cardId);
const handleUnhover = () => emit('unhover');
</script>

<template>
    <TransitionGroup name="card" tag="div" :class="containerClass">
        <CardItem
            v-for="(card, index) in cards"
            :key="card.id"
            :card="card"
            :selected="selectedIndices.includes(index)"
            :disabled="!isSelectable(card)"
            @toggle="handleToggle(card, index)"
            @hover="handleHover"
            @unhover="handleUnhover"
        />
    </TransitionGroup>
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


