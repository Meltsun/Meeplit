<script setup lang="ts">
</script>

<template>
    <div class="flex flex-1 flex-col min-h-0 overflow-hidden">
        <!-- Opponent 区域：固定高度，显示其他玩家卡片 -->
        <div class="flex-none h-32 flex items-center justify-start gap-2.5 px-2.5 py-1.5">
            <slot name="opponent">
                <!-- 默认占位符 -->
            </slot>
        </div>
        <!-- 卡牌显示区域：占据剩余空间 -->
        <div class="flex-1 min-h-0 flex items-center justify-center">
            <slot name="cards">
                卡牌显示区域
            </slot>
        </div>
        <!-- Ask 区域贴底部，高度自适应 -->
        <slot name="ask">
            询问区域
        </slot>
    </div>
</template>
