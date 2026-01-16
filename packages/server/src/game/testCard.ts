import {Card} from "@meeplit/shared/game";


export class TestCard extends Card{
    img= "/assets/test.png"
    name= "测试卡牌"
    description_url= undefined;
    override play(): void {
        console.log("使用了", this.name);
    }
};