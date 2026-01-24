<script setup lang="ts">
import { onUnmounted, onMounted } from 'vue';

import {Layout,GameInfo,Ask,Player,Board,Chat,Opponent} from '@/game/views'
import { ConnectionManager } from '@/game/ConnectionManager';
import {useGameCtx} from '@/game/GameService';
import {test} from '@/game/test'

// 1. 初始化 service
// 所有的游戏状态和逻辑现在都由 Controller 管理
const props = defineProps<{
    wsUrl: string;
    sessionId: string;
    active?: boolean;
}>();

const {gameState, compRefs, gameService} = useGameCtx();

// 组件模板 refs 由 Game.vue 自行管理与绑定（从 useGameCtx 返回的共享 shallowRef）
const inputComponent = compRefs.ask;
const playerComponent = compRefs.player;
// 3. 初始化网络连接
const manager = new ConnectionManager()

onMounted(()=>{
    if (props.active !== false) {
        manager.connect(props.wsUrl, props.sessionId);
        // 直接暴露 Controller 实例上的公共方法
        manager.exposeRpcObject(gameService);
    }
});

onUnmounted(()=>{
    manager.disconnect();
});

async function onSendChat(text: string){
    await manager.sendChatMessage(text)
}
</script>

<template>
    <Layout>
        <template #gameInfo>
            <GameInfo />
        </template>
        <template #chat>
            <Chat @send="onSendChat"/>
        </template>
        <template #opponent>
            <Opponent />
        </template>
        <template #board>
            <Board>
                <template #cards>
                    <!-- 卡牌显示区域 -->
                </template>
                <template #ask>
                    <Ask ref="inputComponent"/>
                </template>
            </Board>
        </template>
        <template #player>
            <Player ref="playerComponent" />
        </template>
    </Layout>
</template>
