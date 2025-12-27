import { defineStore } from 'pinia'

export const useChatStore = defineStore('game', {
    state: () => ({
        gameInfoText: '加载中...',
    }),
    actions: {
        setGameInfo(text: string) {
            this.gameInfoText = text
        }
    }
})

export const gameInfoService = {
    setGameInfo(text: string) {
        useChatStore().setGameInfo(text)
    }
}

