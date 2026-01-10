<script setup lang="ts">
import type { Card } from '@meeplit/shared/game';
import { computed } from 'vue';
import CardItem from './CardItem.vue';

const props = defineProps<{
    cards: Card[];
    selectedIndices: number[];
    selectableCardIds?: Array<Card['id']>;
    tag?: string;
    containerClass?: string;
    name?: string;
}>();

const emit = defineEmits<{
    (e: 'toggle', index: number): void;
    (e: 'hover', cardId: number): void;
    (e: 'unhover'): void;
}>();

const defaultContainerClass =
    'w-full h-full flex items-center gap-3 overflow-x-auto overflow-y-hidden px-4 pt-2 pb-4';

const resolvedContainerClass = computed(() => props.containerClass ?? defaultContainerClass);
const resolvedName = computed(() => props.name ?? 'card');
const resolvedTag = computed(() => props.tag ?? 'div');

const isSelectable = (card: Card) => !props.selectableCardIds || props.selectableCardIds.includes(card.id);
const handleToggle = (card: Card, index: number) => {
    if (!isSelectable(card)) return;
    emit('toggle', index);
};

const handleHover = (cardId: number) => emit('hover', cardId);
const handleUnhover = () => emit('unhover');
</script>

<template>
    <TransitionGroup :name="resolvedName" :tag="resolvedTag" :class="resolvedContainerClass">
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


