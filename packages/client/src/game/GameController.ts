import { ref, shallowRef,Ref, computed } from 'vue';
import type { Card } from "@meeplit/shared/game";
import InputTest from '@/game/InputTest.vue';
import Player from '@/game/Player.vue';

// 定义组件实例类型
type InputTestInstance = InstanceType<typeof InputTest>;
type PlayerInstance = InstanceType<typeof Player>;

// --- 辅助方法 ---
function resolveCardImg(img: string): string {
    if (/^https?:\/\//i.test(img)) return img;
    const base = `http://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}`;
    return new URL(img, base).toString();
}

export default class GameService {
    // --- 响应式状态 (State) ---
    // 直接作为类的属性，可以在 Vue 模板中直接访问
    public gameInfoText = ref('default game info text');
    public playerCards = ref<Card[]>([]);
    public maxSelection = ref<number>(undefined!);

    // --- 组件引用 (Template Refs) ---
    // 使用 shallowRef 因为组件实例不需要深度响应
    // 在 Vue 模板中通过 ref="inputComponent" 绑定
    public inputComponent = shallowRef<InputTestInstance>(undefined!);
    public playerComponent = shallowRef<PlayerInstance>(undefined!);

    // --- RPC 服务接口实现 ---
    // 这些方法将被暴露给服务器调用
    public setGameInfo(text: string): void {
        this.gameInfoText.value = text;
    }

    public async ask(options: {
        prompt: string;
        choices: string[];
        timeoutMs: number;
        columns?: number;
        defaultChoice: string;
    }): Promise<string> {
        if (!this.inputComponent.value) {
            console.warn("Input component not mounted");
            return "";
        }
        return this.inputComponent.value.getInput(options);
    }

    public ping(): string {
        return 'pong';
    }

    public noReturnTest(): void {}

    public updateCard(cards: Card[]): void {
        console.log("收到卡牌更新", cards);
        cards.forEach(card => card.img = resolveCardImg(card.img));
        this.playerCards.value = cards
    }

    public async playCard(options: {
        cardnum: number;
        timeoutMs: number;
    }): Promise<Card[]> {
        this.maxSelection.value = options.cardnum;
        const choices ={
            出牌:computed(()=>this.getSelectedCards().length === options.cardnum), 
            取消:ref(true),
        }
        const isplay = await this.inputComponent.value.getInput({
            prompt: `请选择${options.cardnum}张牌`,
            choices:choices,
            timeoutMs: options.timeoutMs,
            defaultChoice: '取消',
        });

        let res = this.getSelectedCards();
        if (res.length !== options.cardnum || isplay === "取消") {
            res = []
        }
        this.maxSelection.value = 1; // 重置选择限制
        return res;
    }

    public getSelectedCards(): Card[] {
        return this.playerComponent.value.getSelectedCards()
    }
}
