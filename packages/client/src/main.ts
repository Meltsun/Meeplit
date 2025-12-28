import { createApp } from 'vue'
import { createPinia } from 'pinia'

import Game from '@/game/Game.vue'
import '@/main.css'
import {gameInfoService} from '@/game/gameInfo/GameInfoService'
import { inputTestService } from '@/game/inputTest/inputTestService'
import { GameManager } from '@/game/GameManager';

const app = createApp(Game)
app.use(createPinia())
app.mount('#app')

const gameService={
    gameInfoService,
    inputTestService,
    ping:()=>"pong"
}

export type GameService=typeof gameService

const manager = new GameManager(
    `ws://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}`,
    gameService
);



