<script setup lang="ts">
import { ref,computed } from 'vue'
import {exposeObjectToServer} from './exposeObjectToServer';

let wsPort = ref(import.meta.env.VITE_WS_PORT)


exposeObjectToServer("ws://localhost:" + import.meta.env.VITE_WS_PORT,console)

// 对手数量，可在 1 ~ 7 之间调整
const opponentCount = ref(4);

// 根据数量生成对手显示数据
const opponents = computed(() => {
  const count = Math.min(Math.max(opponentCount.value, 1), 7);
  return Array.from({ length: count }, (_, idx) => ({
    id: idx,
    label: `玩家 ${String.fromCharCode(65 + idx)}`,
  }));
});

</script>

<template>
  <div class="m-auto w-[min(calc(100vw-20px),calc((100vh-20px)*16/9))] h-[min(calc(100vh-20px),calc((100vw-20px)*9/16))] overflow-hidden bg-[#3167cd]">
    <div class="flex gap-2.5 w-full h-full p-2.5 box-border overflow-hidden">
      <aside class="flex-2 flex flex-col gap-2.5 overflow-hidden">
        <section class="flex-1 bg-[#f5f7fb] text-[#0f1d3a] overflow-hidden flex items-center justify-center">
          <div>元数据展示占位</div>
        </section>

        <section class="flex-2 bg-[#eef2fa] text-[#0f1d3a] overflow-hidden flex items-center justify-center">
          <div>聊天</div>
        </section>
      </aside>

      <section class="flex-8 flex flex-col gap-2.5 overflow-hidden">
        <div class="flex-[2.5] flex gap-2.5 overflow-hidden">
          <div
            v-for="opponent in opponents"
            :key="opponent.id"
            class="flex-1 bg-[#d6e4ff] text-[#0f1d3a] overflow-hidden flex items-center justify-center"
          >
            {{ opponent.label }}
          </div>
        </div>

        <div class="flex-5 bg-[#f0f5ff] text-[#0f1d3a] overflow-hidden flex items-center justify-center">卡牌显示区域</div>

        <div class="flex-[2.5] bg-[#e6f7ff] text-[#0f1d3a] overflow-hidden flex items-center justify-center">本地玩家区域</div>
      </section>
    </div>
  </div>
</template>