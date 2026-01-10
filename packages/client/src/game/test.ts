import { Card } from "@meeplit/shared/game";
import GameService from "./GameController";

class TestCard extends Card{
    img= "/assets/test.png"
    name= "测试卡牌"
    description_url="/assets/test.md"
    constructor(public id: number){
        super();
    }
    override play(): void {
        console.log("使用了", this.name);
    }
};

export function test(c:GameService){
    const cards=[new TestCard(1),new TestCard(2),new TestCard(3)]
    c.updateCard(cards)
}