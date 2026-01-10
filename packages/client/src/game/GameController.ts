import { ref, shallowRef,Ref, computed } from 'vue';
import type { Card } from "@meeplit/shared/game";
import {InputTest,Player} from '@/game/views'

// --- 辅助方法 ---
function resolveCardImg(img: string): string {
    if (/^https?:\/\//i.test(img)) return img;
    const base = `http://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}`;
    return new URL(img, base).toString();
}

function makeInitialState() {
    return {
        gameInfoText: ref('default game info text'),
        playerCards: ref<Card[]>([]),
        maxSelection: ref<number>(undefined!),
        inputComponent: shallowRef<typeof InputTest>(undefined!),
        playerComponent: shallowRef<typeof Player>(undefined!),
    }
}


export function useGameService() {
    const state= makeInitialState();
    const gameService = new GameService(state);
    return {state,gameService};
}

export default class GameService {
    constructor(private state:ReturnType<typeof makeInitialState>){
        
    }
    // --- RPC 服务接口实现 ---
    // 这些方法将被暴露给服务器调用
    public setGameInfo(text: string): void {
        this.state.gameInfoText.value = text;
    }

    public async ask(options: {
        prompt: string;
        choices: string[];
        timeoutMs: number;
        columns?: number;
        defaultChoice: string;
    }): Promise<string> {
        if (!this.state.inputComponent.value) {
            console.warn("Input component not mounted");
            return "";
        }
        return this.state.inputComponent.value.getInput(options);
    }

    public ping(): string {
        return 'pong';
    }

    public noReturnTest(): void {}

    public updateCard(cards: Card[]): void {
        console.log("收到卡牌更新", cards);
        cards.forEach(card => card.img = resolveCardImg(card.img));
        this.state.playerCards.value = cards
    }

    public async playCard(options: {
        cardnum: number;
        timeoutMs: number;
    }): Promise<Card[]> {
        this.state.maxSelection.value = options.cardnum;
        const choices ={
            出牌:computed(()=>this.getSelectedCards().length === options.cardnum), 
            取消:ref(true),
        }
        const isplay = await this.state.inputComponent.value.getInput({
            prompt: `请选择${options.cardnum}张牌`,
            choices:choices,
            timeoutMs: options.timeoutMs,
            defaultChoice: '取消',
        });

        let res = this.getSelectedCards();
        if (res.length !== options.cardnum || isplay === "取消") {
            res = []
        }
        this.state.maxSelection.value = 1; // 重置选择限制
        return res;
    }

    public getSelectedCards(): Card[] {
        return this.state.playerComponent.value.getSelectedCards()
    }
}
