<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  statusText: string;
  loginName: string;
}>();
const emit = defineEmits<{
  (e: 'update:loginName', val: string): void;
  (e: 'login'): void;
}>();

const loginNameModel = computed({
  get: () => props.loginName,
  set: (val: string) => emit('update:loginName', val),
});
</script>

<template>
  <section class="panel flex flex-col gap-4">
    <div class="panel-header flex items-center justify-between">
      <h2 class="text-lg font-semibold">登录</h2>
      <span class="text-sm opacity-70">{{ statusText }}</span>
    </div>
    <div class="flex items-center gap-3">
      <input
        v-model="loginNameModel"
        placeholder="昵称"
        class="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/40"
      />
      <button class="px-4 py-2 rounded-md bg-white/15 hover:bg-white/25" @click="emit('login')">登录</button>
    </div>
  </section>
</template>
