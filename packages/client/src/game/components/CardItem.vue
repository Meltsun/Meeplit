<script setup lang="ts">
import type { Card } from '@meeplit/shared/game';
import { computed, onMounted, ref } from 'vue';
import MarkdownPopover from './MarkdownPopover.vue';
import { fetchAsset, resolveAssetUrl } from '@/game/utils';

const props = defineProps<{
    card: Card;
    selected?: boolean;
    disabled?: boolean;
}>();

const emit = defineEmits<{
    (e: 'toggle'): void;
    (e: 'hover', cardId: string): void;
    (e: 'unhover'): void;
}>();

const handleMouseEnter = () => emit('hover', props.card.id);
const handleMouseLeave = () => emit('unhover');
const handleToggle = () => {
    if (props.disabled) return;
    emit('toggle');
};

const infoOpen = ref(false);
const infoButtonRef = ref<HTMLElement | null>(null);
const infoText = computed(() => `${props.card.name} · ID ${props.card.id}`);
const descriptionText = ref(infoText.value);

onMounted(() => {
    const url = props.card.description_url;
    if (!url) return;

    (async () => {
        try {
            const response = await fetchAsset(url);
            descriptionText.value = await response.text();
        } catch {
            descriptionText.value = infoText.value;
        }
    })();
});

const toggleInfo = () => {
    infoOpen.value = !infoOpen.value;
};
</script>

<template>
    <div
        class="card-item h-full shrink-0 flex flex-col items-center justify-center transition-transform duration-200 rounded-lg relative"
        :class="[
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:brightness-110',
            { 'ring-4 ring-[#3167cd]': selected },
        ]"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
        @click="handleToggle"
    >
        <div class="h-full" draggable="false" @dragstart.prevent>
            <img
                :src="resolveAssetUrl(card.img).toString()"
                :alt="card.name"
                class="h-full w-auto object-contain rounded-md shadow-md bg-white cursor-help"
            />
        </div>

        <button
            ref="infoButtonRef"
            class="info-btn absolute bottom-2 left-2 w-7 h-7 rounded-full border border-[#3167cd] bg-white/90 text-[#3167cd] font-semibold flex items-center justify-center shadow-sm transition-colors duration-150 hover:bg-[#3167cd] hover:text-white"
            type="button"
            @click.stop="toggleInfo"
        >
            i
        </button>
        <MarkdownPopover :open="infoOpen" :anchor="infoButtonRef" :text="descriptionText" @close="infoOpen = false" />
    </div>
</template>

<style scoped>
.card-item {
    will-change: transform, opacity;
}

.info-btn {
    backdrop-filter: blur(6px);
}
</style>
