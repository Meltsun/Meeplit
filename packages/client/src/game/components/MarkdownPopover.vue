<script setup lang="ts">
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/vue';
import MarkdownIt from 'markdown-it';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
    open: boolean;
    anchor: HTMLElement | null;
    text: string;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
}>();

const popoverRef = ref<HTMLElement | null>(null);
const anchorRef = computed(() => props.anchor);
const WIDTH = 320;
const HEIGHT = 200;
const markdown = new MarkdownIt({ linkify: true, breaks: true });

const { floatingStyles, update } = useFloating(anchorRef, popoverRef, {
    open: computed(() => props.open),
    placement: 'top-start',
    strategy: 'fixed',
    middleware: [
        offset(8),
        flip({ fallbackStrategy: 'bestFit' }),
        shift({ padding: 8 }),
        size({
            padding: 8,
            apply({ availableHeight, availableWidth, elements }) {
                const floatingEl = elements.floating as HTMLElement | undefined;
                if (!floatingEl) return;
                const width = Math.min(availableWidth, WIDTH);
                const height = Math.min(availableHeight, HEIGHT);
                floatingEl.style.width = `${width}px`;
                floatingEl.style.height = `${height}px`;
            },
        }),
    ],
    whileElementsMounted: autoUpdate,
});

const popoverStyle = computed(() => floatingStyles.value);
const renderedMarkdown = computed(() => markdown.render(props.text || ''));

watch(
    () => props.open,
    (open) => {
        if (!open) return;
        nextTick(() => update());
    }
);

const handleDocumentClick = (event: MouseEvent) => {
    if (!props.open) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (anchorRef.value?.contains(target) || popoverRef.value?.contains(target)) return;
    emit('close');
};

// Use capture so clicks with stopPropagation on inner buttons still reach here to close peers.
onMounted(() => document.addEventListener('click', handleDocumentClick, true));
onBeforeUnmount(() => document.removeEventListener('click', handleDocumentClick, true));
</script>

<template>
    <Teleport to="body">
        <transition name="fade">
            <div
                v-if="open"
                ref="popoverRef"
                class="card-popover z-50 rounded-lg border border-[#d7def0] bg-white/95 p-3 shadow-xl backdrop-blur"
                :style="popoverStyle"
            >
                <div class="prose prose-sm max-w-none text-[#1f2f4a]" v-html="renderedMarkdown" />
            </div>
        </transition>
    </Teleport>
</template>

<style scoped>
.card-popover {
    width: 320px;
    height: 200px;
    line-height: 1.4;
    overflow: auto;
}

.prose :is(h1, h2, h3, p, ul, ol) {
    margin: 0 0 0.35rem;
}

.prose a {
    color: #1f5fb8;
    text-decoration: underline;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
