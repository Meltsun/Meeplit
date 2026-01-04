<script setup lang="ts">
import { ref, useTemplateRef,ShallowRef,onUnmounted, onMounted} from 'vue';

import Layout from './Layout.vue';
import GameInfo from '@/game/GameInfo.vue'
import InputTest from '@/game/InputTest.vue'
import { GameManager } from '@/game/GameManager';
import {Card} from "@meeplit/shared/game";
import Player from './Player.vue';

const gameInfoText = ref('default game info text');
const cards = ref<Card[]>([]);
const inputTest= useTemplateRef('input') as ShallowRef<InstanceType<typeof InputTest>>;
const playerRef = useTemplateRef('player') as ShallowRef<InstanceType<typeof Player>>;
const playerCards = ref<Card[]>([]);
const maxSelection=ref<number|undefined>(undefined);

const resolveCardImg = (img: string): string => {
    // Prefix host/port when an absolute URL is not provided
    if (/^https?:\/\//i.test(img)) return img;
    const base = `http://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}`;
    return new URL(img, base).toString();
};

const gameService={
    setGameInfo: (text:string) => gameInfoText.value = text,
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
    },
    playCard:async (options: { 
            cardnum:number;
            timeoutMs: number; 
        }):Promise<string[]>=>{
        maxSelection.value = options.cardnum;
        const isplay = await gameService.ask({
            prompt:`请选择${options.cardnum}张牌`,
            choices:['出牌',"取消"],
            timeoutMs:options.timeoutMs,
            defaultChoiceIndex:-1,
        });
        let res:string[] = []
        if(isplay==="出牌"){
            res = playerRef.value?.getSelectedNames() ?? [];
        }
        maxSelection.value = 0;
        return res
    },
    getSelectedCards: () => playerRef.value.getSelectedNames() ?? [],
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
            <Player ref="player" :cards="playerCards" :maxSelection/>
        </template>
    </Layout>
</template>
