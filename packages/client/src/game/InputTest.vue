<script setup lang="ts">
import { computed, ref } from 'vue';

type Resolver = (value: string) => void;

const isVisible = ref(false);
const pendingResolve = ref<Resolver | null>(null);
const promptText = ref('');
const choicesRef = ref<string[]>([]);
const columnsRef = ref(2);
let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

const columnCount = computed(() => Math.max(1, columnsRef.value));
const gridStyle = computed(() => ({ gridTemplateColumns: `repeat(${columnCount.value}, minmax(0, 1fr))` }));
defineExpose({
    getInput:async function (options: {
        prompt: string;
        choices: string[];
        columns?: number;
        timeout: number;
        defaultChoiceIndex:number;
    }): Promise<string> {
        if (pendingResolve.value) {
            throw new Error('Input request already in progress');
        }
        const { prompt, choices, timeout, defaultChoiceIndex} = options;
        const columns = options.columns ?? choices.length;
        promptText.value = prompt;
        choicesRef.value = choices;
        columnsRef.value = Math.max(1, columns);
        isVisible.value = true;

        return new Promise<string>((resolve) => {
            pendingResolve.value = resolve;

            if (timeout > 0) {
                timeoutHandle = setTimeout(() => {
                    if (!pendingResolve.value) return;
                    const fallback = choices[defaultChoiceIndex]
                    pendingResolve.value(fallback);
                    pendingResolve.value = null;
                    isVisible.value = false;
                    timeoutHandle = null;
                }, timeout);
            }
        });
    }
});

function handleChoice(choice: string): void {
    if (!pendingResolve.value) return;

    if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
    }

    pendingResolve.value(choice);
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
                    v-for="(choice, idx) in choicesRef"
                    :key="idx"
                    class="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white hover:shadow focus:outline-none focus-visible:ring focus-visible:ring-blue-400"
                    @click="handleChoice(choice)"
                >
                    {{ choice }}
                </button>
            </div>
        </div>
    </div>
</template>