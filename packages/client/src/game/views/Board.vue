<script setup lang="ts">
</script>

<template>
    <div class="flex flex-1 flex-col min-h-0 overflow-hidden">
        <!-- 卡牌显示区域：占据除了ask外的所有空间 -->
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
