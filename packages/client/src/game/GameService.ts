import { ref, shallowRef, computed, ShallowRef } from 'vue';
import type { Card } from "@meeplit/shared/game";
import {Ask,Player} from '@/game/views'
import type { ChatMessage } from "@meeplit/shared/chat";

type PlayerInfo = {
    id: string | null;
    name?: string;
};

// 创建一个引用，且认为它被正确赋值
function useCompRef<T extends new (...args: any) => any>(comp: T): ShallowRef<InstanceType<T>> {
    return shallowRef(undefined!);
}

function makeInitialState() {
    // 先定义基础 ref，便于 computed 引用
    const gameInfo = ref('default game info text');
    const playerComponent = useCompRef(Player);
    const handCards = ref<Card[]>([]);
    const maxSelection = ref<number>(0);
    const inputComponent = useCompRef(Ask);
    const chatMessages = ref<ChatMessage[]>([]);
    const players = ref<Array<string | null>>([]);
    const playerInfo = ref<PlayerInfo>({ id: null, name: '' });

    // 根据 players 与 playerInfo 计算当前玩家座位号（index+1），找不到则返回 null
    const seatNumber = computed<number | null>(() => {
        const id = playerInfo.value.id;
        if (!id) return null;
        const idx = players.value.findIndex((p) => p === id);
        return idx >= 0 ? idx + 1 : null;
    });

    return {
        gameInfo,
        playerComponent,
        handCards,
        maxSelection,
        inputComponent,
        chatMessages,
        players,
        playerInfo,
        seatNumber,
    };
}


export function useGameService() {
    const state= makeInitialState();
    const gameService = new GameService(state);
    return {state,gameService};
}

//必须在mount之后再调用方法
export default class GameService {
    constructor(private state:ReturnType<typeof makeInitialState>){}
    // --- RPC 服务接口实现 ---
    // 这些方法将被暴露给服务器调用
    public setGameInfo(text: string): void {
        this.state.gameInfo.value = text;
    }

    public async ask(options: {
        prompt: string;
        choices: string[];
        timeoutMs: number;
        columns?: number;
        defaultChoice: string;
    }): Promise<string> {
        return this.state.inputComponent.value.getInput(options);
    }

    public ping(): string {
        return 'pong';
    }

    public noReturnTest(): void {}

    public updateCard(cards: Card[]): void {
        console.log("收到卡牌更新", cards);
        this.state.handCards.value = cards
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

    // --- 聊天：供服务器调用以新增消息 ---
    public addChatMessage(msg: ChatMessage): void {
        this.state.chatMessages.value.push(msg);
    }

    public setPlayers(players: Array<string | null>): void {
        this.state.players.value = players;
    }

    public setPlayerInfo(info: PlayerInfo): void {
        this.state.playerInfo.value = info;
        // 同步 Ability 显示的玩家名（图片保持默认或先前设置）
        this.state.playerComponent.value?.setAbilityInfo(undefined, info.name || '');
    }
}

