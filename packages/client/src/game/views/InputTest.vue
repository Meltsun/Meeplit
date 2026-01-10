<script setup lang="ts">
import { computed, ref, type Ref } from 'vue';

type Resolver = (value: string) => void;
type ChoiceInput = string[] | Record<string, Ref<boolean>>;
type ChoiceItem = {
    label: string;
    enabled: Ref<boolean>;
};

const isVisible = ref(false);
const pendingResolve = ref<Resolver | null>(null);
const promptText = ref('');
const choiceItemsRef = ref<ChoiceItem[]>([]);
const columnsRef = ref(2);
let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

const columnCount = computed(() => Math.max(1, columnsRef.value));
const gridStyle = computed(() => ({ gridTemplateColumns: `repeat(${columnCount.value}, minmax(0, 1fr))` }));
defineExpose({
    getInput: async function (options: {
        prompt: string;
        choices: ChoiceInput;
        columns?: number;
        timeoutMs: number;
        defaultChoice: string;
    }): Promise<string> {
        if (pendingResolve.value) {
            throw new Error('Input request already in progress');
        }
        const { prompt, choices, timeoutMs, defaultChoice} = options;
        if (choices.length === 0) {
            throw new Error('No choices provided for input request');
        }
        const normalizedChoices = normalizeChoices(choices);

        promptText.value = prompt;
        choiceItemsRef.value = normalizedChoices;
        columnsRef.value = Math.max(1, options.columns ?? normalizedChoices.length);
        isVisible.value = true;

        return new Promise<string>((resolve) => {
            pendingResolve.value = resolve;

            if (timeoutMs > 0) {
                timeoutHandle = setTimeout(() => {
                    if (!pendingResolve.value) return;
                    pendingResolve.value = null;
                    isVisible.value = false;
                    timeoutHandle = null;
                    resolve(defaultChoice);
                }, timeoutMs);
            }
        });
    }
});

function normalizeChoices(choices: ChoiceInput): ChoiceItem[] {
    if (Array.isArray(choices)) {
        return choices.map((label) => ({ label, enabled: ref(true) }));
    }

    return Object.entries(choices).map(([label, enabled]) => ({ label, enabled }));
}

function handleChoice(label:string,enabled:Boolean): void {
    if (!pendingResolve.value || !enabled) return;

    if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
    }

    pendingResolve.value(label);
    pendingResolve.value = null;
    isVisible.value = false;
}

</script>

<template>
    <div class="w-full flex justify-center">
        <div
            v-if="isVisible"
            class="w-full max-w-xl rounded-xl bg-white p-6 shadow-md border border-slate-200"
        >
            <div class="mb-4 text-center text-lg font-semibold text-slate-800">
                {{ promptText }}
            </div>
            <div class="grid gap-3" :style="gridStyle">
                <button
                    v-for="(choice, idx) in choiceItemsRef"
                    :key="idx"
                    class="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white hover:shadow focus:outline-none focus-visible:ring focus-visible:ring-blue-400"
                    :disabled="!choice.enabled"
                    :class="{ 'opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-none': !choice.enabled }"
                    @click="handleChoice(choice.label, choice.enabled)"
                >
                    {{ choice.label }}
                </button>
            </div>
        </div>
    </div>
</template>