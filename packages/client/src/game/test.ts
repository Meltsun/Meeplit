import { Card } from "@meeplit/shared/game";
import GameService from "./GameController";
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
}