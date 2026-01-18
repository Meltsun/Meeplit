import { Card } from "@meeplit/shared/game";
import GameService from "./GameService";
import type { ChatMessage } from "@meeplit/shared/chat";
import { fetchAsset } from "./utils";

class TestCard extends Card{
    img= "/assets/test.png"
    name= "测试卡牌"
    description_url="/assets/test.md"
    override play(): void {
        console.log("使用了", this.name);
    }
};

export async function test(c:GameService){
    const cards = Array(20).fill(null).map(() => new TestCard());
    c.updateCard(cards)
    c.setGameInfo(await(await fetchAsset("/assets/test.md")).text())
    c.ask(
        {
            prompt:"测试",
            choices:["选项一","选项二","选项三"],
            timeoutMs:99999*1000,
            defaultChoice:"未选择",
        }
    )

    // --- 聊天测试: 系统公告与玩家消息 ---
    const now = Date.now()
    const initial: ChatMessage[] = [
        { type: 'system', text: '欢迎进入聊天测试模式', timeStamp: now },
        { type: 'player', playerId: 'p1', playerName: 'Alice', text: '大家好！', timeStamp: now + 1000 },
        { type: 'player', playerId: 'p2', playerName: 'Bob', text: '准备开始吧～', timeStamp: now + 2000 },
        { type: 'system', text: '系统公告：发牌完成欢迎进入聊天测试模式欢迎进入聊天测试模式欢迎进入聊天测试模式欢迎进入聊天测试模式欢迎进入聊天测试模式欢迎进入聊天测试模式欢迎进入聊天测试模式欢迎进入聊天测试模式欢迎进入聊天测试模式欢迎进入聊天\n测试模式欢迎进入聊天测试模式欢迎进入聊天测试模式欢迎进入聊天测试模式', timeStamp: now + 3000 },
    ]
    initial.forEach(m => c.addChatMessage(m))

    // 连续追加消息以测试滚动与紧凑显示
    const names = ['Alice', 'Bob', 'Carol', 'Dave']
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const name = names[i % names.length]
            c.addChatMessage({
                type: 'player',
                playerId: `p${(i % names.length) + 1}`,
                playerName: name,
                text: `第 ${i + 1} 条测试消息`,
                timeStamp: Date.now()
            })
            if(i%10===0){
                c.addChatMessage({
                    type: 'divider',
                    timeStamp: Date.now(),
                    text: `第 ${(i/10)+1} 个阶段`
                })
                console.log("添加分割线")
            }
        }, 1000 * (i + 1))
    }
}