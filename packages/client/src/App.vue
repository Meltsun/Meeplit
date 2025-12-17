<script setup lang="ts">
import { ref,computed } from 'vue'
import {exposeObjectToServer} from './exposeObjectToServer';

let wsPort = ref(import.meta.env.VITE_WS_PORT)


exposeObjectToServer("ws://localhost:" + import.meta.env.VITE_WS_PORT,{
  log : (msg: string) => {
    console.log("[Reverse RPC]", msg);
    return "ok"
  }
});

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
  <div>
    <h1>Meeplit Client</h1>
    <p>WS_URL (build-time): {{ wsPort }}</p>
    <div id="game">
    <div class="board">
      <aside class="sidebar">
        <section class="match-meta">
          <div class="place-holder-text">元数据展示占位</div>
        </section>

        <section class="chat">
          <div class="place-holder-text">聊天</div>
        </section>
      </aside>

      <section class="game-area">
        <div class="opponents">
          <div
            v-for="opponent in opponents"
            :key="opponent.id"
            class="opponent-slot"
          >
            {{ opponent.label }}
          </div>
        </div>

        <div class="card-stage">卡牌显示区域</div>

        <div class="local-player">本地玩家区域</div>
      </section>
    </div>
  </div>
  </div>
</template>

<style scoped>
/* ===== 外层画布 ===== */
#game {
  --gap: 10px;

  width: min(
    calc(100vw - var(--gap) * 2),
    calc((100vh - var(--gap) * 2) * 16 / 9)
  );

  height: min(
    calc(100vh - var(--gap) * 2),
    calc((100vw - var(--gap) * 2) * 9 / 16)
  );
  background: #3167cd;
  overflow: hidden;
  margin: auto;
}

/* ===== 布局骨架 ===== */
.board {
  /* 水平 Flex：侧栏 + 游戏区 */
  display: flex;
  gap: 10px;
  width: 100%;
  height: 100%;
  padding: 10px;
  box-sizing: border-box;
  overflow: hidden;
}

/* ===== 侧栏：对局信息 + 聊天 ===== */
.sidebar {
  /* 侧栏占 1 份宽度 */
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.match-meta {
  /* 对局元数据面板占 1 份高度 */
  flex: 1;
  background: #f5f7fb;
  color: #0f1d3a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat {
  /* 聊天区占 2 份高度 */
  flex: 2;
  background: #eef2fa;
  color: #0f1d3a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 主游戏区域 ===== */
.game-area {
  /* 游戏区占 4 份宽度 */
  flex: 8;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.opponents {
  /* 对手区占 1 份高度 */
  flex: 2.5;
  display: flex;
  gap: 10px;
  overflow: hidden;
}

.opponent-slot {
  /* 每个对手占 1 份宽度 */
  flex: 1;
  background: #d6e4ff;
  color: #0f1d3a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-stage {
  flex: 5;
  background: #f0f5ff;
  color: #0f1d3a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.local-player {
  /* 本地玩家区占 2 份高度 */
  flex: 2.5;
  background: #e6f7ff;
  color: #0f1d3a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

</style>
