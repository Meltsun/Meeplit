import { ref, shallowRef, type Ref, type ShallowRef } from 'vue';
import type { Card } from "@meeplit/shared/game";
import InputTest from '@/game/InputTest.vue';
import Player from '@/game/Player.vue';

// 定义组件实例类型
type InputTestInstance = InstanceType<typeof InputTest>;
type PlayerInstance = InstanceType<typeof Player>;

export default class GameController {
    // --- 响应式状态 (State) ---
    // 直接作为类的属性，可以在 Vue 模板中直接访问
    public gameInfoText = ref('default game info text');
    public playerCards = ref<Card[]>([]);
    public maxSelection = ref<number | undefined>(undefined);

    // --- 组件引用 (Template Refs) ---
    // 使用 shallowRef 因为组件实例不需要深度响应
    // 在 Vue 模板中通过 ref="inputComponent" 绑定
    public inputComponent = shallowRef<InputTestInstance | null>(null);
    public playerComponent = shallowRef<PlayerInstance | null>(null);

    // --- 辅助方法 ---
    private resolveCardImg(img: string): string {
        if (/^https?:\/\//i.test(img)) return img;
        const base = `http://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}`;
        return new URL(img, base).toString();
    }

    // --- RPC 服务接口实现 ---
    // 这些方法将被暴露给服务器调用
    public readonly service = {
        setGameInfo: (text: string) => {
            this.gameInfoText.value = text;
        },

        ask: async (options: {
            prompt: string;
            choices: string[];
            timeoutMs: number;
            columns?: number;
            defaultChoiceIndex: number;
        }): Promise<string> => {
            if (!this.inputComponent.value) {
                console.warn("Input component not mounted");
                return "";
            }
            return this.inputComponent.value.getInput(options);
        },

        ping: () => 'pong',

        noReturnTest: (): void => { },

        updateCard: (cards: Card[]): void => {
            console.log("收到卡牌更新", cards);
            this.playerCards.value = cards.map(card => ({
                ...card,
                img: this.resolveCardImg(card.img),
            }));
        },

        playCard: async (options: {
            cardnum: number;
            timeoutMs: number;
        }): Promise<string[]> => {
            this.maxSelection.value = options.cardnum;
            
            // 使用 this.service.ask 确保调用的是同一个上下文中的方法
            const isplay = await this.service.ask({
                prompt: `请选择${options.cardnum}张牌`,
                choices: ['出牌', "取消"],
                timeoutMs: options.timeoutMs,
                defaultChoiceIndex: -1,
            });

            let res: string[] = [];
            if (isplay === "出牌") {
                res = this.playerComponent.value?.getSelectedNames() ?? [];
            }
            
            this.maxSelection.value = 0; // 重置选择限制
            return res;
        },

        getSelectedCards: () => this.playerComponent.value?.getSelectedNames() ?? [],
    };
}
