<script setup lang="ts">
import { computed, ref } from 'vue';
import { inputTest2Service } from './inputTest2Service';

const state = inputTest2Service.state;
const value = ref("");

const isOpen = computed(() => state.visible);
const onSubmit = () => inputTest2Service.submit(state.token, value.value);
const onCancel = () => inputTest2Service.cancel(state.token);
</script>

<template>
    <Teleport to="body">
        <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div class="bg-white p-4 space-y-2 w-[min(90vw,420px)] rounded shadow">
                <div class="text-lg font-semibold">玩家输入（SFC）</div>
                <div class="text-sm text-gray-600">{{ state.prompt }}</div>
                <input v-model="value" type="text" class="w-full rounded border px-3 py-2"
                    @keyup.enter.prevent="onSubmit" />
                <div class="flex justify-end gap-2 text-sm">
                    <button class="px-3 py-1.5 border rounded" @click="onCancel">取消</button>
                    <button class="px-3 py-1.5 bg-blue-600 text-white rounded" @click="onSubmit">确定</button>
                </div>
            </div>
        </div>
    </Teleport>
</template>
