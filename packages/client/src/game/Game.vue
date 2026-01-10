<script setup lang="ts">
import { onUnmounted, onMounted } from 'vue';

import {Layout,GameInfo,InputTest,Player} from '@/game/views'
import { ConnectionManager } from '@/game/ConnectionManager';
import {useGameService} from '@/game/GameController';
import {test} from '@/game/test'

// 1. 初始化 service
// 所有的游戏状态和逻辑现在都由 Controller 管理
const {state,gameService} = useGameService();

// 2. 获取响应式状态以供模板使用
// 直接解构 ref 对象是安全的，它们在模板中会自动解包
const { 
    gameInfoText, 
    playerCards, 
    maxSelection,
    // 这里的 ref 将被绑定到模板中的组件
    inputComponent,
    playerComponent 
} = state;
// 3. 初始化网络连接
const manager = new ConnectionManager()

onMounted(()=>{
    if(import.meta.env.VITE_TEST_MODE=== 'true'){
        test(gameService)
        return
    }
    manager.connect(`ws://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}`);
    // 直接暴露 Controller 实例上的公共方法
    manager.exposeRpcObject(gameService);
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
