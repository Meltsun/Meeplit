<script setup lang="ts">
import { ref, useTemplateRef,ShallowRef,onUnmounted} from 'vue';

import Layout from './Layout.vue';
import GameInfo from '@/game/GameInfo.vue'
import InputTest from '@/game/InputTest.vue'
import { GameManager } from '@/game/GameManager';

const gameInfoText = ref('default game info text');
const inputTest= useTemplateRef('input') as ShallowRef<InstanceType<typeof InputTest>>;

const gameService={
    setGameInfo: ({text}:{text:string}) => {
        gameInfoText.value = text;
    },
    ask:async (options: { 
            prompt: string; 
            choices: string[]; 
            timeout: number; 
            columns?: number;
            defaultChoiceIndex:number; 
        })=>inputTest.value.getInput(options),
    ping:()=> 'pong',
}

export type GameService = typeof gameService;
const manager = new GameManager(
    `ws://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}`,
);
manager.exposeRpcObject(gameService);

onUnmounted(()=>{
    manager.disconnect();
});

</script>

<template>
    <Layout>
        <template #gameInfo>
            <GameInfo :text="gameInfoText"/>
        </template>
        <template #player>
            <InputTest ref="input"/>   
        </template>
    </Layout>
</template>
