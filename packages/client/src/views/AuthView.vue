<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  statusText: string;
  loginName: string;
  loginPassword: string;
}>();
const emit = defineEmits<{
  (e: 'update:loginName', val: string): void;
  (e: 'update:loginPassword', val: string): void;
  (e: 'login'): void;
}>();

const loginNameModel = computed({
  get: () => props.loginName,
  set: (val: string) => emit('update:loginName', val),
});
const loginPasswordModel = computed({
  get: () => props.loginPassword,
  set: (val: string) => emit('update:loginPassword', val),
});
</script>

<template>
  <div class="w-full h-full flex items-center justify-center">
      <section class="panel flex flex-col gap-4 max-w-[40%]">
      <div class="panel-header flex items-center justify-between">
        <h2 class="text-lg font-semibold">登录</h2>
        <span class="text-sm opacity-70">{{ statusText }}</span>
      </div>
      <div class="flex flex-col gap-3">
        <input
          v-model="loginNameModel"
          placeholder="用户名"
          class="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/40"
        />
        <input
          v-model="loginPasswordModel"
          type="password"
          placeholder="密码"
          class="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/40"
        />
        <button class="mt-2 px-4 py-2 rounded-md bg-white/15 hover:bg-white/25" @click="emit('login')">登录</button>
      </div>
    </section>
  </div>
  
</template>
