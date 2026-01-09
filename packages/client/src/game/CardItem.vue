<script setup lang="ts">
import type { Card } from '@meeplit/shared/game';

const props = defineProps<{
    card: Card;
    selected?: boolean;
}>();

const emit = defineEmits<{
    (e: 'toggle'): void;
    (e: 'hover', name: string): void;
    (e: 'unhover'): void;
}>();

const handleMouseEnter = () => emit('hover', props.card.name);
const handleMouseLeave = () => emit('unhover');
</script>

<template>
    <div
        class="card-item h-full shrink-0 flex flex-col items-center justify-center transition-transform duration-200 hover:scale-105 cursor-pointer rounded-lg"
        :class="{ 'ring-4 ring-[#3167cd]': selected }"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
        @click="emit('toggle')"
    >
        <img
            :src="card.img"
            :alt="card.name"
            class="h-full w-auto object-contain rounded-md shadow-md bg-white cursor-help"
        />
    </div>
</template>

<style scoped>
.card-item {
    will-change: transform, opacity;
}
</style>
