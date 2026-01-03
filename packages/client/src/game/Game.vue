<script setup lang="ts">
import { ref, useTemplateRef,ShallowRef,onUnmounted, onMounted} from 'vue';

import Layout from './Layout.vue';
import GameInfo from '@/game/GameInfo.vue'
import InputTest from '@/game/InputTest.vue'
import { GameManager } from '@/game/GameManager';
import {Card} from "@meeplit/shared/game";
import Player from './Player.vue';

const gameInfoText = ref('default game info text');
const inputTest= useTemplateRef('input') as ShallowRef<InstanceType<typeof InputTest>>;
const playerCards = ref<Card[]>([]);

const resolveCardImg = (img: string): string => {
    // Prefix host/port when an absolute URL is not provided
    if (/^https?:\/\//i.test(img)) return img;
    const base = `http://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}`;
    return new URL(img, base).toString();
};

const gameService={
    setGameInfo: (text:string) => {
        gameInfoText.value = text;
    },
    ask:async (options: { 
            prompt: string; 
            choices: string[]; 
            timeoutMs: number; 
            columns?: number;
            defaultChoiceIndex:number; 
        }):Promise<string>=>inputTest.value.getInput(options),
    ping:()=> 'pong',
    noReturnTest:():void=>{},
    updateCard:(cards:Card[]):void=>{
        console.log("收到卡牌更新",cards);
        playerCards.value = cards.map(card => ({
            ...card,
            img: resolveCardImg(card.img),
        }));
    }
}

export type GameService = typeof gameService;
const manager = new GameManager(
    `ws://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}`,
);

onMounted(()=>{
    manager.connect();
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
            <InputTest ref="input"/>   
        </template>
        <template #player>
            <Player :cards="playerCards" />
        </template>
    </Layout>
</template>
