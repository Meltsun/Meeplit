<script setup lang="ts">
import { onUnmounted, onMounted } from 'vue';

import Layout from './Layout.vue';
import GameInfo from '@/game/GameInfo.vue'
import InputTest from '@/game/InputTest.vue'
import Player from './Player.vue';
import { ConnectionManager } from '@/game/ConnectionManager';
import GameService from '@/game/GameController';

// 1. 初始化 Controller
// 所有的游戏状态和逻辑现在都由 Controller 管理
const controller = new GameService();

// 2. 获取响应式状态以供模板使用
// 直接解构 ref 对象是安全的，它们在模板中会自动解包
const { 
    gameInfoText, 
    playerCards, 
    maxSelection,
    // 这里的 ref 将被绑定到模板中的组件
    inputComponent,
    playerComponent 
} = controller;
// 3. 初始化网络连接
const manager = new ConnectionManager(
    `ws://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}`,
);

onMounted(()=>{
    manager.connect();
    // 直接暴露 Controller 实例上的公共方法
    manager.exposeRpcObject(controller);
});

onUnmounted(()=>{
    manager.disconnect();
});

</script>

<template>
    <Layout>
        <template #gameInfo>
            <GameInfo :text="gameInfoText"/>
        </template>
        <template #ask>
            <InputTest ref="inputComponent"/>   
        </template>
        <template #player>
            <Player ref="playerComponent" :cards="playerCards" :maxSelection="maxSelection"/>
        </template>
    </Layout>
</template>
