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

// 纵向两行：上方提示 2/5，下方按钮区域 3/5
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
    <div class="h-full w-full flex flex-col min-h-0 overflow-hidden">
        <div
            v-if="isVisible"
            class="h-full w-full flex flex-col min-h-0 overflow-hidden"
        >
            <!-- 上方提示：占高度的 2/5，字号使用较小的 vw + clamp 控制 -->
            <div class="flex-2 flex items-end justify-center px-4 pb-1 min-h-0">
                <div class="text-center font-semibold text-slate-800 leading-tight text-[clamp(14px,1.5vw,22px)]">
                    {{ promptText }}
                </div>
            </div>

            <!-- 下方按钮区域：占高度的 3/5，横向排布，按钮固定最小宽度但可随文本增长 -->
            <div class="flex-3 min-h-0 overflow-hidden px-4">
                <div class="flex flex-wrap gap-3 items-start content-start justify-center h-full w-full">
                <button
                    v-for="(choice, idx) in choiceItemsRef"
                    :key="idx"
                    class="flex-none w-auto min-w-30 rounded-lg border border-slate-300 bg-slate-50 px-[clamp(12px,2vw,18px)] py-2 text-[clamp(12px,1.4vw,16px)] font-medium text-slate-800 whitespace-nowrap transition hover:border-slate-400 hover:bg-white focus:outline-none focus-visible:ring focus-visible:ring-blue-400"
                    :disabled="!choice.enabled"
                    :class="{ 'opacity-60 cursor-not-allowed': !choice.enabled}"
                    @click="handleChoice(choice.label, choice.enabled)"
                >
                    {{ choice.label }}
                </button>
                </div>
            </div>
        </div>
    </div>
</template>