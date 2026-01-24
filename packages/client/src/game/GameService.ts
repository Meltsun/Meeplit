import { ref, shallowRef, computed, ShallowRef, provide, inject } from 'vue';
import type { Card } from "@meeplit/shared/game";
import {Ask,Player} from '@/game/views'
import type { ChatMessage } from "@meeplit/shared/chat";

type PlayerInfo = {
    id: string | null;
    name?: string;
};

// 注入 key，仅注入 state，不注入 service
export const GameStateKey: unique symbol = Symbol('GameState');
export type GameState = ReturnType<typeof makeInitialState>;
export type GameRefs = {
    ask: ShallowRef<InstanceType<typeof Ask>>;
    player: ShallowRef<InstanceType<typeof Player>>;
};

function makeInitialState() {
    // 先定义基础 ref，便于 computed 引用
    const gameInfo = ref('default game info text');
    const handCards = ref<Card[]>([]);
    const maxSelection = ref<number>(0);
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
        handCards,
        maxSelection,
        chatMessages,
        players,
        playerInfo,
        seatNumber,
    };
}


// 获取已提供的 state，缺失时抛出友好错误
export function useGameState(): GameState {
    const state = inject<GameState>(GameStateKey, null!);
    if (!state) throw new Error('GameState is not provided in current component tree');
    return state;
}

export function useGameCtx() {
    const gameState= makeInitialState();
    const compRefs: GameRefs = {
        ask: shallowRef<InstanceType<typeof Ask>>(undefined!),
        player: shallowRef<InstanceType<typeof Player>>(undefined!),
    };
    // 提供全局可注入的游戏 state
    provide(GameStateKey, gameState);
    const gameService = new GameService(gameState, compRefs);
    return {gameState, compRefs, gameService};
}

//必须在mount之后再调用方法
export default class GameService {
    constructor(private state:ReturnType<typeof makeInitialState>, private compRefs: GameRefs){}
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
        return this.compRefs.ask.value.getInput(options);
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
        const isplay = await this.compRefs.ask.value.getInput({
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
        return this.compRefs.player.value?.getSelectedCards() ?? []
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
        this.compRefs.player.value?.setAbilityInfo(undefined, info.name || '');
    }
}

