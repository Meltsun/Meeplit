<template>
  <div class="w-full h-full overflow-hidden bg-[#3167cd]">
      <div class="flex gap-2.5 w-full h-full p-2.5 box-border overflow-hidden">
        <aside class="flex flex-2 flex-col gap-2.5 overflow-hidden">
        <section class="flex flex-1 bg-[#f5f7fb] text-[#0f1d3a] overflow-auto flex-col items-start justify-start p-3">
          <slot name="gameInfo">
            <div>游戏信息</div>
          </slot>
        </section>

        <section class="flex flex-2 bg-[#eef2fa] text-[#0f1d3a] overflow-hidden items-center justify-center">
          <slot name="chat">
            <div>聊天</div>
          </slot>
        </section>
      </aside>

      <section class="flex flex-8 flex-col gap-2.5 overflow-hidden">
        <div class="flex flex-[2.5] gap-2.5 overflow-hidden">
          <slot name="opponent">
            <div class="flex-1 bg-[#d6e4ff] text-[#6b7a99] overflow-hidden flex items-center justify-center">
              等待对手
            </div>
          </slot>
        </div>

        <div class="flex flex-5 bg-[#f0f5ff] text-[#0f1d3a] overflow-hidden flex-col">
          <slot name="board">
            卡牌显示区域
          </slot>
        </div>

        <div class="flex flex-[2.5] bg-[#e6f7ff] text-[#0f1d3a] overflow-hidden items-stretch justify-center">
          <slot name="player">
            本地玩家区域
          </slot>
        </div>
      </section>
    </div>
  </div>
</template>