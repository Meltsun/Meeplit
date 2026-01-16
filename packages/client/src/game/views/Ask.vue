<script setup lang="ts">
import { ref, type Ref } from 'vue';

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
let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

// 贴底部显示：高度由文案和按钮行数自适应
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
        const choiceCount = Array.isArray(choices) ? choices.length : Object.keys(choices).length;
        if (choiceCount === 0) {
            throw new Error('No choices provided for input request');
        }
        const normalizedChoices = normalizeChoices(choices);

        promptText.value = prompt;
        choiceItemsRef.value = normalizedChoices;
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

function handleChoice(label:string,enabled:boolean): void {
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
    <div v-if="isVisible" class="w-full flex flex-col gap-2 px-4 py-3">
        <div class="mx-auto flex w-full max-w-200 flex-col gap-2">
                <div class="text-center font-semibold text-slate-800 leading-6 text-lg">
                    {{ promptText }}
                </div>

                <div class="flex flex-wrap gap-3 items-center justify-center">
                    <button
                        v-for="(choice, idx) in choiceItemsRef"
                        :key="idx"
                        class="flex-none w-auto min-w-30 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base font-medium text-slate-800 whitespace-nowrap transition hover:border-slate-400 hover:bg-white focus:outline-none focus-visible:ring focus-visible:ring-blue-400"
                        :disabled="!choice.enabled"
                        :class="{ 'opacity-60 cursor-not-allowed': !choice.enabled}"
                        @click="handleChoice(choice.label, choice.enabled)"
                    >
                        {{ choice.label }}
                    </button>
                </div>
        </div>
    </div>
</template>